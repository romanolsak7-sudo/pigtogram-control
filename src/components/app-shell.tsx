"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Command,
  Info,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { navigation, sectionHref } from "@/lib/control/navigation";
import { useControl } from "./control-context";
import {
  DemoBadge,
  EmptyState,
  Modal,
  PigMark,
  ServiceIcon,
  sectionIcons,
} from "./ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active =
    navigation.find((item) => item.href === pathname) ?? navigation[0];
  const { alerts, snapshot, message, error } = useControl();
  const [dialog, setDialog] = useState<"search" | "alerts" | "settings" | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const searchItems = [
    ...navigation.map((item) => ({
      title: item.label,
      detail: item.description,
      href: item.href,
      section: item.id,
    })),
    ...snapshot.projects.map((project) => ({
      title: project.name,
      detail: project.description,
      href: "/github",
      section: "github" as const,
    })),
    ...snapshot.databases.map((database) => ({
      title: database.name,
      detail: database.region,
      href: "/supabase",
      section: "supabase" as const,
    })),
  ].filter((item) =>
    `${item.title} ${item.detail}`
      .toLocaleLowerCase("cs")
      .includes(query.toLocaleLowerCase("cs")),
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Přejít na obsah
      </a>
      <aside className="sidebar">
        <Link
          href="/"
          className="brand"
          aria-label="PIGTOGRAM CONTROL — přehled"
        >
          <span className="brand-mark">
            <PigMark />
          </span>
          <span>
            PIGTOGRAM<small>CONTROL</small>
          </span>
        </Link>
        <button
          className="workspace-switch"
          onClick={() => setDialog("settings")}
        >
          <span className="workspace-avatar">P</span>
          <span>
            Osobní prostor<small>Tvůj digitální velín</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">PRACOVNÍ PROSTOR</div>
        <nav aria-label="Hlavní navigace" className="desktop-nav">
          {navigation.map((item) => {
            const Icon = sectionIcons[item.id];
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active.id === item.id ? "page" : undefined}
                className={`nav-item ${active.id === item.id ? "active" : ""}`}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{item.label}</span>
                {item.id === "operator" && <span className="nav-count">3</span>}
                {item.id === "nas" && <span className="nav-alert" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-side">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <strong>Bezpečný prostor</strong>
            </span>
            <p>
              Objevuj možnosti velínu.
              <br />
              Všechna data jsou demonstrační.
            </p>
            <DemoBadge />
          </div>
          <button className="nav-item" onClick={() => setDialog("settings")}>
            <Settings2 size={18} />
            <span>O aplikaci</span>
            <span className="version">v0.1</span>
          </button>
          <div className="profile">
            <span className="profile-avatar">RO</span>
            <div>
              Osobní velín<small>DEMO účet</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="mobile-brand">
              <PigMark />
            </span>
            <span className="desktop-only">Pracovní prostor</span>
            <span className="desktop-only slash">/</span>
            <strong>{active.label}</strong>
          </div>
          <div className="header-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setQuery("");
                setDialog("search");
              }}
              aria-label="Hledat v aplikaci"
            >
              <Search size={16} />
              <span>Hledat ve velínu…</span>
              <span className="search-key">
                <Command size={11} />
              </span>
            </button>
            <span className="header-divider" />
            <span className="header-demo">
              <span className="status-dot" />
              DEMO režim
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`Upozornění: ${alerts.length}`}
              onClick={() => setDialog("alerts")}
            >
              <Bell size={18} />
              {alerts.length > 0 && <i />}
            </button>
            <span className="header-avatar" aria-hidden="true">
              RO
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="demo-notice">
            <span className="flex items-center gap-2.5">
              <span className="demo-notice-icon">
                <Info size={14} />
              </span>
              <strong>Jsi v DEMO režimu.</strong>
              <span className="notice-description">
                Všechna data jsou ukázková. Žádná služba není připojena.
              </span>
            </span>
            <button
              onClick={() => setDialog("settings")}
              aria-label="Více o DEMO režimu"
            >
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div aria-live="polite" role="status">
            {message && (
              <div className="feedback success">
                <Check size={16} />
                {message}
              </div>
            )}
          </div>
          {error && (
            <div className="feedback error" role="alert">
              <Info size={16} />
              {error}
            </div>
          )}
          {children}
          <footer className="content-footer">
            <span>
              <span className="footer-dot" /> PIGTOGRAM CONTROL{" "}
              <span className="footer-separator">/</span> Všechno má své místo.
            </span>
            <span>
              Vytvořeno pro klid v digitálním světě. <DemoBadge />
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobilní navigace">
        {navigation.map((item) => {
          const Icon = sectionIcons[item.id];
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={active.id === item.id ? "page" : undefined}
              className={active.id === item.id ? "active" : ""}
            >
              <Icon size={20} />
              <span>
                {item.id === "nas"
                  ? "NAS"
                  : item.id === "operator"
                    ? "AI operátor"
                    : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {dialog === "search" && (
        <Modal
          title="Najdi své místo ve velínu"
          onClose={() => setDialog(null)}
        >
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Projekt, služba nebo sekce…"
              aria-label="Vyhledávání"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Vymazat hledání">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="search-results">
            {searchItems.length ? (
              searchItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="search-result"
                  onClick={() => setDialog(null)}
                >
                  <ServiceIcon section={item.section} small />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <EmptyState
                title="Tady je zatím ticho"
                description="Zkus jiný název projektu nebo služby."
              />
            )}
          </div>
        </Modal>
      )}
      {dialog === "alerts" && (
        <Modal
          title="Co potřebuje tvoji pozornost"
          onClose={() => setDialog(null)}
        >
          <p className="muted mb-5">Upozornění z demonstračního snímku.</p>
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              className="alert-result"
              href={sectionHref(alert.section)}
              onClick={() => setDialog(null)}
            >
              <ServiceIcon section={alert.section} />
              <span>
                <strong>{alert.title}</strong>
                <p>{alert.description}</p>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </Modal>
      )}
      {dialog === "settings" && (
        <Modal title="Tvůj prostor. Bezpečně." onClose={() => setDialog(null)}>
          <div className="about-mark">
            <Sparkles size={28} />
          </div>
          <p className="modal-lead">
            PIGTOGRAM CONTROL v0.1 spojuje tvůj digitální svět do jednoho
            přehledu.
          </p>
          <div className="info-block">
            <ShieldCheck size={19} />
            <div>
              <strong>Výhradně demonstrační data</strong>
              <p>
                GitHub, Supabase, NAS i zařízení jsou simulované. Aplikace nečte
                reálné projekty a neprovádí žádné vzdálené změny.
              </p>
            </div>
          </div>
          <div className="info-block">
            <Settings2 size={19} />
            <div>
              <strong>Integrace přijdou později</strong>
              <p>
                Tato verze nepřijímá tajné klíče. Připojení služeb vyžaduje
                samostatnou implementaci zabezpečení a tvé schválení.
              </p>
            </div>
          </div>
          <p className="muted text-sm mt-5">
            Demo úkoly a historie diagnostik zůstávají pouze v paměti otevřené
            aplikace. Obnovení stránky je vymaže.
          </p>
          <button
            className="button primary w-full mt-6"
            onClick={() => setDialog(null)}
          >
            Zpět do velínu
          </button>
        </Modal>
      )}
    </div>
  );
}
