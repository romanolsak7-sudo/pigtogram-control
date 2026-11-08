import type { Alert, ControlSnapshot, Diagnostic } from "./types";

export function getDiagnostics(snapshot: ControlSnapshot): Diagnostic[] {
  const findings: Diagnostic[] = [];
  for (const disk of snapshot.nas.disks) {
    if (disk.health === "warning" || disk.temperatureC >= 40) {
      findings.push({
        id: `disk-${disk.id}`,
        title: "Zkontrolovat chlazení NAS",
        description: `${disk.id} hlásí ${disk.temperatureC} °C. Doporučuji ověřit proudění vzduchu a stav ventilátorů.`,
        action: "Kontrola chlazení a S.M.A.R.T. disku",
        section: "nas",
        priority: "medium",
      });
    }
  }
  for (const project of snapshot.projects) {
    if (project.tests.status === "failed") {
      findings.push({
        id: `tests-${project.id}`,
        title: "Prověřit neúspěšný test",
        description: `${project.name}: ${project.tests.passed} z ${project.tests.total} testů prošlo. Projdi výstup posledního běhu.`,
        action: `Kontrola testů projektu ${project.name}`,
        section: "github",
        priority: "medium",
      });
    }
  }
  if (snapshot.nas.usedTb / snapshot.nas.capacityTb >= 0.7) {
    findings.push({
      id: "storage",
      title: "Udělat místo pro nové nápady",
      description: `Úložiště je zaplněno z ${Math.round((snapshot.nas.usedTb / snapshot.nas.capacityTb) * 100)} %. Revize starších záloh může uvolnit kapacitu.`,
      action: "Revize retence záloh",
      section: "nas",
      priority: "low",
    });
  }
  return findings;
}

export function getAlerts(snapshot: ControlSnapshot): Alert[] {
  return getDiagnostics(snapshot)
    .filter((finding) => finding.priority === "medium")
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      description: finding.description,
      section: finding.section,
      severity: "warning",
    }));
}

export function toggleQueuedTask(
  current: string[],
  id: string,
  available: Diagnostic[],
): string[] {
  if (!available.some((finding) => finding.id === id)) return current;
  return current.includes(id)
    ? current.filter((task) => task !== id)
    : [...current, id];
}
