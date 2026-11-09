import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Search only public build assets. Never print the secret values or matching bytes.
export async function assertNoClientSecrets(directory, secrets) {
  const entries = Object.entries(secrets);
  if (
    entries.length === 0 ||
    entries.some(([, value]) => typeof value !== "string" || value.length < 16)
  )
    throw new Error("Client secret scan requires nonempty secret sentinels.");
  const needles = entries.map(([name, value]) => ({
    name,
    values: [
      ...new Set([
        value,
        JSON.stringify(value).slice(1, -1),
        encodeURIComponent(value),
        Buffer.from(value).toString("base64"),
      ]),
    ].map((variant) => Buffer.from(variant)),
  }));
  let files = 0;
  let javascriptFiles = 0;
  const matches = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(file);
      } else if (entry.isFile()) {
        files++;
        if (entry.name.endsWith(".js")) javascriptFiles++;
        const bytes = await readFile(file);
        for (const needle of needles)
          if (needle.values.some((value) => bytes.includes(value)))
            matches.push(`${relative(directory, file)} (${needle.name})`);
      } else {
        throw new Error("Client secret scan encountered an unsupported asset.");
      }
    }
  }
  await visit(directory);
  if (matches.length)
    throw new Error(
      `Server secret found in client assets: ${matches.join(", ")}`,
    );
  if (!javascriptFiles)
    throw new Error("Client secret scan found no JavaScript build assets.");
  return { files };
}
