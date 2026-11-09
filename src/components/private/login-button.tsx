"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./private.module.css";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        className={styles.button}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            await signIn("github", { redirectTo: "/control/github" });
          } catch {
            setError(true);
            setPending(false);
          }
        }}
      >
        {pending ? "Otevírám přihlášení…" : "Přihlásit přes GitHub"}
      </button>
      {error && <p role="alert">Přihlášení se nepodařilo otevřít.</p>}
    </div>
  );
}
