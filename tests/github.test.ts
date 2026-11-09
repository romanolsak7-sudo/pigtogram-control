import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "../src/lib/auth/config";
import {
  createGitHubClient,
  repositoryPath,
  type Transport,
} from "../src/lib/github/client";
import { fixtureTransport } from "../src/lib/github/fixture";
import { createAuthorizedGithubService } from "../src/lib/github/service";
import { workflowLabel, githubSnapshotSchema } from "../src/lib/github/schema";

afterEach(() => vi.restoreAllMocks());
const owner = {
  id: "42",
  sessionId: "synthetic-session",
  expiresAt: Date.now() + 86400000,
};
const authorize = async () => owner;

describe("isolated GitHub reader", () => {
  it("maps only selected fields and never uses global fetch", async () => {
    const snapshot = await createAuthorizedGithubService({
      authorize,
      transport: fixtureTransport,
    })();
    expect(snapshot.scope).toBe("romanolsak7-sudo/nasobilkozrouti");
    expect(snapshot.workflows.data?.[0].sha).toBe("a".repeat(40));
    expect(snapshot).not.toHaveProperty("tests");
    expect(JSON.stringify(snapshot)).not.toContain("access_token");
    expect(fetch).not.toHaveBeenCalled();
    expect(snapshot.repository.source).toBe("fixture");
  });
  it("does not call any transport before authorization", async () => {
    const transport = vi.fn(fixtureTransport);
    await expect(
      createAuthorizedGithubService({
        authorize: async () => {
          throw new AccessError(401);
        },
        transport,
      })(),
    ).rejects.toMatchObject({ status: 401 });
    expect(transport).not.toHaveBeenCalled();
  });
  it("authorizes again on warm cache and on completion", async () => {
    let allowed = true;
    const transport = vi.fn(fixtureTransport);
    const service = createAuthorizedGithubService({
      authorize: async () => {
        if (!allowed) throw new AccessError(401);
        return owner;
      },
      transport,
    });
    const one = await service();
    one.pulls.data?.pop();
    expect((await service()).pulls.data).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(4);
    allowed = false;
    await expect(service()).rejects.toMatchObject({ status: 401 });
    expect(transport).toHaveBeenCalledTimes(4);
  });
  it("rejects an in-flight response after logout", async () => {
    let valid = true;
    const service = createAuthorizedGithubService({
      authorize: async () => {
        if (!valid) throw new AccessError(401);
        return owner;
      },
      transport: async (request) => {
        valid = false;
        return fixtureTransport(request);
      },
    });
    await expect(service()).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    "https://evil.invalid/",
    `${repositoryPath}/contents/README.md`,
    `${repositoryPath.replace("nasobilkozrouti", "private")}/pulls`,
    `${repositoryPath}?url=https://evil.invalid`,
  ])("rejects out-of-scope URL %s", async (url) => {
    const transport = vi.fn(fixtureTransport);
    await expect(
      createGitHubClient(transport, authorize)(url),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(transport).not.toHaveBeenCalled();
  });
  it("only sends GET, pinned API version and redacted DTO", async () => {
    const transport = vi.fn(fixtureTransport);
    const client = createGitHubClient(transport, authorize, {
      credential: "synthetic-token-sentinel",
    });
    await client(repositoryPath);
    const request = transport.mock.calls[0][0];
    expect(request.method).toBe("GET");
    expect(request.redirect).toBe("error");
    expect(request.cache).toBe("no-store");
    expect(request.headers.get("X-GitHub-Api-Version")).toBe("2026-03-10");
  });
  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [502, "UPSTREAM"],
  ] as const)("sanitizes upstream %s", async (status, code) => {
    const read = createGitHubClient(
      async () => new Response("secret-value", { status }),
      authorize,
    );
    await expect(read(repositoryPath)).rejects.toMatchObject({
      code,
      message: code,
    });
  });
  it("stops after a rate limit and honors retry time", async () => {
    const transport = vi.fn(
      async () =>
        new Response(null, { status: 429, headers: { "Retry-After": "120" } }),
    );
    const read = createGitHubClient(transport, authorize, {
      now: () => 100000,
    });
    await expect(read(repositoryPath)).rejects.toMatchObject({
      code: "RATE_LIMIT",
      retryAt: 220000,
    });
    await expect(read(repositoryPath)).rejects.toMatchObject({
      code: "RATE_LIMIT",
    });
    expect(transport).toHaveBeenCalledOnce();
  });
  it("bounds a transport that ignores abort", async () => {
    const read = createGitHubClient(() => new Promise(() => {}), authorize, {
      timeoutMs: 10,
    });
    await expect(read(repositoryPath)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
  it("rejects invalid JSON and oversized responses", async () => {
    await expect(
      createGitHubClient(
        async () => new Response("{"),
        authorize,
      )(repositoryPath),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(
      createGitHubClient(
        async () => new Response(" ".repeat(1024 * 1024 + 1)),
        authorize,
      )(repositoryPath),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});

describe("freshness and partial data", () => {
  it("keeps independent resources and does not replace unknown with zero", async () => {
    const transport: Transport = (request) =>
      request.url.includes("actions/runs")
        ? Promise.resolve(new Response(null, { status: 503 }))
        : fixtureTransport(request);
    const snapshot = await createAuthorizedGithubService({
      authorize,
      transport,
    })();
    expect(snapshot.repository.state).toBe("fresh");
    expect(snapshot.pulls.data).toHaveLength(1);
    expect(snapshot.workflows.state).toBe("unavailable");
    expect(snapshot.workflows.data).toBeNull();
    expect(snapshot.commits.state).toBe("fresh");
  });
  it("expires stale data without moving its verified timestamp", async () => {
    let time = Date.now();
    let fail = false;
    const transport: Transport = (request) =>
      fail
        ? Promise.resolve(new Response(null, { status: 503 }))
        : fixtureTransport(request);
    const service = createAuthorizedGithubService({
      authorize,
      transport,
      now: () => time,
    });
    const fresh = await service();
    fail = true;
    time += 61000;
    const stale = await service();
    expect(stale.pulls.state).toBe("stale");
    expect(stale.pulls.checkedAt).toBe(fresh.pulls.checkedAt);
    time += 600000;
    expect((await service()).pulls.data).toBeNull();
  });
  it("purges rather than reusing cached data on upstream credential rejection", async () => {
    let time = Date.now();
    let fail = false;
    const service = createAuthorizedGithubService({
      authorize,
      now: () => time,
      transport: (request) =>
        fail
          ? Promise.resolve(new Response(null, { status: 401 }))
          : fixtureTransport(request),
    });
    await service();
    time += 61000;
    fail = true;
    await expect(service()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("limits local refreshes before upstream calls", async () => {
    const transport = vi.fn(fixtureTransport);
    const service = createAuthorizedGithubService({ authorize, transport });
    for (let i = 0; i < 10; i++) await service();
    await expect(service()).rejects.toMatchObject({ code: "RATE_LIMIT" });
    expect(transport).toHaveBeenCalledTimes(4);
  });
  it("follows validated pagination and marks bounded history incomplete", async () => {
    const service = createAuthorizedGithubService({
      authorize,
      transport: async (request) => {
        const response = await fixtureTransport(request);
        if (!request.url.includes("/pulls")) return response;
        const body = await response.json();
        const page = Number(new URL(request.url).searchParams.get("page"));
        body[0].id += page;
        body[0].number += page;
        return Response.json(body, {
          headers: {
            Link: `<${repositoryPath}/pulls?state=open&per_page=100&page=${page + 1}>; rel="next"`,
          },
        });
      },
    });
    const result = await service();
    expect(result.pulls.data).toHaveLength(3);
    expect(result.pulls.complete).toBe(false);
  });
  it("rejects a cross-origin pagination link before following it", async () => {
    const transport = vi.fn(async (request: Request) => {
      const response = await fixtureTransport(request);
      if (request.url.includes("/pulls"))
        response.headers.set("link", '<https://evil.invalid/>; rel="next"');
      return response;
    });
    const result = await createAuthorizedGithubService({
      authorize,
      transport,
    })();
    expect(result.pulls.state).toBe("unavailable");
    expect(
      transport.mock.calls.every(
        ([req]) => new URL(req.url).hostname === "api.github.com",
      ),
    ).toBe(true);
  });
  it("uses the configured default branch and strips private fields", async () => {
    let commitUrl = "";
    const service = createAuthorizedGithubService({
      authorize,
      transport: async (request) => {
        const response = await fixtureTransport(request);
        const body = await response.json();
        if (request.url === repositoryPath) {
          body.default_branch = "release/v2";
          body.token = "secret-sentinel";
        }
        if (request.url.includes("/commits")) {
          commitUrl = request.url;
          body[0].commit.committer.email = "private@example.invalid";
        }
        return Response.json(body);
      },
    });
    const result = await service();
    expect(new URL(commitUrl).searchParams.get("sha")).toBe("release/v2");
    expect(JSON.stringify(result)).not.toMatch(
      /secret-sentinel|private@example/,
    );
  });
  it("distinguishes an empty repo from an arbitrary conflict", async () => {
    for (const empty of [true, false]) {
      const result = await createAuthorizedGithubService({
        authorize,
        transport: (request) =>
          request.url.includes("/commits")
            ? Promise.resolve(
                Response.json(
                  { message: empty ? "Git Repository is empty." : "Conflict" },
                  { status: 409 },
                ),
              )
            : fixtureTransport(request),
      })();
      expect(result.commits.data).toEqual(empty ? [] : null);
    }
  });
  it.each(["queued", "in_progress", "completed", "future_status"])(
    "ties workflow status %s to its own SHA",
    async (status) => {
      const data = await createAuthorizedGithubService({
        authorize,
        transport: fixtureTransport,
      })();
      const run = data.workflows.data![0];
      run.status = status;
      run.conclusion = status === "completed" ? "cancelled" : null;
      expect(workflowLabel(run)).not.toBe("Běh úspěšný");
      expect(run.sha).toBe("a".repeat(40));
      expect(
        githubSnapshotSchema.safeParse({ ...data, healthy: true }).success,
      ).toBe(false);
    },
  );
});
