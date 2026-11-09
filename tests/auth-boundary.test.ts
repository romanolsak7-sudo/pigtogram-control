import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/auth", () => ({ auth: vi.fn() }));
import { auth } from "../src/auth";
import {
  AccessError,
  getAuthSettings,
  assertAuthRequest,
} from "../src/lib/auth/config";
import {
  issueSession,
  activeSession,
  revokeSession,
} from "../src/lib/auth/sessions";
import {
  authorizeOwner,
  requireOwnerSession,
} from "../src/lib/auth/require-owner";
import { GET } from "../src/app/api/control/github/route";
import { GET as demoGET } from "../src/app/api/demo/snapshot/route";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "synthetic-auth-secret-at-least-32-characters");
  vi.stubEnv("AUTH_GITHUB_ID", "synthetic-client");
  vi.stubEnv("AUTH_GITHUB_SECRET", "synthetic-oauth-secret");
  vi.stubEnv("AUTH_URL", "http://127.0.0.1:3000");
  vi.stubEnv("PIGTOGRAM_OWNER_GITHUB_ID", "42");
  vi.stubEnv("PIGTOGRAM_GITHUB_SOURCE", "fixture");
  vi.mocked(auth).mockReset();
});
afterEach(() => vi.restoreAllMocks());

function session(id = "42") {
  const issued = issueSession(id);
  return {
    user: { id },
    sessionId: issued.id,
    expires: new Date(issued.expiresAt).toISOString(),
  };
}
const request = () => new Request("http://127.0.0.1:3000/api/control/github");

it.each([null, {}, { user: { id: "42" }, expires: "invalid" }])(
  "denies absent or invalid session %j",
  (value) => {
    expect(() => authorizeOwner(value, "42")).toThrow(AccessError);
  },
);
it("accepts only the stable owner ID, not a matching name", () => {
  expect(() =>
    authorizeOwner(
      { ...session("99"), user: { id: "99", name: "romanolsak7-sudo" } },
      "42",
    ),
  ).toThrow();
  expect(authorizeOwner(session(), "42").id).toBe("42");
});
it("rejects revoked, expired and unknown server sessions", () => {
  const data = session();
  revokeSession(data.sessionId);
  expect(() => authorizeOwner(data, "42")).toThrow();
  expect(activeSession("arbitrary-client-value", "42")).toBe(false);
  const expired = issueSession("42", Date.now() - 3600001);
  expect(activeSession(expired.id, "42")).toBe(false);
});
it("never caches the authorization decision", async () => {
  const valid = session();
  vi.mocked(auth).mockResolvedValue(valid as never);
  await requireOwnerSession();
  revokeSession(valid.sessionId);
  await expect(requireOwnerSession()).rejects.toMatchObject({ status: 401 });
});
it.each([
  [null, 401],
  [{ user: { id: "99" } }, 403],
] as const)("API denies %j without leaking data", async (data, status) => {
  vi.mocked(auth).mockResolvedValue(data as never);
  const response = await GET(request());
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.text()).not.toContain("nasobilkozrouti");
  expect(fetch).not.toHaveBeenCalled();
});
it("protected API delivers only fixture data and validates every read", async () => {
  vi.mocked(auth).mockResolvedValue(session() as never);
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("x-pigtogram-source")).toBe("fixture");
  expect(
    Number(response.headers.get("x-pigtogram-session-expires")),
  ).toBeGreaterThan(Date.now());
  expect((await response.json()).mode).toBe("github-fixture");
  expect(vi.mocked(auth).mock.calls.length).toBeGreaterThan(4);
});
it("fails closed on live source even when a token is present", async () => {
  vi.mocked(auth).mockResolvedValue(session() as never);
  vi.stubEnv("PIGTOGRAM_GITHUB_SOURCE", "live");
  vi.stubEnv("PIGTOGRAM_GITHUB_TOKEN", "never-expose-this-sentinel");
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("never-expose");
  expect(fetch).not.toHaveBeenCalled();
});
it("demo endpoint cannot reach private data even with live configuration", async () => {
  vi.stubEnv("PIGTOGRAM_DATA_MODE", "demo");
  vi.stubEnv("PIGTOGRAM_GITHUB_SOURCE", "live");
  vi.stubEnv("PIGTOGRAM_GITHUB_TOKEN", "never-expose-this-sentinel");
  const response = await demoGET();
  expect((await response.json()).mode).toBe("demo");
  expect(auth).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects missing auth configuration", async () => {
  vi.stubEnv("AUTH_SECRET", "");
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(auth).not.toHaveBeenCalled();
});
it.each([
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_URL",
  "PIGTOGRAM_OWNER_GITHUB_ID",
])("rejects missing %s", (key) => {
  vi.stubEnv(key, "");
  expect(getAuthSettings).toThrow();
});
it.each([
  "http://example.invalid",
  "https://user:password@example.invalid",
  "https://example.invalid/login",
  "not-a-url",
])("rejects unsafe auth origin %s", (url) => {
  vi.stubEnv("AUTH_URL", url);
  expect(getAuthSettings).toThrow();
});
it("rejects injected forwarding host and cross-origin POST", () => {
  expect(() =>
    assertAuthRequest(
      new Request("http://127.0.0.1:3000/api/auth/callback/github", {
        headers: { "x-forwarded-host": "evil.invalid" },
      }),
    ),
  ).toThrow();
  expect(() =>
    assertAuthRequest(
      new Request("http://127.0.0.1:3000/api/auth/signout", {
        method: "POST",
        headers: { origin: "https://evil.invalid" },
      }),
    ),
  ).toThrow();
});
it("rejects client-driven repository selection", async () => {
  const response = await GET(
    new Request("http://127.0.0.1:3000/api/control/github?repo=private"),
  );
  expect(response.status).toBe(400);
  expect(auth).not.toHaveBeenCalled();
});

it("uses canonical Host when Next normalizes the internal request URL", () => {
  expect(() =>
    assertAuthRequest(
      new Request("http://localhost:3000/api/auth/csrf", {
        headers: {
          host: "127.0.0.1:3000",
          "x-forwarded-host": "127.0.0.1:3000",
          "x-forwarded-proto": "http",
        },
      }),
    ),
  ).not.toThrow();
  for (const headers of [
    {},
    { host: "evil.invalid" },
    { host: "127.0.0.1:3000", "x-forwarded-proto": "https" },
  ] as Record<string, string>[]) {
    expect(() =>
      assertAuthRequest(
        new Request("http://127.0.0.1:3000/api/auth/csrf", { headers }),
      ),
    ).toThrow();
  }
});
