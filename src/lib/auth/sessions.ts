import "server-only";
import { randomUUID } from "node:crypto";

export const SESSION_SECONDS = 3600;
type Record = { ownerId: string; expiresAt: number };
const registry = globalThis as typeof globalThis & {
  pigtogramSessions?: Map<string, Record>;
};
// Single-process pilot only. A restart invalidates every session (fail closed).
// Before multi-instance hosting, replace with a durable, shared session store.
const sessions = (registry.pigtogramSessions ??= new Map());

export function issueSession(ownerId: string, now = Date.now()) {
  for (const [id, session] of sessions)
    if (session.expiresAt <= now) sessions.delete(id);
  if (sessions.size >= 100) throw new Error("SESSION_LIMIT");
  const id = randomUUID();
  const expiresAt = now + SESSION_SECONDS * 1000;
  sessions.set(id, { ownerId, expiresAt });
  return { id, expiresAt };
}

export function activeSession(id: unknown, ownerId: unknown, now = Date.now()) {
  if (typeof id !== "string" || typeof ownerId !== "string") return false;
  const record = sessions.get(id);
  if (!record || record.ownerId !== ownerId || record.expiresAt <= now)
    return false;
  return true;
}

export function revokeSession(id: unknown) {
  if (typeof id === "string") sessions.delete(id);
}
