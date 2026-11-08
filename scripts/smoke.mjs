import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

// An ephemeral loopback-only server verifies the actual production build, then exits.
// This is an HTTP test, not a deployment or a browser preview.
const require = createRequire(import.meta.url);
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: { ...process.env, PIGTOGRAM_DATA_MODE: "demo" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
let startError;
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});
child.on("error", (error) => {
  startError = error;
});
const exited = once(child, "exit");

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startError) throw startError;
    if (child.exitCode !== null)
      throw new Error("Production server exited before readiness");
    try {
      const response = await fetch(`${origin}/api/demo/snapshot`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the local production server to start. */
    }
    await delay(100);
  }
  assert.ok(ready, "Production server did not become ready");
  const pages = ["/", "/github", "/supabase", "/nas", "/devices", "/operator"];
  for (const path of pages) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    const html = await response.text();
    assert.match(html, /lang="cs"/, path);
    assert.match(html, /DEMO/, path);
    assert.match(html, /<h1[ >]/, path);
    console.log(`PASS ${path} — rendered Czech DEMO page and security headers`);
  }
  const api = await fetch(`${origin}/api/demo/snapshot`);
  assert.equal(api.headers.get("cache-control"), "no-store");
  assert.equal(api.headers.get("x-pigtogram-mode"), "DEMO");
  const snapshot = await api.json();
  assert.equal(snapshot.mode, "demo");
  assert.equal(snapshot.projects.length, 4);
  assert.equal(
    (await fetch(`${origin}/api/demo/snapshot`, { method: "POST" })).status,
    405,
  );
  assert.equal((await fetch(`${origin}/neexistujici-sekce`)).status, 404);
  console.log(
    "PASS demo API, no-store, rejected write method, and unknown route",
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  await exited;
}
