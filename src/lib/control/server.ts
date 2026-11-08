import "server-only";
import { createControlProvider } from "./provider";

export async function getControlSnapshot() {
  // Fail closed: environment variables cannot accidentally enable real integrations.
  return createControlProvider(
    process.env.PIGTOGRAM_DATA_MODE ?? "demo",
  ).getSnapshot();
}
