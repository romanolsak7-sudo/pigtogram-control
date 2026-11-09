import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://localhost:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ignoreDefaultArgs: ["--disable-back-forward-cache"],
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
              }
            : {}),
        },
      },
    },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command:
      "node --import ./tests/e2e/mock-network.mjs ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3107",
    url: "http://localhost:3107/login",
    reuseExistingServer: false,
    env: {
      AUTH_URL: "http://localhost:3107",
      AUTH_SECRET: "synthetic-e2e-auth-secret-minimum-32-bytes",
      AUTH_GITHUB_ID: "synthetic-e2e-client",
      AUTH_GITHUB_SECRET: "synthetic-e2e-oauth-secret",
      PIGTOGRAM_OWNER_GITHUB_ID: "424242",
      PIGTOGRAM_GITHUB_SOURCE: "fixture",
      PIGTOGRAM_DATA_MODE: "demo",
      PIGTOGRAM_GITHUB_TOKEN: "synthetic-unused-github-secret-sentinel",
    },
  },
  outputDir: resolve("test-results"),
});
