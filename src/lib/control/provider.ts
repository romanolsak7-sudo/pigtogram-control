import { demoSnapshot } from "./demo-data";
import type { ControlProvider } from "./types";

export function createControlProvider(mode = "demo"): ControlProvider {
  if (mode !== "demo") {
    throw new Error("Unsupported data mode. This release supports DEMO only.");
  }
  return {
    mode: "demo",
    async getSnapshot() {
      return structuredClone(demoSnapshot);
    },
  };
}
