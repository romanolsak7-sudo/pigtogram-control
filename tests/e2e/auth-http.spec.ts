import { test, expect, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3107";
async function oauth(
  request: APIRequestContext,
  code = "mock-owner",
  tamper = false,
) {
  const csrf = await (await request.get("/api/auth/csrf")).json();
  const signin = await request.post("/api/auth/signin/github", {
    headers: { Origin: origin, "X-Auth-Return-Redirect": "1" },
    form: {
      csrfToken: csrf.csrfToken,
      callbackUrl: `${origin}/control/github`,
    },
  });
  expect(signin.status()).toBe(200);
  const authorization = new URL((await signin.json()).url);
  expect(authorization.hostname).toBe("github.com");
  expect(authorization.searchParams.get("scope") ?? "").toBe("");
  expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
  return request.get(
    `/api/auth/callback/github?code=${code}&state=${tamper ? "bad-state" : encodeURIComponent(authorization.searchParams.get("state")!)}`,
    { maxRedirects: 0 },
  );
}

test("HTTP OAuth verifies owner, issues real session and revokes replay on logout", async ({
  request,
  playwright,
}) => {
  const callback = await oauth(request);
  expect(callback.status()).toBe(302);
  expect(callback.headers().location).toBe(`${origin}/control/github`);
  const state = await request.storageState();
  expect(
    state.cookies.find((c) => c.name.endsWith("session-token"))?.httpOnly,
  ).toBe(true);
  const response = await request.get("/api/control/github");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("github-fixture");
  expect(body).not.toMatch(
    /synthetic-e2e|synthetic-unused|access_token|private@example/,
  );
  const html = await (await request.get("/control/github")).text();
  expect(html).not.toContain("UKÁZKA — bezpečný pohyb hada");
  const rsc = await (
    await request.get("/control/github", { headers: { RSC: "1" } })
  ).text();
  expect(rsc).not.toContain("UKÁZKA — bezpečný pohyb hada");
  const csrf = await (await request.get("/api/auth/csrf")).json();
  const logout = await request.post("/api/auth/signout", {
    headers: { Origin: origin, "X-Auth-Return-Redirect": "1" },
    form: { csrfToken: csrf.csrfToken, callbackUrl: `${origin}/login` },
  });
  expect(logout.status()).toBe(200);
  expect((await request.get("/api/control/github")).status()).toBe(401);
  expect(await (await request.get("/api/auth/session")).json()).toBeNull();
  const replay = await playwright.request.newContext({
    baseURL: origin,
    storageState: state,
  });
  expect((await replay.get("/api/control/github")).status()).toBe(401);
  await replay.dispose();
});

test("HTTP OAuth rejects non-owner and tampered callback state", async ({
  request,
  playwright,
}) => {
  const other = await oauth(request, "mock-other");
  expect(other.headers().location).toContain("AccessDenied");
  expect((await request.get("/api/control/github")).status()).toBe(401);
  const second = await playwright.request.newContext({ baseURL: origin });
  const invalid = await oauth(second, "mock-owner", true);
  expect(invalid.headers().location).not.toBe(`${origin}/control/github`);
  expect((await second.get("/api/control/github")).status()).toBe(401);
  await second.dispose();
});

test("HTTP auth rejects untrusted origins and public DEMO stays isolated", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/auth/signout", {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/auth/csrf", {
        headers: { "X-Forwarded-Host": "evil.invalid" },
      })
    ).status(),
  ).toBe(403);
  const demo = await request.get("/api/demo/snapshot");
  expect(demo.status()).toBe(200);
  expect((await demo.json()).mode).toBe("demo");
});
