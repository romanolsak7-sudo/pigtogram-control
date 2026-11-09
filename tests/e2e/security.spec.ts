import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, variant = "owner", tamper = false) {
  let reached!: () => void;
  const authorization = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route(
    "https://github.com/login/oauth/authorize**",
    async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("scope") ?? "").toBe("");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("code_challenge")!.length).toBeGreaterThan(
        30,
      );
      const callback = new URL(
        "http://localhost:3107/api/auth/callback/github",
      );
      callback.searchParams.set("code", `mock-${variant}`);
      callback.searchParams.set(
        "state",
        tamper ? "tampered" : url.searchParams.get("state")!,
      );
      await route.fulfill({
        status: 302,
        headers: { location: callback.href },
        body: "",
      });
      reached();
    },
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Přihlásit přes GitHub" }).click();
  await authorization;
}

test("anonymous API, SSR, RSC and write requests reveal nothing", async ({
  request,
}) => {
  const api = await request.get("/api/control/github");
  expect(api.status()).toBe(401);
  expect(api.headers()["cache-control"]).toContain("no-store");
  for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
    const response = await request.get("/control/github", { headers });
    const body = await response.text();
    expect(body).not.toContain("UKÁZKA — bezpečný pohyb hada");
    if (headers.RSC) expect(body).toContain("/login");
    else expect(response.url()).toContain("/login");
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    expect(
      (await request.fetch("/api/control/github", { method })).status(),
    ).toBe(405);
  }
  expect((await request.get("/api/demo/snapshot")).status()).toBe(200);
});

test("real Auth.js flow exposes only authorized fixture DTO", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByTestId("private-data")).toBeVisible();
  await expect(
    page.getByText("#1001 · UKÁZKA — bezpečný pohyb hada"),
  ).toBeVisible();
  await expect(page.getByText("Běh úspěšný", { exact: true })).toBeVisible();
  await expect(
    page.getByText("fixture/safe-snake", { exact: true }).first(),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name.endsWith("session-token"));
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  const html = await (await page.request.get("/control/github")).text();
  expect(html).not.toContain("UKÁZKA — bezpečný pohyb hada");
  expect(html).not.toContain("synthetic-e2e-oauth-secret");
  const data = await (await page.request.get("/api/control/github")).text();
  expect(data).not.toMatch(
    /access_token|clientSecret|synthetic-unused-github-secret-sentinel/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/github-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("non-owner and tampered OAuth state are denied", async ({ page }) => {
  await login(page, "other");
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/control/github")).status()).toBe(401);
  await page.unroute("https://github.com/login/oauth/authorize**");
  await login(page, "owner", true);
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/control/github")).status()).toBe(401);
});

test("logout revokes the old cookie and history cannot restore data", async ({
  page,
  browser,
}) => {
  await login(page);
  await expect(page.getByTestId("private-data")).toBeVisible();
  const oldCookies = await page.context().cookies();
  await page.getByRole("button", { name: "Odhlásit", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const replay = await browser.newContext();
  await replay.addCookies(oldCookies);
  expect(
    (
      await replay.request.get("http://localhost:3107/api/control/github")
    ).status(),
  ).toBe(401);
  await replay.close();
  await page.goBack();
  await expect(page.getByTestId("private-data")).toHaveCount(0);
  await page.goto("/control/github");
  await expect(page).toHaveURL(/\/login/);
});

test("pagehide clears DOM synchronously and persisted pageshow reauthorizes", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByTestId("private-data")).toBeVisible();
  const hidden = await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    return !document
      .querySelector('[data-testid="private-data"]')
      ?.textContent?.includes("UKÁZKA");
  });
  expect(hidden).toBe(true);
  await page.context().clearCookies();
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId("private-data")).toHaveCount(0);
});

test("logout in another tab locks the private view", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("private-data")).toBeVisible();
  const other = await page.context().newPage();
  await other.goto("/control/github");
  await expect(other.getByTestId("private-data")).toBeVisible();
  await other.getByRole("button", { name: "Odhlásit", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId("private-data")).toHaveCount(0);
});

test("client navigation cannot replay the private snapshot", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByTestId("private-data")).toBeVisible();
  await page.getByRole("link", { name: "Veřejné DEMO", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3107/");
  await page.context().clearCookies();
  await page.goBack();
  await expect(page.getByTestId("private-data")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);
});
