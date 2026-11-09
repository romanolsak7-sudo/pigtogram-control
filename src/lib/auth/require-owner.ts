import "server-only";
import { auth } from "@/auth";
import { AccessError, getAuthSettings } from "./config";
import { activeSession } from "./sessions";

export type Owner = { id: string; sessionId: string; expiresAt: number };

export function authorizeOwner(session: unknown, ownerId: string): Owner {
  if (!session || typeof session !== "object") throw new AccessError(401);
  const candidate = session as {
    user?: { id?: string };
    sessionId?: string;
    expires?: string;
  };
  if (!candidate.user?.id) throw new AccessError(401);
  if (candidate.user.id !== ownerId) throw new AccessError(403);
  const expiresAt = Date.parse(candidate.expires ?? "");
  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !activeSession(candidate.sessionId, ownerId)
  )
    throw new AccessError(401);
  return { id: ownerId, sessionId: candidate.sessionId!, expiresAt };
}

// Deliberately no React/Next/shared cache around authorization.
export async function requireOwnerSession(): Promise<Owner> {
  const { ownerId } = getAuthSettings();
  return authorizeOwner(await auth(), ownerId);
}
