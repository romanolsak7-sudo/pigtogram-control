import Link from "next/link";
import { authConfigured } from "@/lib/auth/config";
import { LoginButton } from "@/components/private/login-button";
import styles from "@/components/private/private.module.css";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = authConfigured();
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>PIGTOGRAM CONTROL · 2.0</p>
      <h1>Vstup do osobního velínu</h1>
      <p className={styles.lead}>
        Chráněný přehled je přístupný pouze vlastníkovi.
      </p>
      <section className={styles.card}>
        <h2>GitHub pilot</h2>
        <p>
          V této verzi se zobrazují pouze simulované odpovědi API. Skutečný
          GitHub token není připojen.
        </p>
        {configured ? (
          <LoginButton />
        ) : (
          <p role="status">
            Přihlášení zatím není nastavené. Veřejné DEMO funguje bez
            přístupových údajů.
          </p>
        )}
        <Link href="/" prefetch={false} className={styles.link}>
          Otevřít veřejné DEMO →
        </Link>
      </section>
    </main>
  );
}
