import { redirect } from "next/navigation";
import { requireOwnerSession } from "@/lib/auth/require-owner";
import { AccessError } from "@/lib/auth/config";
import { PrivateGithub } from "@/components/private/github";

export default async function PrivateGithubPage() {
  // Layouts can be reused on client navigation. Protect this entry independently.
  try {
    await requireOwnerSession();
  } catch (error) {
    if (error instanceof AccessError) redirect("/login");
    throw error;
  }
  // Never serialize private snapshots into HTML, RSC, or the Next router cache.
  return <PrivateGithub />;
}
