import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-screen">
      <span className="eyebrow">404 · MIMO SIGNÁL</span>
      <h1>Tady žádná sekce není.</h1>
      <p>Vrať se do svého digitálního velínu.</p>
      <Link className="button primary" href="/">
        Zpět na přehled
      </Link>
    </main>
  );
}
