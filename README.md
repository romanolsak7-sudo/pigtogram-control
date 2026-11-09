# PIGTOGRAM CONTROL

Osobní digitální velín v češtině. Veřejná část používá **výhradně DEMO data**. Žádná externí služba není připojena, pro DEMO nejsou potřeba žádné klíče a AI operátor nic automaticky neprovádí.

Větev 2.0 přidává oddělený chráněný GitHub přehled, Auth.js a testy proti simulovanému API. **Reálný GitHub transport není zapojený a soukromá data nejsou podporovaná.** Podrobnosti a podmínky pozdější aktivace jsou v [bezpečnostním návrhu](docs/control-v2-security.md).

## Spuštění

Požadavky: Node.js 22 nebo novější (ověřeno na Node.js 24), npm a Git.

```bash
git clone https://github.com/romanolsak7-sudo/pigtogram-control.git
cd pigtogram-control
git switch feat/control-v2-github-readonly-foundation
npm ci
npm run dev
```

Otevři **http://localhost:3000**. Tato větev navazuje samostatným Draft PR na nesloučený PR #1.

Pro zobrazení na iPhonu připoj telefon a počítač ke stejné Wi-Fi. V Safari otevři `http://<lokální-IP-počítače>:3000` (např. `http://192.168.1.20:3000`). Server poslouchá na `0.0.0.0`; firewall musí povolit příchozí spojení na port 3000. Není třeba přesměrovávat port na routeru ani aplikaci nasazovat. Rozhraní má mobilní navigaci, podporu safe-area a dotykové ovládání.

Soubor `.env` není potřeba. Volitelná hodnota `PIGTOGRAM_DATA_MODE=demo` je uvedena v `.env.example`. Každý jiný režim je odmítnut.

## Co je funkční

| Adresa               | Funkce                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| `/`                  | Souhrn služeb, graf požadavků/odezvy, projekty, kapacita NAS, aktivita, doporučení |
| `/github`            | Hledání a filtrování projektů, detaily, Pull Requesty a výsledky testů             |
| `/supabase`          | Dostupnost a detaily databází, odezva, spojení a kapacita                          |
| `/nas`               | Úložiště, zálohy, stav a teplota jednotlivých disků, upozornění                    |
| `/devices`           | Ukázkový inventář a filtr místností; skutečné připojení je plánované               |
| `/operator`          | Simulovaná diagnostika, přidání/odebrání demo úkolů a historie běhů                |
| `/api/demo/snapshot` | Read-only GET s označením DEMO a `Cache-Control: no-store`                         |

Globální hledání, upozornění a informace o režimu jsou dostupné v navigaci. Tlačítko Obnovit znovu načte pevný demo snímek, nemění modelové hodnoty. Diagnostika používá deterministická pravidla, nikoli LLM. Graf je fiktivní 24hodinová série, nikoli živá telemetrie. Čas snímku je pevný; čas nového načtení a historie používá `Europe/Prague`.

**Demo úkoly a historie žijí jen v paměti aktuální aplikace.** Přechod mezi sekcemi je zachová, reload stránky je odstraní. Přidání úkolu není provedení operace ani vytvoření GitHub issue.

## Kontroly a lokální produkční režim

```bash
npm run typecheck
npm test
npm run build
npm run test:smoke
npm start
```

`npm run check` provede TypeScript, testy, build a HTTP smoke test za sebou. Smoke test dočasně spustí produkční server na volném loopback portu, ověří všech šest stránek, demo API, zamítnutí POST a neznámou adresu a server ukončí. `npm start` zpřístupní lokální produkční build na http://localhost:3000; předem zastav vývojový server na stejném portu. Build ani start nic nenasazují.

Testy ověřují nulový síťový provoz demo adaptéru, izolaci dat mezi požadavky, odmítnutí reálného režimu, pravidla diagnostiky, správu úkolů a odpovědi API. Fiktivní výsledky CI v rozhraní nejsou výsledky testů této aplikace.

## Architektura a budoucí API

- **Next.js App Router + TypeScript + Tailwind CSS 4.** Lokálně balené fonty Geist; žádné vzdálené fonty, analytika ani externí skripty.
- `src/lib/control/types.ts`: read-only rozhraní poskytovatele a serializovatelný DTO pro UI.
- `src/lib/control/provider.ts` a `demo-data.ts`: původní veřejný poskytovatel; vždy vrací vlastní kopii DEMO snímku.
- `src/lib/control/server.ts`: serverová hranice chráněná importem `server-only`; funkce `getDemoControlSnapshot()` volá pouze DEMO provider. Neexistuje přepínač, který by sám zapnul reálná API.
- `src/app/api/demo/snapshot/route.ts`: pouze GET, generická chyba 503 bez stack trace, zákaz cache. Ostatní metody Next.js odmítá.
- `src/components/control-context.tsx`: sdílená klientská relace, obnova s timeoutem a zachováním posledních dat při chybě. Klient komunikuje pouze s vlastním demo endpointem.
- `src/lib/control/diagnostics.ts`: čisté, testovatelné funkce bez vedlejších efektů.

Před reálnou integrací implementovat autentizaci a autorizaci všech serverových vstupů, samostatné adaptéry GitHub/Supabase/Synology, runtime validaci odpovědí, pevně povolené hosty (žádná libovolná URL z klienta), timeouty a limity, read-only oprávnění a redakci logů. Tajné klíče ukládat pouze na serveru, nikdy do `NEXT_PUBLIC_*`, DTO, klientského stavu ani repozitáře. U Supabase nikdy nezpřístupnit `service_role` v prohlížeči; případná uživatelská data musí mít vhodné RLS.

Zápisové operace mají vyžadovat samostatný návrh, validaci, oprávnění a explicitní potvrzení. V této verzi nejsou implementované. Oddělená část 2.0 má základ přihlášení, ale **není připravena zobrazovat soukromá reálná data**.

Žádná konfigurace automatického nasazení není součástí změny. Nasazení až po schválení vlastníkem.

## Chráněný základ 2.0

- `/login` bez konfigurace vysvětlí nedostupné přihlášení; veřejné DEMO funguje dál.
- `/control/github` a `/api/control/github` vyžadují ověřenou relaci vlastníka. SSR/RSC neobsahuje soukromý snímek.
- Adaptér používá pouze simulované odpovědi pro plánovaný pilot `romanolsak7-sudo/nasobilkozrouti`. GitHub workflow stav vždy nese konkrétní SHA, větev a čas; není hodnocením zdraví projektu.
- Odhlášení revokuje relaci na serveru a maskuje klientský obsah včetně historie a dalších záložek. Registr relací je zatím pouze pro jeden Node proces.
- `npm run test:auth-http` ověří reálný Auth.js tok proti simulovanému poskytovateli po buildu. `npm run test:e2e` navíc vyžaduje Chromium a WebKit. Testovací síťový preload není součástí produkčního spuštění.

Žádná OAuth App, PAT ani soukromý účet nebyly v rámci této změny připojeny. `PIGTOGRAM_GITHUB_SOURCE=live` selže i při přítomném tokenu.
