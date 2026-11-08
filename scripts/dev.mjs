// Accept standard Next.js flags and the host/port flags supplied by the local preview runner.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const incoming = process.argv.slice(2);
const args = [];
for (const argument of incoming) {
  if (argument === "--strictPort") continue; // An explicit Next.js port already fails if occupied.
  args.push(argument === "--host" ? "--hostname" : argument);
}
if (!args.includes("--hostname")) args.push("--hostname", "0.0.0.0");

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", ...args],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
