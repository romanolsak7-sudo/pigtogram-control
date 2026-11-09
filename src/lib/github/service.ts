import "server-only";
import { z } from "zod";
import { AccessError } from "@/lib/auth/config";
import type { Owner } from "@/lib/auth/require-owner";
import {
  createGitHubClient,
  GitHubError,
  PILOT_REPOSITORY,
  repositoryPath,
  type Transport,
} from "./client";
import {
  repoSchema,
  pullSchema,
  runSchema,
  commitSchema,
  githubSnapshotSchema,
  type Resource,
} from "./schema";

type Good = {
  data: unknown;
  checkedAt: string;
  complete: boolean;
  expiresAt: number;
};
const FRESH_MS = 60000;
const STALE_MS = 600000;

// The only exported data entry point is an authorized function; cache is private.
export function createAuthorizedGithubService(deps: {
  authorize: () => Promise<Owner>;
  transport: Transport;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  const cache = new Map<string, Good>();
  const limits = new Map<string, number[]>();
  let retryAt = 0;

  return async function getSnapshot() {
    const owner = await deps.authorize();
    const namespace = `${owner.id}:${owner.sessionId}:`;
    for (const [key, value] of cache)
      if (value.expiresAt <= now()) cache.delete(key);
    for (const [key, values] of limits)
      if (!values.some((t) => t > now() - 60000)) limits.delete(key);
    const attempts = (limits.get(owner.sessionId) ?? []).filter(
      (t) => t > now() - 60000,
    );
    if (attempts.length >= 10)
      throw new GitHubError("RATE_LIMIT", attempts[0] + 60000);
    limits.set(owner.sessionId, [...attempts, now()]);
    const read = createGitHubClient(deps.transport, deps.authorize, {
      now,
      deadline: now() + 8000,
    });

    async function resource<T>(
      key: string,
      load: () => Promise<{ data: T; complete: boolean }>,
    ): Promise<Resource<T>> {
      await deps.authorize();
      const cacheKey = namespace + key;
      const prior = cache.get(cacheKey);
      const attemptedAt = new Date(now()).toISOString();
      if (prior && now() - Date.parse(prior.checkedAt) < FRESH_MS) {
        await deps.authorize();
        return {
          source: "fixture",
          state: "fresh",
          data: structuredClone(prior.data) as T,
          checkedAt: prior.checkedAt,
          attemptedAt,
          complete: prior.complete,
          error: null,
          retryAt: null,
        };
      }
      try {
        if (retryAt > now()) throw new GitHubError("RATE_LIMIT", retryAt);
        const result = await load();
        await deps.authorize();
        const checkedAt = new Date(now()).toISOString();
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(cacheKey, {
          ...structuredClone(result),
          checkedAt,
          expiresAt: Math.min(owner.expiresAt, now() + STALE_MS),
        });
        return {
          source: "fixture",
          state: "fresh",
          ...result,
          checkedAt,
          attemptedAt,
          error: null,
          retryAt: null,
        };
      } catch (error) {
        if (error instanceof AccessError) throw error;
        await deps.authorize();
        const failure =
          error instanceof GitHubError
            ? error
            : new GitHubError("INVALID_RESPONSE");
        if (failure.code === "RATE_LIMIT")
          retryAt = failure.retryAt ?? now() + 60000;
        const deny = ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(
          failure.code,
        );
        if (deny) {
          if (failure.code === "UNAUTHORIZED") {
            cache.clear();
            throw failure;
          } else cache.delete(cacheKey);
        }
        const common = {
          source: "fixture" as const,
          attemptedAt,
          error: failure.code,
          retryAt: failure.retryAt
            ? new Date(failure.retryAt).toISOString()
            : null,
        };
        if (prior && !deny && prior.expiresAt > now())
          return {
            ...common,
            state: "stale",
            data: structuredClone(prior.data) as T,
            checkedAt: prior.checkedAt,
            complete: prior.complete,
          };
        return {
          ...common,
          state: "unavailable",
          data: null,
          checkedAt: null,
          complete: false,
        };
      }
    }

    const repository = await resource("repository", async () => {
      const raw = repoSchema.parse((await read(repositoryPath)).body);
      if (raw.full_name !== PILOT_REPOSITORY)
        throw new GitHubError("INVALID_RESPONSE");
      return {
        complete: true,
        data: {
          id: raw.id,
          fullName: raw.full_name,
          description: raw.description,
          language: raw.language,
          defaultBranch: raw.default_branch,
          url: raw.html_url,
          private: raw.private,
        },
      };
    });
    const pulls = await resource("pulls", async () => {
      const result: z.infer<typeof pullSchema>[] = [];
      let next: string | null =
        `${repositoryPath}/pulls?state=open&per_page=100&page=1`;
      const seen = new Set<string>();
      let complete = true;
      for (let page = 0; next && page < 3; page++) {
        if (seen.has(next)) throw new GitHubError("INVALID_RESPONSE");
        seen.add(next);
        try {
          const response = await read(next);
          result.push(...z.array(pullSchema).max(100).parse(response.body));
          next = response.next;
        } catch (error) {
          if (
            page === 0 ||
            error instanceof AccessError ||
            (error instanceof GitHubError &&
              [
                "UNAUTHORIZED",
                "FORBIDDEN",
                "NOT_FOUND",
                "INVALID_RESPONSE",
                // Preserve the shared cooldown even when later resources hit cache.
                "RATE_LIMIT",
              ].includes(error.code))
          )
            throw error;
          complete = false;
          break;
        }
      }
      if (next) complete = false;
      const unique = new Map(result.map((p) => [p.id, p]));
      return {
        complete,
        data: [...unique.values()].map((p) => ({
          id: `${PILOT_REPOSITORY}#${p.number}`,
          number: p.number,
          title: p.title,
          draft: p.draft,
          head: p.head.ref,
          base: p.base.ref,
          headSha: p.head.sha,
          updatedAt: p.updated_at,
          url: p.html_url,
        })),
      };
    });
    const workflows = await resource("workflows", async () => {
      const raw = z
        .object({
          total_count: z.number().int().nonnegative(),
          workflow_runs: z.array(runSchema).max(20),
        })
        .parse((await read(`${repositoryPath}/actions/runs?per_page=20`)).body);
      return {
        complete: raw.total_count <= raw.workflow_runs.length,
        data: raw.workflow_runs.map((r) => ({
          id: r.id,
          workflowId: r.workflow_id,
          name: r.name,
          attempt: r.run_attempt,
          sha: r.head_sha,
          branch: r.head_branch,
          event: r.event,
          status: r.status,
          conclusion: r.conclusion,
          updatedAt: r.updated_at,
          url: r.html_url,
        })),
      };
    });
    const defaultBranch = repository.data?.defaultBranch;
    // Fresh and stale commits must belong to the branch selected by this snapshot.
    const commitsKey = `commits:${defaultBranch ?? ""}`;
    const commits = await resource(commitsKey, async () => {
      if (!defaultBranch) throw new GitHubError("UNAVAILABLE");
      const response = await read(
        `${repositoryPath}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=5`,
      );
      const raw = z.array(commitSchema).max(5).parse(response.body);
      return {
        complete: !response.next,
        data: raw.map((c) => ({
          sha: c.sha,
          subject: c.commit.message.split(/\r?\n/, 1)[0].slice(0, 1000),
          committedAt: c.commit.committer?.date ?? null,
          url: c.html_url,
        })),
      };
    });
    // A logout while an upstream read was in flight must prevent the whole response.
    await deps.authorize();
    return githubSnapshotSchema.parse({
      mode: "github-fixture",
      assembledAt: new Date(now()).toISOString(),
      scope: PILOT_REPOSITORY,
      repository,
      pulls,
      workflows,
      commits,
    });
  };
}
