"use client";

import { useEffect, useId, useRef } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  Database,
  GitBranch,
  GitFork,
  HardDrive,
  LayoutDashboard,
  MonitorSmartphone,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Health, Section } from "@/lib/control/types";

export const sectionIcons = {
  overview: LayoutDashboard,
  github: GitFork,
  supabase: Zap,
  nas: HardDrive,
  devices: MonitorSmartphone,
  operator: Bot,
};

export function PigMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="m9 17-1-9 10 5m13 4 1-9-10 5" fill="currentColor" />
      <ellipse cx="20" cy="23" rx="15" ry="12" fill="currentColor" />
      <rect x="11" y="21" width="18" height="11" rx="5.5" fill="#ec94a4" />
      <path
        d="M16 25v3m8-3v3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DemoBadge() {
  return <span className="demo-badge">DEMO</span>;
}

export function HealthBadge({
  health,
  label,
}: {
  health: Health;
  label?: string;
}) {
  const labels: Record<Health, string> = {
    healthy: "V pořádku",
    warning: "Pozornost",
    offline: "Offline",
    planned: "Plánováno",
  };
  return (
    <span className={`health-badge ${health}`}>
      <span className="status-dot" />
      {label ?? labels[health]}
    </span>
  );
}

export function ServiceIcon({
  section,
  small = false,
}: {
  section: Section;
  small?: boolean;
}) {
  const Icon = sectionIcons[section];
  return (
    <span className={`service-icon ${section} ${small ? "small" : ""}`}>
      <Icon size={small ? 17 : 21} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHeading({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function MoreLink({
  href,
  children = "Zobrazit vše",
}: {
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link className="more-link" href={href}>
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  );
}

export function ProgressBar({
  value,
  color = "var(--accent)",
  label,
}: {
  value: number;
  color?: string;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
        }}
      />
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="flex items-center justify-between gap-4">
          <DemoBadge />
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Zavřít dialog"
          >
            <X size={20} />
          </button>
        </div>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <Activity size={26} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export { Activity, ArrowUpRight, Check, ChevronRight, Database, GitBranch };
