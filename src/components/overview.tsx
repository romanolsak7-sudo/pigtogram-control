"use client";

import { CircleCheck, CircleAlert } from "lucide-react";
import { useControl } from "./control-context";
import { PageHeading } from "./page-heading";
import { ActivityChart } from "./activity-chart";
import {
  EventsPanel,
  OperatorPanel,
  ProjectsPanel,
  ServiceSummary,
  StoragePanel,
} from "./widgets";

export function Overview() {
  const { alerts } = useControl();
  return (
    <>
      <PageHeading section="overview" />
      <div className="section-label">
        <span>
          <CircleCheck size={15} />
          PŘEHLED SYSTÉMŮ
        </span>
        <span className="attention-label">
          <CircleAlert size={13} />
          {alerts.length} upozornění v DEMO snímku
        </span>
      </div>
      <ServiceSummary />
      <div className="dashboard-grid">
        <ActivityChart />
        <OperatorPanel />
        <ProjectsPanel />
        <StoragePanel />
        <EventsPanel />
        <div className="quiet-note">
          <div className="orbit-art" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <span className="eyebrow">MÉNĚ PŘEPÍNÁNÍ. VÍCE PŘEHLEDU.</span>
          <h2>
            Jeden prostor.
            <br />
            <span>Celý tvůj digitální svět.</span>
          </h2>
          <p>Od prvního commitu po poslední zálohu.</p>
        </div>
      </div>
    </>
  );
}
