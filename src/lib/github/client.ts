import "server-only";
import { AccessError } from "@/lib/auth/config";

export const PILOT_REPOSITORY = "romanolsak7-sudo/nasobilkozrouti" as const;
const root = `https://api.github.com/repos/${PILOT_REPOSITORY}`;
export type Transport = (request: Request) => Promise<Response>;
export class GitHubError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "RATE_LIMIT"
      | "UPSTREAM"
      | "TIMEOUT"
      | "INVALID_RESPONSE"
      | "UNAVAILABLE",
    public readonly retryAt: number | null = null,
  ) {
    super(code);
  }
}

export function validatedUrl(path: string) {
  const url = new URL(path, root + "/");
  if (
    url.origin !== "https://api.github.com" ||
    url.username ||
    url.password ||
    url.hash ||
    ![
      new URL(root).pathname,
      ...["pulls", "actions/runs", "commits"].map(
        (p) => `${new URL(root).pathname}/${p}`,
      ),
    ].includes(url.pathname)
  ) {
    throw new GitHubError("INVALID_RESPONSE");
  }
  const allowed = new Set(["state", "per_page", "page", "sha"]);
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key)))
    throw new GitHubError("INVALID_RESPONSE");
  if (
    url.searchParams.has("page") &&
    !/^[1-3]$/.test(url.searchParams.get("page")!)
  )
    throw new GitHubError("INVALID_RESPONSE");
  return url;
}

export function createGitHubClient(
  transport: Transport,
  authorize: () => Promise<unknown>,
  options: {
    now?: () => number;
    timeoutMs?: number;
    credential?: string;
    deadline?: number;
  } = {},
) {
  const now = options.now ?? Date.now;
  let blocked: GitHubError | null = null;
  return async function read(
    path: string,
  ): Promise<{ body: unknown; next: string | null; empty: boolean }> {
    await authorize();
    if (blocked && (blocked.retryAt === null || blocked.retryAt > now()))
      throw blocked;
    if (options.deadline !== undefined && now() >= options.deadline)
      throw new GitHubError("TIMEOUT");
    const url = validatedUrl(path);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => {
          controller.abort();
          reject(new GitHubError("TIMEOUT"));
        },
        Math.min(
          options.timeoutMs ?? 3000,
          (options.deadline ?? Infinity) - now(),
        ),
      );
    });
    try {
      return await Promise.race([
        timeout,
        (async () => {
          const response = await transport(
            new Request(url, {
              method: "GET",
              redirect: "error",
              cache: "no-store",
              signal: controller.signal,
              headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10",
                ...(options.credential
                  ? { Authorization: `Bearer ${options.credential}` }
                  : {}),
              },
            }),
          );
          await authorize();
          if (response.status === 401)
            throw (blocked = new GitHubError("UNAUTHORIZED"));
          const rateLimited =
            response.status === 429 ||
            (response.status === 403 &&
              (response.headers.has("retry-after") ||
                response.headers.get("x-ratelimit-remaining") === "0"));
          if (rateLimited) {
            const retry = response.headers.get("retry-after");
            const seconds =
              retry && /^\d+$/.test(retry)
                ? Number(retry) * 1000 + now()
                : Date.parse(retry ?? "");
            const reset =
              Number(response.headers.get("x-ratelimit-reset")) * 1000;
            const retryAt = Math.max(
              now() + 60000,
              Number.isFinite(seconds) ? seconds : 0,
              Number.isFinite(reset) ? reset : 0,
            );
            throw (blocked = new GitHubError("RATE_LIMIT", retryAt));
          }
          if (response.status === 403) throw new GitHubError("FORBIDDEN");
          if (response.status === 404) throw new GitHubError("NOT_FOUND");
          if (!response.ok && response.status !== 409)
            throw new GitHubError("UPSTREAM");
          const reader = response.body?.getReader();
          const chunks: Uint8Array[] = [];
          let size = 0;
          if (reader) {
            try {
              while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                size += chunk.value.byteLength;
                if (size > 1024 * 1024 || controller.signal.aborted)
                  throw new GitHubError("INVALID_RESPONSE");
                chunks.push(chunk.value);
              }
            } finally {
              await reader.cancel().catch(() => {});
            }
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
          if (response.status === 409) {
            if (
              url.pathname.endsWith("/commits") &&
              typeof body === "object" &&
              body !== null &&
              "message" in body &&
              body.message === "Git Repository is empty."
            )
              return { body: [], next: null, empty: true };
            throw new GitHubError("UPSTREAM");
          }
          const link = response.headers.get("link") ?? "";
          const next =
            link
              .split(",")
              .map((value) => value.trim())
              .find((value) => /rel="next"/.test(value))
              ?.match(/^<([^>]+)>/)?.[1] ?? null;
          // Validate again when consuming a next link; a fourth page means partial data.
          return { body, next, empty: false };
        })(),
      ]);
    } catch (error) {
      if (error instanceof GitHubError) throw error;
      // Authorization failures must not become stale data or generic upstream errors.
      if (error instanceof AccessError) throw error;
      throw new GitHubError(
        error instanceof SyntaxError ? "INVALID_RESPONSE" : "UPSTREAM",
      );
    } finally {
      clearTimeout(timer);
    }
  };
}

export const repositoryPath = root;
