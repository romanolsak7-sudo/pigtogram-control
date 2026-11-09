import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import {
  AccessError,
  assertAuthRequest,
  privateHeaders,
} from "@/lib/auth/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(request: NextRequest) {
  try {
    assertAuthRequest(request);
    const response =
      await handlers[request.method === "POST" ? "POST" : "GET"](request);
    // Auth.js error redirects can have immutable headers.
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(privateHeaders))
      headers.set(key, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return Response.json(
      { error: "Přihlášení není dostupné." },
      {
        status: error instanceof AccessError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}
export const GET = handle;
export const POST = handle;
