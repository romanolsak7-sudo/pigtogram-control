"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  GitBranch,
  GitPullRequest,
  HardDrive,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { sectionHref } from "@/lib/control/navigation";
import type { Project } from "@/lib/control/types";
import { useControl } from "./control-context";
import {
  DemoBadge,
  EmptyState,
  HealthBadge,
  Modal,
  MoreLink,
  Panel,
  PanelHeading,
  ProgressBar,
  ServiceIcon,
} from "./ui";

export function ProjectsPanel({ full = false }: { full?: boolean }) {
  const { snapshot } = useControl();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const projects = snapshot.projects.filter(
    (project) =>
      project.name.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || project.tests.status === status),
  );
  return (
    <Panel className="projects-panel">
      <PanelHeading
        title="Tvoje projekty"
        subtitle={`${snapshot.projects.length} projektů · GitHub DEMO`}
        action={full ? <DemoBadge /> : <MoreLink href="/github" />}
      />
      {full && (
        <div className="filter-row">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Hledat projekt"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hledat projekt…"
            />
          </label>
          <select
            aria-label="Filtrovat podle testů"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Všechny testy</option>
            <option value="passed">Úspěšné</option>
            <option value="failed">Neúspěšné</option>
          </select>
        </div>
      )}
      <div className="table-scroll">
        <table className="projects-table">
          <thead>
            <tr>
              <th>PROJEKT</th>
              <th>VĚTEV</th>
              <th>TESTY</th>
              <th>AKTIVITA</th>
              <th>
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <button
                    className="project-name"
                    aria-label={`Otevřít projekt ${project.name}`}
                    onClick={() => setSelected(project)}
                  >
                    <span className="repo-icon">
                      <GitBranch size={17} />
                    </span>
                    <span>
                      <strong>{project.name}</strong>
                      <small>
                        <i style={{ background: project.color }} />
                        {project.language}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="branch-label">
                    <GitBranch size={12} />
                    {project.branch}
                  </span>
                </td>
                <td>
                  <span className={`test-status ${project.tests.status}`}>
                    {project.tests.status === "passed" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <CircleAlert size={14} />
                    )}
                    <span>
                      {project.tests.passed}/{project.tests.total}
                    </span>
                  </span>
                </td>
                <td className="activity-cell">{project.updated}</td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => setSelected(project)}
                    aria-label={`Detail projektu ${project.name}`}
                  >
                    <ChevronRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {projects.length === 0 && (
        <EmptyState
          title="Žádné odpovídající projekty"
          description="Uprav název nebo filtr výsledků testů."
        />
      )}
      <div className="panel-bottom">
        <span>
          <GitPullRequest size={14} />
          {snapshot.pullRequests.length} otevřené Pull Requesty
        </span>
        <span className="muted">Všechny projekty jsou DEMO</span>
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <p className="modal-lead">{selected.description}</p>
          <dl className="detail-grid">
            <div>
              <dt>Jazyk</dt>
              <dd>{selected.language}</dd>
            </div>
            <div>
              <dt>Větev</dt>
              <dd>{selected.branch}</dd>
            </div>
            <div>
              <dt>Testy</dt>
              <dd>
                {selected.tests.passed} / {selected.tests.total}
              </dd>
            </div>
            <div>
              <dt>Délka běhu</dt>
              <dd>{selected.tests.duration}</dd>
            </div>
          </dl>
          <div
            className={`info-block ${selected.tests.status === "failed" ? "warning" : ""}`}
          >
            <ShieldCheck size={20} />
            <div>
              <strong>
                {selected.tests.status === "passed"
                  ? "Simulované testy prošly"
                  : "Simulovaný test vyžaduje pozornost"}
              </strong>
              <p>
                {selected.tests.status === "passed"
                  ? "Ukázkový běh kontroly kódu je v pořádku."
                  : "Ukázkový scénář: test nočního osvětlení očekává vypnutou lampu po 23:00. Projdi podmínku časového pásma."}
              </p>
            </div>
          </div>
          <p className="muted text-sm mt-5">
            Toto je fiktivní projekt v DEMO snímku, bez propojení na GitHub.
          </p>
        </Modal>
      )}
    </Panel>
  );
}

export function OperatorPanel({ full = false }: { full?: boolean }) {
  const { diagnostics, queued, toggleTask, refresh, pending } = useControl();
  return (
    <Panel className={`operator-panel ${full ? "full" : ""}`}>
      <PanelHeading
        title="AI operátor"
        subtitle="Malý náskok. Větší klid."
        icon={
          <span className="operator-orb">
            <Sparkles size={19} />
          </span>
        }
        action={<span className="tiny-label">DEMO</span>}
      />
      <div className="operator-intro">
        <span className="operator-ready">
          <span className="status-dot" />
          PŘIPRAVEN POMOCI
        </span>
        <h3>
          Vidím souvislosti.
          <br />
          <span>Ty rozhoduješ.</span>
        </h3>
        <p>
          {diagnostics.length} doporučení z demo diagnostiky.
          <br />
          Žádná změna bez tvého rozhodnutí.
        </p>
      </div>
      <div className="recommendations">
        {diagnostics.slice(0, full ? undefined : 2).map((finding, index) => (
          <div className="recommendation" key={finding.id}>
            <span className={`recommendation-number ${finding.priority}`}>
              0{index + 1}
            </span>
            <div>
              <h3>{finding.title}</h3>
              {full ? (
                <p>{finding.description}</p>
              ) : (
                <span className="muted text-xs">
                  {finding.section === "nas" ? "Synology NAS" : "GitHub"} ·
                  Doporučení
                </span>
              )}
              {full && (
                <div className="recommendation-actions">
                  <Link
                    className="more-link"
                    href={sectionHref(finding.section)}
                  >
                    Otevřít sekci
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    className={`button ${queued.includes(finding.id) ? "secondary" : "primary"}`}
                    onClick={() => toggleTask(finding.id)}
                  >
                    {queued.includes(finding.id) ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                    {queued.includes(finding.id)
                      ? "Odebrat demo úkol"
                      : "Přidat demo úkol"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {full ? (
        <div className="operator-bottom">
          <p className="muted text-sm">
            Pravidlová simulace. Žádné připojení k AI modelu ani automatické
            provádění úkolů.
          </p>
          <button
            className="button secondary"
            disabled={pending}
            onClick={() => refresh(true)}
          >
            <Sparkles size={15} />
            {pending ? "Načítám…" : "Zopakovat DEMO diagnostiku"}
          </button>
        </div>
      ) : (
        <Link className="operator-link" href="/operator">
          Otevřít AI operátora{" "}
          <span>
            {diagnostics.length}
            <ArrowRight size={16} />
          </span>
        </Link>
      )}
    </Panel>
  );
}

export function StoragePanel({ detailed = false }: { detailed?: boolean }) {
  const {
    snapshot: { nas },
  } = useControl();
  const percent = Math.round((nas.usedTb / nas.capacityTb) * 100);
  return (
    <Panel className="storage-panel">
      <PanelHeading
        title="Místo pro všechno důležité"
        subtitle={`${nas.model} · DEMO`}
        action={detailed ? <DemoBadge /> : <MoreLink href="/nas" />}
      />
      <div className="storage-body">
        <div
          className="storage-ring"
          style={{
            background: `conic-gradient(from 215deg, #ee97a6 0% 42%, #a797d9 42% 62%, #798eab 62% 72%, #292a31 72% 100%)`,
          }}
          role="img"
          aria-label={`DEMO úložiště: využito ${percent} procent`}
        >
          <div>
            <HardDrive size={19} />
            <strong>
              {percent}
              <small>%</small>
            </strong>
            <span>využito</span>
          </div>
        </div>
        <div className="storage-summary">
          <strong>
            {nas.usedTb.toLocaleString("cs-CZ")}{" "}
            <small>TB / {nas.capacityTb} TB</small>
          </strong>
          <span>Využitá kapacita</span>
          <div className="storage-legend">
            {nas.storage.map((item) => (
              <div key={item.name}>
                <span>
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
                <strong>{item.tb.toLocaleString("cs-CZ")} TB</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="storage-footer">
        <span>
          <ShieldCheck size={14} />
          Poslední demo záloha
        </span>
        <strong>03:00 · Dokončeno</strong>
      </div>
      {detailed && (
        <div className="storage-details">
          <ProgressBar value={percent} label="Využití úložiště" />
          <p>
            Zbývá{" "}
            {(nas.capacityTb - nas.usedTb).toLocaleString("cs-CZ", {
              maximumFractionDigits: 2,
            })}{" "}
            TB využitelné kapacity. Čtyři 4TB disky, modelové pole SHR s
            ochranou jednoho disku.
          </p>
        </div>
      )}
    </Panel>
  );
}

export function EventsPanel() {
  const { snapshot } = useControl();
  return (
    <Panel className="events-panel">
      <PanelHeading
        title="Poslední aktivita"
        subtitle="Malé události, velký přehled"
        action={<DemoBadge />}
      />
      <div className="event-list">
        {snapshot.events.map((event) => (
          <Link
            className="event"
            href={sectionHref(event.section)}
            key={event.id}
          >
            <span className={`event-icon ${event.health}`}>
              {event.health === "healthy" ? (
                <Check size={13} />
              ) : (
                <CircleAlert size={13} />
              )}
            </span>
            <span>
              <strong>{event.title}</strong>
              <small>{event.detail}</small>
            </span>
            <time>{event.time}</time>
          </Link>
        ))}
      </div>
      <div className="event-footer">
        <Clock3 size={13} />
        Historie z demo snímku · 8. listopadu 2026
      </div>
    </Panel>
  );
}

export function ServiceSummary() {
  const { snapshot } = useControl();
  const items = [
    {
      section: "github" as const,
      label: "GitHub",
      value: String(snapshot.projects.length),
      unit: "projekty",
      detail: `${snapshot.pullRequests.length} otevřené Pull Requesty`,
      health: "healthy" as const,
      status: "Aktivní",
      caption: "Prostor pro tvoje nápady",
    },
    {
      section: "supabase" as const,
      label: "Supabase",
      value: `${snapshot.databases.filter((db) => db.health === "healthy").length}`,
      unit: `/ ${snapshot.databases.length} online`,
      detail: "Průměrná odezva 28 ms",
      health: "healthy" as const,
      status: "V pořádku",
      caption: "Data v dobrých rukou",
    },
    {
      section: "nas" as const,
      label: "Synology NAS",
      value: `${Math.round((snapshot.nas.usedTb / snapshot.nas.capacityTb) * 100)}`,
      unit: "% využito",
      detail: "1 disk vyžaduje pozornost",
      health: "warning" as const,
      status: "Pozornost",
      caption: "Domov pro tvá data",
    },
    {
      section: "devices" as const,
      label: "Zařízení",
      value: `${snapshot.devices.length}`,
      unit: "zařízení",
      detail: "Integrace připravujeme",
      health: "planned" as const,
      status: "Brzy",
      caption: "Propojená domácnost",
    },
  ];
  return (
    <div className="summary-grid">
      {items.map((item) => (
        <Link
          href={sectionHref(item.section)}
          key={item.section}
          className="summary-card"
        >
          <div className="summary-top">
            <ServiceIcon section={item.section} />
            <HealthBadge health={item.health} label={item.status} />
          </div>
          <h2>
            {item.label}
            <span className="tiny-demo">DEMO</span>
          </h2>
          <p className="summary-caption">{item.caption}</p>
          <div className="summary-value">
            {item.value}
            <span>{item.unit}</span>
          </div>
          <div className={`summary-detail ${item.health}`}>
            <span>
              {item.health === "warning" ? (
                <CircleAlert size={13} />
              ) : item.health === "healthy" ? (
                <span className="status-dot" />
              ) : (
                <Clock3 size={13} />
              )}{" "}
              {item.detail}
            </span>
            <ChevronRight size={15} />
          </div>
        </Link>
      ))}
    </div>
  );
}
