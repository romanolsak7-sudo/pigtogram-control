import "server-only";
import { createControlProvider } from "./provider";

// Public DEMO entry point. Never import the private data layer here.
export async function getDemoControlSnapshot() {
  // Fail closed: environment variables cannot accidentally enable real integrations.
  return createControlProvider(
    process.env.PIGTOGRAM_DATA_MODE ?? "demo",
  ).getSnapshot();
}
