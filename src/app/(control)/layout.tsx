import { getDemoControlSnapshot } from "@/lib/control/server";
import { ControlStateProvider } from "@/components/control-context";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = await getDemoControlSnapshot();
  return (
    <ControlStateProvider initialSnapshot={snapshot}>
      <AppShell>{children}</AppShell>
    </ControlStateProvider>
  );
}
