import { afterEach, describe, expect, it, vi } from "vitest";
import { createControlProvider } from "../src/lib/control/provider";
import {
  getAlerts,
  getDiagnostics,
  toggleQueuedTask,
} from "../src/lib/control/diagnostics";

afterEach(() => vi.restoreAllMocks());

describe("DEMO data boundary", () => {
  it("serves demo data without network access", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network is forbidden"));
    const provider = createControlProvider();
    const snapshot = await provider.getSnapshot();
    expect(snapshot.mode).toBe("demo");
    expect(snapshot.projects).toHaveLength(4);
    expect(snapshot.databases).toHaveLength(2);
    expect(snapshot.nas.disks).toHaveLength(4);
    expect(snapshot.devices).toHaveLength(6);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["live", "production", "", "DEMO"])(
    "rejects unsupported mode %j",
    (mode) => {
      expect(() => createControlProvider(mode)).toThrow("supports DEMO only");
    },
  );

  it("isolates returned snapshots between requests", async () => {
    const provider = createControlProvider();
    const first = await provider.getSnapshot();
    first.projects[0].tests.passed = -1;
    first.nas.disks.pop();
    const second = await provider.getSnapshot();
    expect(second.projects[0].tests.passed).toBe(24);
    expect(second.nas.disks).toHaveLength(4);
  });
});

describe("demo diagnostics", () => {
  it("distinguishes urgent findings from a capacity suggestion", async () => {
    const snapshot = await createControlProvider().getSnapshot();
    const findings = getDiagnostics(snapshot);
    expect(findings.map((finding) => finding.id)).toEqual([
      "disk-Disk 3",
      "tests-home",
      "storage",
    ]);
    expect(getAlerts(snapshot)).toHaveLength(2);
    expect(getAlerts(snapshot).some((alert) => alert.id === "storage")).toBe(
      false,
    );
  });

  it("produces no findings for a healthy snapshot", async () => {
    const snapshot = await createControlProvider().getSnapshot();
    snapshot.nas.disks = snapshot.nas.disks.map((disk) => ({
      ...disk,
      health: "healthy",
      temperatureC: 34,
    }));
    snapshot.projects = snapshot.projects.map((project) => ({
      ...project,
      tests: {
        ...project.tests,
        status: "passed",
        passed: project.tests.total,
      },
    }));
    snapshot.nas.usedTb = 2;
    expect(getDiagnostics(snapshot)).toEqual([]);
    expect(getAlerts(snapshot)).toEqual([]);
  });

  it("detects high temperature even if the health label is healthy", async () => {
    const snapshot = await createControlProvider().getSnapshot();
    snapshot.nas.disks[0].temperatureC = 40;
    expect(
      getDiagnostics(snapshot).some((finding) => finding.id === "disk-Disk 1"),
    ).toBe(true);
  });

  it("keeps the task queue local, reversible, and limited to known findings", async () => {
    const findings = getDiagnostics(
      await createControlProvider().getSnapshot(),
    );
    const initial: string[] = [];
    const queued = toggleQueuedTask(initial, "storage", findings);
    expect(initial).toEqual([]);
    expect(queued).toEqual(["storage"]);
    expect(toggleQueuedTask(queued, "storage", findings)).toEqual([]);
    expect(toggleQueuedTask(queued, "arbitrary-command", findings)).toEqual([
      "storage",
    ]);
  });
});
