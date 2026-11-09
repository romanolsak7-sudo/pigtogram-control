import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertNoClientSecrets } from "./client-secret-scan.mjs";

// Fresh synthetic values exercise build-time inlining without using real credentials.
const secrets = Object.fromEntries(
  ["AUTH_SECRET", "AUTH_GITHUB_SECRET", "PIGTOGRAM_GITHUB_TOKEN"].map(
    (name) => [name, `pigtogram-build-check-${name}-${randomUUID()}`],
  ),
);
const root = fileURLToPath(new URL("../", import.meta.url));
const build = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    "build",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...secrets,
      AUTH_URL: "http://localhost:3107",
      AUTH_GITHUB_ID: "synthetic-build-client",
      PIGTOGRAM_OWNER_GITHUB_ID: "424242",
      PIGTOGRAM_GITHUB_SOURCE: "fixture",
      PIGTOGRAM_DATA_MODE: "demo",
    },
  },
);
if (build.error || build.status !== 0) {
  console.error("Client secret check: production build failed.");
  process.exit(build.status || 1);
}
try {
  const { files } = await assertNoClientSecrets(
    fileURLToPath(new URL("../.next/static/", import.meta.url)),
    secrets,
  );
  console.log(`Client secret check passed: ${files} public assets scanned.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
