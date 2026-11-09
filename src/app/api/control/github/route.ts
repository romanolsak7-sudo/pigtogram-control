import { getPrivateGithubSnapshot } from "@/lib/github/server";
import { AccessError, privateHeaders } from "@/lib/auth/config";
import { GitHubError } from "@/lib/github/client";
import { requireOwnerSession } from "@/lib/auth/require-owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // This is not a configurable proxy; all repository selection is server-owned.
  if (new URL(request.url).search)
    return Response.json(
      { error: "Nepovolené parametry." },
      { status: 400, headers: privateHeaders },
    );
  try {
    const owner = await requireOwnerSession();
    const snapshot = await getPrivateGithubSnapshot();
    return Response.json(snapshot, {
      headers: {
        ...privateHeaders,
        "X-Pigtogram-Source": "fixture",
        "X-Pigtogram-Session-Expires": String(owner.expiresAt),
      },
    });
  } catch (error) {
    const status =
      error instanceof AccessError
        ? error.status
        : error instanceof GitHubError && error.code === "RATE_LIMIT"
          ? 429
          : 503;
    return Response.json(
      {
        error:
          status === 401 || status === 403
            ? "Přístup vyžaduje oprávnění vlastníka."
            : "Přehled není dostupný.",
      },
      {
        status,
        headers: {
          ...privateHeaders,
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  }
}
