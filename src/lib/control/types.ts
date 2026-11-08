export type Section =
  "overview" | "github" | "supabase" | "nas" | "devices" | "operator";
export type Health = "healthy" | "warning" | "offline" | "planned";
export type TestStatus = "passed" | "failed" | "running";

export interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  color: string;
  branch: string;
  updated: string;
  tests: {
    status: TestStatus;
    passed: number;
    total: number;
    duration: string;
  };
}

export interface PullRequest {
  id: number;
  projectId: string;
  title: string;
  branch: string;
  status: "review" | "draft" | "checks";
  changes: string;
}

export interface DatabaseProject {
  id: string;
  name: string;
  region: string;
  health: Health;
  latencyMs: number;
  usedGb: number;
  capacityGb: number;
  connections: number;
  uptime: string;
}

export interface Disk {
  id: string;
  model: string;
  health: Health;
  temperatureC: number;
  capacityTb: number;
  detail: string;
}

export interface Device {
  id: string;
  name: string;
  room: string;
  kind: "light" | "sensor" | "climate" | "hub";
  protocol: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  section: Section;
  severity: "warning" | "info";
}

export interface Diagnostic {
  id: string;
  title: string;
  description: string;
  action: string;
  section: Section;
  priority: "medium" | "low";
}

// A safe, serializable DTO. Provider credentials and raw API responses never belong here.
export interface ControlSnapshot {
  mode: "demo";
  observedAt: string;
  projects: Project[];
  pullRequests: PullRequest[];
  databases: DatabaseProject[];
  nas: {
    name: string;
    model: string;
    usedTb: number;
    capacityTb: number;
    health: Health;
    uptime: string;
    backup: string;
    disks: Disk[];
    storage: { name: string; tb: number; color: string }[];
  };
  devices: Device[];
  activity: { label: string; requests: number; latency: number }[];
  events: {
    id: string;
    title: string;
    detail: string;
    time: string;
    section: Section;
    health: Health;
  }[];
}

// Future adapters must implement this read-only contract on the server.
export interface ControlProvider {
  readonly mode: "demo";
  getSnapshot(): Promise<ControlSnapshot>;
}
