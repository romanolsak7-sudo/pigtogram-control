"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-screen">
      <span className="demo-badge">DEMO</span>
      <h1>Velín se nepodařilo načíst.</h1>
      <p>Zkus načtení zopakovat. Aplikace podporuje pouze režim DEMO.</p>
      <button className="button primary" onClick={reset}>
        Zkusit znovu
      </button>
    </main>
  );
}
