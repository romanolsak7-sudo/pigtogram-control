"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getAlerts,
  getDiagnostics,
  toggleQueuedTask,
} from "@/lib/control/diagnostics";
import type { ControlSnapshot } from "@/lib/control/types";

interface Run {
  id: number;
  time: string;
  findings: number;
}

function useControlState(initialSnapshot: ControlSnapshot) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [queued, setQueued] = useState<string[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const diagnostics = getDiagnostics(snapshot);
  const alerts = getAlerts(snapshot);

  function refresh(diagnose = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/demo/snapshot", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("Demo snapshot unavailable");
        const next: ControlSnapshot = await response.json();
        if (next.mode !== "demo") throw new Error("Unexpected data mode");
        setSnapshot(next);
        const time = new Intl.DateTimeFormat("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Europe/Prague",
        }).format(new Date());
        setUpdatedAt(time);
        if (diagnose) {
          const findings = getDiagnostics(next).length;
          setRuns((previous) =>
            [{ id: Date.now(), time, findings }, ...previous].slice(0, 10),
          );
          setMessage(
            `DEMO diagnostika dokončena. Připraveno ${findings} doporučení.`,
          );
        } else
          setMessage(
            "DEMO snímek byl znovu načten. Hodnoty zůstávají demonstrační.",
          );
      } catch {
        setError(
          "DEMO data se nepodařilo obnovit. Zobrazuji poslední snímek. Zkus to znovu.",
        );
      } finally {
        inFlight.current = false;
      }
    });
  }

  function toggleTask(id: string) {
    setQueued((current) => toggleQueuedTask(current, id, diagnostics));
  }

  return {
    snapshot,
    queued,
    runs,
    diagnostics,
    alerts,
    pending,
    message,
    error,
    updatedAt,
    refresh,
    toggleTask,
  };
}

const ControlContext = createContext<ReturnType<typeof useControlState> | null>(
  null,
);

export function ControlStateProvider({
  initialSnapshot,
  children,
}: {
  initialSnapshot: ControlSnapshot;
  children: React.ReactNode;
}) {
  const state = useControlState(initialSnapshot);
  return <ControlContext value={state}>{children}</ControlContext>;
}

export function useControl() {
  const context = useContext(ControlContext);
  if (!context) throw new Error("ControlStateProvider is required");
  return context;
}
