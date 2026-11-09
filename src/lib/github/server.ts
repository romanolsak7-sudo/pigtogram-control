import "server-only";
import { requireOwnerSession } from "@/lib/auth/require-owner";
import { AccessError } from "@/lib/auth/config";
import { fixtureTransport } from "./fixture";
import { createAuthorizedGithubService } from "./service";

const fixtureService = createAuthorizedGithubService({
  authorize: requireOwnerSession,
  transport: fixtureTransport,
});

// Structurally separate from the public DEMO loader. No live transport is wired.
export async function getPrivateGithubSnapshot() {
  await requireOwnerSession();
  if ((process.env.PIGTOGRAM_GITHUB_SOURCE ?? "fixture") !== "fixture")
    throw new AccessError(503);
  return fixtureService();
}
