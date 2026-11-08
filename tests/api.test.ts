import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "../src/app/api/demo/snapshot/route";

afterEach(() => vi.unstubAllEnvs());

it("returns a clearly marked, uncached demo snapshot", async () => {
  vi.stubEnv("PIGTOGRAM_DATA_MODE", "demo");
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Pigtogram-Mode")).toBe("DEMO");
  expect((await response.json()).mode).toBe("demo");
});

it("fails closed without leaking internal details when a real mode is requested", async () => {
  vi.stubEnv("PIGTOGRAM_DATA_MODE", "production");
  const response = await GET();
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(Object.keys(body)).toEqual(["error"]);
  expect(body.error).toContain("DEMO");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
