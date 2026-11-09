import { redirect } from "next/navigation";
import { requireOwnerSession } from "@/lib/auth/require-owner";
import { AccessError } from "@/lib/auth/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireOwnerSession();
  } catch (error) {
    if (error instanceof AccessError) redirect("/login");
    throw error;
  }
  return children;
}
