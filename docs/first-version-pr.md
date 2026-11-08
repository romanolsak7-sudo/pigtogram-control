První verze PIGTOGRAM CONTROL přidává osobní digitální velín v češtině. Všechny projekty, metriky, upozornění a akce jsou výslovně označené DEMO; žádná skutečná služba není připojena.

## Změny

- Next.js App Router, TypeScript, Tailwind CSS a tmavé responzivní rozhraní s navigací pro desktop i iPhone.
- Dashboard a samostatné sekce GitHub, Supabase, Synology NAS, Zařízení a AI operátor.
- Vyhledávání, filtrování, detaily, graf požadavků/odezvy, obnova demo snímku, simulovaná diagnostika a vratná správa lokálních demo úkolů.
- Typovaný read-only poskytovatel, serverová hranice `server-only`, odmítnutí jiného režimu než DEMO, HTTP hlavičky a ošetření chyb načítání.
- Návod ke spuštění, uzamčené verze závislostí a GitHub Actions pouze pro kontrolu, bez nasazení.

## Ověření

- `npm run typecheck`: prošlo.
- `npm test`: 16 testů prošlo, včetně interakcí komponent, chyb načítání a bezpečné datové hranice.
- `npm run build`: prošlo.
- `npm run test:smoke`: všech šest stránek a demo API prošlo; ověřeny bezpečnostní hlavičky, no-store, odmítnutí POST a odpověď 404.
- `npm audit`: 0 zranitelností.
- `npm run format:check`: prošlo.
- Vizuální kontrola v prohlížeči nebyla dokončena: místní preview relay dvakrát skončilo chybou `timed out waiting for relay readiness`. Rozvržení na fyzickém iPhonu ani v Safari zatím nebylo ověřeno. Testy komponent používají jsdom, nikoli skutečný prohlížeč.

## Spuštění a omezení

```bash
npm ci
npm run dev
```

Otevřít http://localhost:3000. iPhone na stejné Wi-Fi: `http://<lokální-IP-počítače>:3000`. Podrobnosti v README.

Diagnostika používá pevná pravidla, nikoli skutečný AI model. Demo úkoly a historie přežijí přechod mezi sekcemi, ale resetují se obnovením stránky. Aplikace nemá autentizaci; skutečné privátní integrace vyžadují další implementaci popsanou v README.

Nebyly vyžádány ani použity produkční klíče, nebyly upraveny jiné repozitáře a nebylo provedeno žádné nasazení.
