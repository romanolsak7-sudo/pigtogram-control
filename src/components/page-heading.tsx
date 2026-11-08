"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { navigation } from "@/lib/control/navigation";
import type { Section } from "@/lib/control/types";
import { useControl } from "./control-context";

export function PageHeading({ section }: { section: Section }) {
  const { pending, refresh, updatedAt } = useControl();
  const item = navigation.find((entry) => entry.id === section)!;
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {section === "overview"
            ? "TVŮJ OSOBNÍ DIGITÁLNÍ VELÍN"
            : "PRACOVNÍ PROSTOR / " + item.label.toUpperCase()}
        </div>
        <h1>
          {section === "overview" ? (
            <>
              Všechno pod <span>kontrolou.</span>
            </>
          ) : (
            item.label
          )}
        </h1>
        <p>{item.description}</p>
      </div>
      <div className="page-actions">
        <span className="last-updated">
          {updatedAt
            ? `Demo načteno v ${updatedAt}`
            : "DEMO snímek · 8. listopadu 2026"}
        </span>
        <div className="flex gap-2">
          <button
            className="button secondary"
            disabled={pending}
            onClick={() => refresh()}
            aria-label="Obnovit DEMO data"
          >
            <RefreshCw size={15} className={pending ? "spin" : ""} />
            <span>Obnovit</span>
          </button>
          <button
            className="button primary"
            disabled={pending}
            onClick={() => refresh(true)}
          >
            <Sparkles size={15} />
            {pending ? "Načítám demo…" : "Spustit diagnostiku"}
          </button>
        </div>
      </div>
    </div>
  );
}
