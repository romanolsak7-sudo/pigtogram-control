"use client";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  githubSnapshotSchema,
  workflowLabel,
  type GitHubSnapshot,
  type Resource,
} from "@/lib/github/schema";
import styles from "./private.module.css";

const logoutKey = "pigtogram:logout";
const isHidden = () => document.visibilityState === "hidden";
const formatTime = (time: string | null) =>
  time
    ? new Intl.DateTimeFormat("cs-CZ", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Europe/Prague",
      }).format(new Date(time))
    : "neověřeno";

function Provenance({ resource }: { resource: Resource<unknown> }) {
  return (
    <div className={styles.provenance}>
      <strong>
        {resource.source === "fixture" ? "SIMULOVANÉ API" : "GITHUB"}
      </strong>
      <span>
        {resource.state === "fresh"
          ? "Načteno"
          : resource.state === "stale"
            ? "Starší údaje"
            : "Neověřeno"}{" "}
        · {formatTime(resource.checkedAt)}
      </span>
      {!resource.complete && resource.data !== null && (
        <span>Výběr záznamů · nejde o úplnou historii</span>
      )}
      {resource.error && (
        <span role="status">
          {resource.error === "RATE_LIMIT"
            ? "Dosažen limit požadavků"
            : "Aktuální stav není dostupný"}
        </span>
      )}
    </div>
  );
}

export function PrivateGithub() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<GitHubSnapshot | null>(null);
  const [message, setMessage] = useState("Ověřuji přístup…");
  const [pending, setPending] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const channel = useRef<BroadcastChannel | null>(null);
  const leaving = useRef(false);

  const invalidate = useCallback((synchronous = true) => {
    generation.current++;
    request.current?.abort();
    clearTimeout(expiry.current);
    // Hide before history/BFCache capture; clearing React state alone is asynchronous.
    if (root.current) root.current.hidden = true;
    const clear = () => {
      setSnapshot(null);
      setPending(false);
      setMessage("Ověřuji přístup…");
    };
    if (synchronous) flushSync(clear);
    else clear();
  }, []);

  const load = useCallback(async () => {
    if (leaving.current || isHidden()) return;
    invalidate(false);
    const version = generation.current;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const response = await fetch("/api/control/github", {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10000),
        ]),
      });
      if (version !== generation.current || leaving.current) return;
      if (response.status === 401 || response.status === 403) {
        leaving.current = true;
        invalidate();
        window.location.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("UNAVAILABLE");
      const next = githubSnapshotSchema.parse(await response.json());
      const expiresAt = Number(
        response.headers.get("X-Pigtogram-Session-Expires"),
      );
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
        throw new Error("EXPIRED");
      if (version !== generation.current || leaving.current || isHidden())
        return;
      setSnapshot(next);
      setMessage("");
      expiry.current = setTimeout(
        () => {
          invalidate();
          setMessage("Přihlášení vypršelo. Přihlas se znovu.");
        },
        Math.min(expiresAt - Date.now(), 3600000),
      );
    } catch {
      if (version === generation.current && !leaving.current)
        setMessage("Přístup nebo data nelze ověřit. Údaje zůstávají skryté.");
    } finally {
      if (version === generation.current) setPending(false);
    }
  }, [invalidate]);

  useLayoutEffect(() => {
    if (snapshot && root.current && !leaving.current)
      root.current.hidden = false;
  }, [snapshot]);

  useEffect(() => {
    leaving.current = false;
    if (pathname === "/control/github") void load();
    const hide = () => invalidate();
    const show = () => {
      if (window.location.pathname === "/control/github") void load();
    };
    const visibility = () =>
      document.visibilityState === "hidden" ? hide() : show();
    const history = () => {
      hide();
      show();
    };
    const lock = () => {
      leaving.current = true;
      invalidate();
      window.location.replace("/login");
    };
    const storage = (event: StorageEvent) => {
      if (event.key === logoutKey) lock();
    };
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(logoutKey);
      channel.current.onmessage = lock;
    }
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    window.addEventListener("popstate", history);
    window.addEventListener("focus", show);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    const interval = setInterval(show, 60000);
    return () => {
      generation.current++;
      request.current?.abort();
      clearTimeout(expiry.current);
      clearInterval(interval);
      if (root.current) root.current.hidden = true;
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("popstate", history);
      window.removeEventListener("focus", show);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pathname, invalidate, load]);

  async function logout() {
    leaving.current = true;
    invalidate();
    channel.current?.postMessage("logout");
    try {
      localStorage.setItem(logoutKey, String(Date.now()));
    } catch {
      /* BroadcastChannel still works. */
    }
    try {
      await signOut({ redirect: false, redirectTo: "/login" });
      const confirmation = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(5000),
      });
      if (!confirmation.ok || (await confirmation.json()) !== null)
        throw new Error("LOGOUT_UNCONFIRMED");
      window.location.replace("/login");
    } catch {
      setMessage(
        "Odhlášení se nepodařilo potvrdit. Data jsou skrytá; zkus Odhlásit znovu.",
      );
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PIGTOGRAM CONTROL · 2.0</p>
          <h1>GitHub přehled</h1>
        </div>
        <div className={styles.actions}>
          <Link
            href="/"
            prefetch={false}
            onClick={() => invalidate()}
            className={styles.link}
          >
            Veřejné DEMO
          </Link>
          <button className={styles.button} onClick={logout}>
            Odhlásit
          </button>
        </div>
      </header>
      <p className={styles.notice}>
        SIMULOVANÉ API · Žádný skutečný repozitář není připojen. Úspěch workflow
        nevypovídá o zdraví celého projektu.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.button}
          disabled={pending || leaving.current}
          onClick={() => void load()}
        >
          {pending ? "Ověřuji…" : "Obnovit přehled"}
        </button>
        <span role="status" aria-live="polite">
          {message}
        </span>
      </div>
      {!snapshot && (
        <p className={styles.lead}>
          Obsah se zobrazí až po ověření přístupu.{" "}
          <a href="/login" className={styles.link}>
            Přihlášení
          </a>
        </p>
      )}
      {snapshot && (
        <div ref={root} data-testid="private-data" className={styles.grid}>
          <section className={styles.card}>
            <h2>Násobilkožrouti</h2>
            <Provenance resource={snapshot.repository} />
            <p>{snapshot.scope}</p>
            {snapshot.repository.data ? (
              <>
                <p>{snapshot.repository.data.description}</p>
                <p>
                  Výchozí větev:{" "}
                  <code>{snapshot.repository.data.defaultBranch}</code>
                </p>
              </>
            ) : (
              <p>Metadata repozitáře nejsou dostupná.</p>
            )}
          </section>
          <section className={styles.card}>
            <h2>Otevřené Pull Requesty</h2>
            <Provenance resource={snapshot.pulls} />
            {snapshot.pulls.data?.map((p) => (
              <article key={p.id} className={styles.record}>
                <h3>
                  #{p.number} · {p.title}
                </h3>
                <p>{p.draft ? "Koncept" : "Otevřený PR"}</p>
                <p>
                  <code>{p.head}</code> → <code>{p.base}</code>
                </p>
                <p>
                  SHA: <code>{p.headSha}</code>
                </p>
              </article>
            ))}
            {snapshot.pulls.data?.length === 0 && (
              <p>Žádné otevřené PR v ověřeném výběru.</p>
            )}
            {!snapshot.pulls.data && <p>Počet PR není ověřený.</p>}
          </section>
          <section className={styles.card}>
            <h2>GitHub Actions</h2>
            <p>Nejvýše 20 posledních běhů napříč větvemi.</p>
            <Provenance resource={snapshot.workflows} />
            {snapshot.workflows.data?.map((run) => (
              <article key={run.id} className={styles.record}>
                <h3>{run.name ?? "Workflow"}</h3>
                <strong>{workflowLabel(run)}</strong>
                <p>
                  Větev: <code>{run.branch ?? "neznámá"}</code> · {run.event} ·
                  pokus {run.attempt}
                </p>
                <p>
                  SHA: <code>{run.sha}</code>
                </p>
                <p>Aktualizace běhu: {formatTime(run.updatedAt)}</p>
              </article>
            ))}
            {snapshot.workflows.data?.length === 0 && (
              <p>Žádné běhy v ověřeném výběru. Stav projektu není ověřen.</p>
            )}
            {!snapshot.workflows.data && (
              <p>Výsledky workflow nejsou dostupné.</p>
            )}
          </section>
          <section className={styles.card}>
            <h2>Poslední commity</h2>
            <p>Nejvýše 5 commitů výchozí větve.</p>
            <Provenance resource={snapshot.commits} />
            {snapshot.commits.data?.map((commit) => (
              <article key={commit.sha} className={styles.record}>
                <h3>{commit.subject}</h3>
                <p>
                  <code>{commit.sha}</code>
                </p>
                <p>{formatTime(commit.committedAt)}</p>
              </article>
            ))}
            {snapshot.commits.data?.length === 0 && (
              <p>Repozitář nemá žádné commity.</p>
            )}
            {!snapshot.commits.data && <p>Historie commitů není dostupná.</p>}
          </section>
        </div>
      )}
    </main>
  );
}
