# PIGTOGRAM CONTROL

Osobní digitální velín v češtině. První funkční verze používá **výhradně DEMO data**. Žádná externí služba není připojena, nejsou potřeba žádné klíče a AI operátor nic automaticky neprovádí.

## Spuštění

Požadavky: Node.js 22 nebo novější (ověřeno na Node.js 24), npm a Git.

```bash
git clone https://github.com/romanolsak7-sudo/pigtogram-control.git
cd pigtogram-control
git switch feat/pigtogram-control-demo
npm ci
npm run dev
```

Otevři **http://localhost:3000**. Po sloučení PR už stačí výchozí větev `main`.

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
- `src/lib/control/provider.ts` a `demo-data.ts`: jediný implementovaný poskytovatel; vždy vrací vlastní kopii DEMO snímku.
- `src/lib/control/server.ts`: serverová hranice chráněná importem `server-only`; zde se vybírá poskytovatel. Neexistuje přepínač, který by sám zapnul reálná API.
- `src/app/api/demo/snapshot/route.ts`: pouze GET, generická chyba 503 bez stack trace, zákaz cache. Ostatní metody Next.js odmítá.
- `src/components/control-context.tsx`: sdílená klientská relace, obnova s timeoutem a zachováním posledních dat při chybě. Klient komunikuje pouze s vlastním demo endpointem.
- `src/lib/control/diagnostics.ts`: čisté, testovatelné funkce bez vedlejších efektů.

Před reálnou integrací implementovat autentizaci a autorizaci všech serverových vstupů, samostatné adaptéry GitHub/Supabase/Synology, runtime validaci odpovědí, pevně povolené hosty (žádná libovolná URL z klienta), timeouty a limity, read-only oprávnění a redakci logů. Tajné klíče ukládat pouze na serveru, nikdy do `NEXT_PUBLIC_*`, DTO, klientského stavu ani repozitáře. U Supabase nikdy nezpřístupnit `service_role` v prohlížeči; případná uživatelská data musí mít vhodné RLS.

Zápisové operace mají vyžadovat samostatný návrh, validaci, oprávnění a explicitní potvrzení. V této verzi nejsou implementované. Aktuální aplikace **nemá přihlášení a není připravena zobrazovat soukromá reálná data**.

Žádná konfigurace automatického nasazení není součástí změny. Nasazení až po schválení vlastníkem.
