import { beforeEach, afterEach, vi } from "vitest";
vi.mock("server-only", () => ({}));
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected external network request in test");
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
