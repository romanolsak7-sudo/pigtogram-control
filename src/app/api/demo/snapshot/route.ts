import { getDemoControlSnapshot } from "@/lib/control/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store", "X-Pigtogram-Mode": "DEMO" };
  try {
    return Response.json(await getDemoControlSnapshot(), { headers });
  } catch {
    return Response.json(
      { error: "DEMO data nejsou dostupná. Ověř konfiguraci režimu aplikace." },
      { status: 503, headers },
    );
  }
}
