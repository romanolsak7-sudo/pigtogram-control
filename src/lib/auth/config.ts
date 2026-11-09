import "server-only";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503) {
    super(status === 503 ? "AUTH_NOT_CONFIGURED" : "ACCESS_DENIED");
    this.name = "AccessError";
  }
}

export function getAuthSettings() {
  const {
    AUTH_SECRET,
    AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET,
    AUTH_URL,
    PIGTOGRAM_OWNER_GITHUB_ID,
  } = process.env;
  if (
    !AUTH_SECRET ||
    AUTH_SECRET.length < 32 ||
    !AUTH_GITHUB_ID ||
    !AUTH_GITHUB_SECRET ||
    !AUTH_URL ||
    !PIGTOGRAM_OWNER_GITHUB_ID ||
    !/^\d+$/.test(PIGTOGRAM_OWNER_GITHUB_ID)
  )
    throw new AccessError(503);
  let url: URL;
  try {
    url = new URL(AUTH_URL);
  } catch {
    throw new AccessError(503);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new AccessError(503);
  }
  return {
    secret: AUTH_SECRET,
    clientId: AUTH_GITHUB_ID,
    clientSecret: AUTH_GITHUB_SECRET,
    origin: url.origin,
    ownerId: PIGTOGRAM_OWNER_GITHUB_ID,
    secure: url.protocol === "https:",
  };
}

export function authConfigured() {
  try {
    getAuthSettings();
    return true;
  } catch {
    return false;
  }
}

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

// Do not trust caller-controlled Host or forwarded headers for OAuth redirects.
export function assertAuthRequest(request: Request) {
  const { origin } = getAuthSettings();
  const expected = new URL(origin);
  // NextRequest.url may contain the internal bind address or normalize loopback.
  // Require the canonical HTTP Host instead; never derive OAuth URLs from it.
  if (
    request.headers.get("host") !== expected.host ||
    (request.headers.get("x-forwarded-host") &&
      request.headers.get("x-forwarded-host") !== expected.host) ||
    (request.headers.get("x-forwarded-proto") &&
      request.headers.get("x-forwarded-proto") !==
        expected.protocol.slice(0, -1))
  ) {
    throw new AccessError(403);
  }
  if (request.method === "POST" && request.headers.get("origin") !== origin) {
    throw new AccessError(403);
  }
}
