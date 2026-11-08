"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Cpu,
  GitPullRequest,
  HardDrive,
  Lightbulb,
  Radio,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import type {
  DatabaseProject,
  Device,
  Disk,
  PullRequest,
} from "@/lib/control/types";
import { useControl } from "./control-context";
import { PageHeading } from "./page-heading";
import {
  DemoBadge,
  EmptyState,
  HealthBadge,
  Modal,
  Panel,
  PanelHeading,
  ProgressBar,
  ServiceIcon,
} from "./ui";
import { OperatorPanel, ProjectsPanel, StoragePanel } from "./widgets";

export function GithubSection() {
  const { snapshot } = useControl();
  const [tab, setTab] = useState<"projects" | "pulls" | "tests">("projects");
  const [selected, setSelected] = useState<PullRequest | null>(null);
  return (
    <>
      <PageHeading section="github" />
      <div className="section-tabs" aria-label="GitHub přehled">
        <button
          aria-pressed={tab === "projects"}
          className={tab === "projects" ? "active" : ""}
          onClick={() => setTab("projects")}
        >
          Projekty <span>{snapshot.projects.length}</span>
        </button>
        <button
          aria-pressed={tab === "pulls"}
          className={tab === "pulls" ? "active" : ""}
          onClick={() => setTab("pulls")}
        >
          Pull Requesty <span>{snapshot.pullRequests.length}</span>
        </button>
        <button
          aria-pressed={tab === "tests"}
          className={tab === "tests" ? "active" : ""}
          onClick={() => setTab("tests")}
        >
          Testy <span>{snapshot.projects.length}</span>
        </button>
      </div>
      {tab === "projects" && <ProjectsPanel full />}
      {tab === "pulls" && (
        <Panel>
          <PanelHeading
            title="Otevřené Pull Requesty"
            subtitle="Ukázkové změny čekající na další krok"
            action={<DemoBadge />}
          />
          <div className="pull-list">
            {snapshot.pullRequests.map((pull) => (
              <button
                key={pull.id}
                className="pull-row"
                onClick={() => setSelected(pull)}
              >
                <span className={`pull-icon ${pull.status}`}>
                  <GitPullRequest size={20} />
                </span>
                <span className="grow">
                  <strong>{pull.title}</strong>
                  <small>
                    {
                      snapshot.projects.find(
                        (project) => project.id === pull.projectId,
                      )?.name
                    }{" "}
                    · #{pull.id}
                  </small>
                </span>
                <span className="pr-status">
                  {pull.status === "review"
                    ? "Čeká na review"
                    : pull.status === "checks"
                      ? "Kontrola testů"
                      : "Koncept"}
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </Panel>
      )}
      {tab === "tests" && (
        <Panel>
          <PanelHeading
            title="Poslední běhy testů"
            subtitle="Simulované výsledky CI · bez spuštění GitHub Actions"
            action={<DemoBadge />}
          />
          <div className="test-list">
            {snapshot.projects.map((project) => (
              <div className="test-row" key={project.id}>
                <span
                  className={`event-icon ${project.tests.status === "passed" ? "healthy" : "warning"}`}
                >
                  {project.tests.status === "passed" ? (
                    <Check size={16} />
                  ) : (
                    <CircleAlert size={16} />
                  )}
                </span>
                <div className="grow">
                  <h3>{project.name}</h3>
                  <p>
                    {project.tests.status === "passed"
                      ? "Všechny testy prošly"
                      : "Jeden test vyžaduje kontrolu"}{" "}
                    · {project.branch}
                  </p>
                </div>
                <strong>
                  {project.tests.passed}/{project.tests.total}
                </strong>
                <span className="muted">{project.tests.duration}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p className="modal-lead">DEMO Pull Request #{selected.id}</p>
          <dl className="detail-grid">
            <div>
              <dt>Větev</dt>
              <dd>{selected.branch}</dd>
            </div>
            <div>
              <dt>Změny</dt>
              <dd>{selected.changes}</dd>
            </div>
          </dl>
          <div className="info-block">
            <GitPullRequest size={20} />
            <p>
              Ukázkový Pull Request slouží k návrhu přehledu. Nelze jej sloučit
              ani komentovat a nemá spojení s reálným repozitářem.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SupabaseSection() {
  const { snapshot } = useControl();
  const [selected, setSelected] = useState<DatabaseProject | null>(null);
  return (
    <>
      <PageHeading section="supabase" />
      <div className="info-strip">
        <ShieldCheck size={17} />
        <span>
          Oba ukázkové projekty jsou dostupné. Jde o DEMO stav bez připojení k
          Supabase.
        </span>
      </div>
      <div className="database-grid">
        {snapshot.databases.map((database) => (
          <Panel key={database.id} className="database-card">
            <div className="flex items-center justify-between">
              <ServiceIcon section="supabase" />
              <HealthBadge health={database.health} label="Online" />
            </div>
            <h2>{database.name}</h2>
            <p>{database.region}</p>
            <div className="database-metrics">
              <div>
                <span>Dostupnost</span>
                <strong>{database.uptime}</strong>
              </div>
              <div>
                <span>Odezva</span>
                <strong>
                  {database.latencyMs}
                  <small> ms</small>
                </strong>
              </div>
              <div>
                <span>Spojení</span>
                <strong>{database.connections}</strong>
              </div>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="muted">Databáze</span>
              <strong>
                {database.usedGb.toLocaleString("cs-CZ")} /{" "}
                {database.capacityGb} GB
              </strong>
            </div>
            <ProgressBar
              value={(database.usedGb / database.capacityGb) * 100}
              color="var(--green)"
              label={`Kapacita databáze ${database.name}`}
            />
            <div className="database-bottom">
              <DemoBadge />
              <button
                className="more-link"
                onClick={() => setSelected(database)}
              >
                Detail projektu
                <ArrowUpRight size={14} />
              </button>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="mt-5">
        <PanelHeading
          title="Připraveno na bezpečné propojení"
          icon={<ShieldCheck size={20} />}
          action={<span className="planned-label">BUDOUCÍ INTEGRACE</span>}
        />
        <div className="architecture-steps">
          <div>
            <span>01</span>
            <h3>Ověřený přístup</h3>
            <p>
              Přihlášení a oprávnění uživatele před přístupem ke skutečným
              metrikám.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Serverové adaptéry</h3>
            <p>Privátní klíče a komunikace se službami zůstanou na serveru.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Pouze potřebná data</h3>
            <p>
              Rozhraní obdrží jen validované údaje o stavu, bez obsahu databází.
            </p>
          </div>
        </div>
      </Panel>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <p className="modal-lead">Ukázkový projekt Supabase · PostgreSQL</p>
          <dl className="detail-grid">
            <div>
              <dt>Region</dt>
              <dd>{selected.region}</dd>
            </div>
            <div>
              <dt>Dostupnost za 30 dní</dt>
              <dd>{selected.uptime}</dd>
            </div>
            <div>
              <dt>Odezva</dt>
              <dd>{selected.latencyMs} ms</dd>
            </div>
            <div>
              <dt>Aktivní spojení</dt>
              <dd>{selected.connections}</dd>
            </div>
          </dl>
          <div className="info-block">
            <Zap size={20} />
            <p>
              Projekt i metriky jsou fiktivní. V této verzi se žádná databáze
              neotevírá, nečte ani nemění.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

export function NasSection() {
  const {
    snapshot: { nas },
  } = useControl();
  const [selected, setSelected] = useState<Disk | null>(null);
  return (
    <>
      <PageHeading section="nas" />
      <div className="nas-top-grid">
        <StoragePanel detailed />
        <Panel>
          <PanelHeading
            title={nas.name}
            subtitle={`${nas.model} · DEMO`}
            icon={<ServiceIcon section="nas" />}
          />
          <dl className="nas-specs">
            <div>
              <dt>Stav systému</dt>
              <dd>
                <HealthBadge health={nas.health} />
              </dd>
            </div>
            <div>
              <dt>Provoz bez přerušení</dt>
              <dd>{nas.uptime}</dd>
            </div>
            <div>
              <dt>Úložný pool</dt>
              <dd>SHR · ochrana 1 disku</dd>
            </div>
            <div>
              <dt>Poslední záloha</dt>
              <dd>{nas.backup}</dd>
            </div>
          </dl>
          <div className="nas-alert">
            <CircleAlert size={18} />
            <div>
              <strong>Disk 3 má zvýšenou teplotu</strong>
              <p>DEMO hodnota 42 °C. Zkontroluj chlazení a proudění vzduchu.</p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="section-label mt-7">
        <span>DISKY A JEJICH ZDRAVÍ</span>
        <DemoBadge />
      </div>
      <div className="disk-grid">
        {nas.disks.map((disk) => (
          <button
            key={disk.id}
            className="disk-card"
            onClick={() => setSelected(disk)}
          >
            <div className="flex items-center justify-between">
              <HardDrive size={26} strokeWidth={1.4} />
              <HealthBadge health={disk.health} />
            </div>
            <h3>{disk.id}</h3>
            <p>
              {disk.model} · {disk.capacityTb} TB
            </p>
            <div className={`disk-temperature ${disk.health}`}>
              <Thermometer size={17} />
              <strong>{disk.temperatureC} °C</strong>
              <span>DEMO</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <Modal
          title={`${selected.id} · ${selected.model}`}
          onClose={() => setSelected(null)}
        >
          <div className="flex items-center justify-between my-5">
            <HealthBadge health={selected.health} />
            <span className="muted">Ukázková telemetrie</span>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Kapacita disku</dt>
              <dd>{selected.capacityTb} TB</dd>
            </div>
            <div>
              <dt>Teplota</dt>
              <dd>{selected.temperatureC} °C</dd>
            </div>
          </dl>
          <div className="info-block">
            <HardDrive size={20} />
            <p>
              {selected.detail}. Údaje jsou demonstrační; žádné spojení s NAS
              není aktivní.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

const deviceIcons = {
  light: Lightbulb,
  sensor: Radio,
  climate: Thermometer,
  hub: Cpu,
};

export function DevicesSection() {
  const { snapshot } = useControl();
  const [room, setRoom] = useState("all");
  const [selected, setSelected] = useState<Device | null>(null);
  const rooms = [...new Set(snapshot.devices.map((device) => device.room))];
  const devices = snapshot.devices.filter(
    (device) => room === "all" || device.room === room,
  );
  return (
    <>
      <PageHeading section="devices" />
      <div className="future-banner">
        <span className="future-icon">
          <Wifi size={28} />
        </span>
        <div>
          <span className="eyebrow">DALŠÍ KAPITOLA TVÉHO VELÍNU</span>
          <h2>Domácnost, která bude součástí přehledu.</h2>
          <p>
            Zatím jen ukázkový inventář. Připojení a ovládání zařízení přidáme v
            další verzi.
          </p>
        </div>
        <span className="planned-label">PŘIPRAVUJEME</span>
      </div>
      <div className="devices-toolbar">
        <h2>
          Ukázková zařízení <span>{snapshot.devices.length}</span>
        </h2>
        <select
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          aria-label="Filtrovat podle místnosti"
        >
          <option value="all">Všechny místnosti</option>
          {rooms.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      <div className="device-grid">
        {devices.map((device) => {
          const Icon = deviceIcons[device.kind];
          return (
            <button
              className="device-card"
              key={device.id}
              onClick={() => setSelected(device)}
            >
              <div className="flex justify-between items-center">
                <span className={`device-icon ${device.kind}`}>
                  <Icon size={24} />
                </span>
                <DemoBadge />
              </div>
              <h3>{device.name}</h3>
              <p>{device.room}</p>
              <div className="device-card-bottom">
                <span>{device.protocol}</span>
                <span>
                  <Clock3 size={12} />
                  Plánováno
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <p className="modal-lead">
            {selected.room} · {selected.protocol}
          </p>
          <div className="info-block">
            <Wifi size={20} />
            <div>
              <strong>Budoucí integrace</strong>
              <p>
                Toto zařízení je fiktivní a není připojeno. Párování, ovládání
                ani změny nastavení nejsou v DEMO verzi dostupné.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function OperatorSection() {
  const { queued, runs, diagnostics, toggleTask } = useControl();
  return (
    <>
      <PageHeading section="operator" />
      <div className="operator-page-grid">
        <OperatorPanel full />
        <div className="space-y-5">
          <Panel>
            <PanelHeading
              title="Tvoje demo úkoly"
              subtitle="Platí pouze v této otevřené aplikaci"
              action={<span className="count-pill">{queued.length}</span>}
            />
            {queued.length ? (
              <div className="queued-tasks">
                {diagnostics
                  .filter((finding) => queued.includes(finding.id))
                  .map((finding) => (
                    <div key={finding.id}>
                      <span className="task-checkbox">
                        <Check size={14} />
                      </span>
                      <p>
                        {finding.action}
                        <small>DEMO · Čeká na ruční provedení</small>
                      </p>
                      <button
                        className="more-link"
                        onClick={() => toggleTask(finding.id)}
                      >
                        Odebrat
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="Prostor pro další krok"
                description="Vyber doporučení a přidej ho mezi demo úkoly. Nic se nespustí automaticky."
              />
            )}
            <div role="status" className="panel-bottom">
              <ShieldCheck size={14} />
              {queued.length} úkolů v paměti · žádné vzdálené akce
            </div>
          </Panel>
          <Panel>
            <PanelHeading
              title="Historie diagnostik"
              subtitle="Výsledky aktuální relace"
              action={<DemoBadge />}
            />
            {runs.length ? (
              <div className="run-list">
                {runs.map((run) => (
                  <div key={run.id}>
                    <span className="event-icon healthy">
                      <Check size={14} />
                    </span>
                    <span>
                      <strong>DEMO diagnostika dokončena</strong>
                      <small>
                        {run.findings} doporučení · {run.time}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="První pohled pod povrch"
                description="Spusť DEMO diagnostiku a její výsledek se objeví zde."
              />
            )}
          </Panel>
          <div className="operator-disclaimer">
            <Sparkles size={17} />
            <p>
              AI operátor v této verzi používá pevná pravidla nad demo daty.
              Neposílá data modelům a nespouští příkazy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
