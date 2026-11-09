import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { assertNoClientSecrets } from "../scripts/client-secret-scan.mjs";

const roots = [];
const secrets = {
  AUTH_SECRET: "synthetic-session-secret-for-scanner",
  AUTH_GITHUB_SECRET: "synthetic-oauth-secret-for-scanner",
  PIGTOGRAM_GITHUB_TOKEN: "synthetic-repository-token-for-scanner",
};
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pigtogram-secret-scan-"));
  roots.push(root);
  await mkdir(join(root, "chunks"));
  await writeFile(join(root, "chunks", "app.js"), 'console.log("public");');
  return root;
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    const target = resolve(root);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep));
    assert.ok(basename(target).startsWith("pigtogram-secret-scan-"));
    await rm(target, { recursive: true, force: true });
  }
});

test("accepts clean nested assets", async () => {
  const root = await fixture();
  await writeFile(join(root, "chunks", "app.js.map"), '{"version":3}');
  assert.deepEqual(await assertNoClientSecrets(root, secrets), { files: 2 });
});

for (const name of Object.keys(secrets)) {
  test(`rejects ${name} without printing its value`, async () => {
    const root = await fixture();
    await writeFile(
      join(root, "chunks", "app.js"),
      JSON.stringify(secrets[name]),
    );
    await assert.rejects(assertNoClientSecrets(root, secrets), (error) => {
      assert.match(error.message, /Server secret found/);
      assert.ok(error.message.includes(name));
      assert.ok(!error.message.includes(secrets[name]));
      return true;
    });
  });
}

test("rejects encoded secrets in a source map", async () => {
  const root = await fixture();
  await writeFile(
    join(root, "chunks", "app.js.map"),
    Buffer.from(secrets.AUTH_SECRET).toString("base64"),
  );
  await assert.rejects(assertNoClientSecrets(root, secrets), /app\.js\.map/);
});

test("rejects missing assets or sentinels", async () => {
  const root = await fixture();
  await mkdir(join(root, "empty"));
  await assert.rejects(assertNoClientSecrets(join(root, "missing"), secrets));
  await assert.rejects(
    assertNoClientSecrets(join(root, "empty"), secrets),
    /no JavaScript/,
  );
  await assert.rejects(assertNoClientSecrets(root, {}), /sentinels/);
});
