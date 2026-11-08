// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "../src/components/app-shell";
import { ControlStateProvider } from "../src/components/control-context";
import {
  DevicesSection,
  GithubSection,
  OperatorSection,
} from "../src/components/sections";
import { createControlProvider } from "../src/lib/control/provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/operator" }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderControl(children: React.ReactNode) {
  const snapshot = await createControlProvider().getSnapshot();
  render(
    <ControlStateProvider initialSnapshot={snapshot}>
      <AppShell>{children}</AppShell>
    </ControlStateProvider>,
  );
  return snapshot;
}

describe("DEMO interactions", () => {
  it("filters GitHub projects and switches to Pull Requests", async () => {
    const user = userEvent.setup();
    await renderControl(<GithubSection />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrovat podle testů" }),
      "failed",
    );
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    expect(
      screen.getByRole("button", { name: "Otevřít projekt home-automations" }),
    ).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: "Hledat projekt" }),
      "nonexistent",
    );
    expect(screen.getByText("Žádné odpovídající projekty")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pull Requesty 3" }));
    expect(screen.getByText("Noční režim osvětlení")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("filters the future device inventory by room", async () => {
    const user = userEvent.setup();
    await renderControl(<DevicesSection />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrovat podle místnosti" }),
      "Pracovna",
    );
    expect(
      screen.getByRole("heading", { name: "Pracovní lampa" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Senzor prostředí" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Termostat" })).toBeNull();
  });

  it("adds and removes local tasks, then records a simulated diagnostic run", async () => {
    const user = userEvent.setup();
    const snapshot = await renderControl(<OperatorSection />);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(snapshot));
    await user.click(
      screen.getAllByRole("button", { name: "Přidat demo úkol" })[0],
    );
    expect(
      screen.getByText("Kontrola chlazení a S.M.A.R.T. disku"),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Odebrat" }));
    expect(screen.getByText("Prostor pro další krok")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Spustit diagnostiku" }),
    );
    await waitFor(() =>
      expect(screen.getByText("DEMO diagnostika dokončena")).toBeTruthy(),
    );
    expect(
      screen.getByText("DEMO diagnostika dokončena. Připraveno 3 doporučení."),
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("/api/demo/snapshot");
  });

  it("keeps the last snapshot and allows retry after a failed refresh", async () => {
    const user = userEvent.setup();
    const snapshot = await renderControl(<GithubSection />);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(Response.json(snapshot));
    await user.click(screen.getByRole("button", { name: "Obnovit DEMO data" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Zobrazuji poslední snímek",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Otevřít projekt pigtogram-control" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Obnovit DEMO data" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(
      screen.getByText(
        "DEMO snímek byl znovu načten. Hodnoty zůstávají demonstrační.",
      ),
    ).toBeTruthy();
  });
});
