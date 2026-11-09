// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
vi.mock("next/navigation", () => ({ usePathname: () => "/control/github" }));
vi.mock("next/link", () => ({
  default: ({
    prefetch: _prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => <a {...props} />,
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
import { signOut } from "next-auth/react";
import { PrivateGithub } from "../src/components/private/github";
import { createAuthorizedGithubService } from "../src/lib/github/service";
import { fixtureTransport } from "../src/lib/github/fixture";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function setup() {
  window.history.replaceState({}, "", "/control/github");
  const snapshot = await createAuthorizedGithubService({
    authorize: async () => ({
      id: "42",
      sessionId: "view-test",
      expiresAt: Date.now() + 3600000,
    }),
    transport: fixtureTransport,
  })();
  const response = () =>
    Response.json(snapshot, {
      headers: { "X-Pigtogram-Session-Expires": String(Date.now() + 3600000) },
    });
  const fetcher = vi.fn(async () => response());
  vi.stubGlobal("fetch", fetcher);
  render(<PrivateGithub />);
  await screen.findByTestId("private-data");
  return { response, fetcher };
}

it("removes private DOM synchronously before a history snapshot", async () => {
  await setup();
  act(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
  });
  expect(screen.queryByTestId("private-data")).toBeNull();
  expect(document.body.textContent).not.toContain(
    "UKÁZKA — bezpečný pohyb hada",
  );
});

it("does not restore a late response after pagehide even when abort is ignored", async () => {
  const { fetcher, response } = await setup();
  let finish!: (value: Response) => void;
  fetcher.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Obnovit přehled" }));
  act(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
  });
  await act(async () => {
    finish(response());
  });
  expect(screen.queryByTestId("private-data")).toBeNull();
});

it("reauthorizes after pageshow and keeps data hidden on network failure", async () => {
  const { fetcher } = await setup();
  act(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
  });
  fetcher.mockRejectedValueOnce(new Error("offline"));
  act(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  await screen.findByText(
    "Přístup nebo data nelze ověřit. Údaje zůstávají skryté.",
  );
  expect(screen.queryByTestId("private-data")).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("keeps data hidden after failed logout and prevents focus from reopening it", async () => {
  const { fetcher } = await setup();
  vi.mocked(signOut).mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Odhlásit" }));
  await screen.findByText(/Odhlášení se nepodařilo potvrdit/);
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(screen.queryByTestId("private-data")).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("reveals a newly verified response after refresh without leaving hidden DOM", async () => {
  const { fetcher } = await setup();
  fireEvent.click(screen.getByRole("button", { name: "Obnovit přehled" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect((await screen.findByTestId("private-data")).hidden).toBe(false);
});
