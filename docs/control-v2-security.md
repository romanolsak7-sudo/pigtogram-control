# CONTROL 2.0: bezpečnostní základ a simulovaný GitHub

Tato změna je samostatný Draft PR nad větví `feat/pigtogram-control-demo` (PR #1, výchozí commit `dd477011`). Nemění ani neslučuje původní PR. **Není připravena pro soukromá reálná data ani produkční nasazení.**

## Rozsah a oddělení dat

| Vstup                                                         | Datová funkce                               | Přístup a původ                                                      |
| ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `/`, `/github`, ostatní původní stránky, `/api/demo/snapshot` | `getDemoControlSnapshot()`                  | Veřejný pevný DEMO provider; žádný import privátního adaptéru        |
| `/login`, `/api/auth/*`                                       | Auth.js + GitHub OAuth                      | Identita vlastníka, nikoli oprávnění k repozitářům                   |
| `/control/github`                                             | `requireOwnerSession()` v layoutu i stránce | SSR/RSC obsahuje pouze prázdný klientský obal, žádný soukromý snímek |
| `/api/control/github`                                         | `getPrivateGithubSnapshot()`                | Autorizace před každým čtením a návratem; pouze `fixture`            |

Pilotní rozsah je napevno `romanolsak7-sudo/nasobilkozrouti`. Jde o návrh budoucího připojení; zobrazená PR, SHA, workflow a commity jsou smyšlené a označené „SIMULOVANÉ API“. Klient nemůže změnit repozitář ani URL parametrem. Není implementován seznam všech uživatelových repozitářů.

`PIGTOGRAM_GITHUB_SOURCE=live` vrací 503. Přidání PAT do prostředí nic nezapne. Produkční kód nemá síťový transport pro čtení repozitáře; služba dostává výhradně `fixtureTransport`. Veřejný provider nikdy nepřepíná na privátní.

## Identita a autorizace

- Auth.js `next-auth@5.0.0-beta.32`, přesně připnutá verze. Jde stále o beta závislost; před reálným provozem znovu posoudit vydání a bezpečnostní upozornění.
- Samostatná GitHub OAuth App slouží pouze k přihlášení. Požadovaný scope je prázdný, bez `repo` a `user:email`; profil redukujeme na stabilní číselné `id`. Přístup povoluje pouze `PIGTOGRAM_OWNER_GITHUB_ID`, nikoli jméno, e-mail či login.
- Auth.js ověřuje state, PKCE S256 a CSRF; cookie je HttpOnly, SameSite=Lax, na HTTPS Secure. Kanonická `AUTH_URL` je povinná; HTTP je povoleno pouze na loopbacku. Kontrolujeme Host, případné forwarding hlavičky a Origin u POST. Proxy musí zachovat nastavený veřejný Host a protokol; odlišná konfigurace je odmítnuta.
- OAuth access token se použije pouze serverově pro `/user`, nekopíruje se do session, JWT, DTO ani logů. Callback vrací jen ID, ID relace a absolutní expiraci. Přesměrování je omezeno na vlastní `/login` a `/control/github`.
- Přístup kontroluje layout, stránka, API, datová služba, čtení cache, každý transportní požadavek i dokončení celého snímku. Autorizace se necachuje. Chyba autorizace nikdy nevede k vrácení staršího snímku.

## Relace, odhlášení a historie

Šifrovaná Auth.js cookie je doplněna serverovým registrem aktivních náhodných ID relací. Odhlášení ID okamžitě zneplatní; opětovné použití staré cookie selže. Absolutní platnost je jedna hodina, nejvýše 100 aktivních relací. Restart procesu všechny relace zneplatní.

**Registr a cache jsou v paměti jednoho Node procesu.** Tento základ je určen k lokálnímu fixture pilotu. Před více instancemi, serverless provozem nebo reálnými soukromými daty musí vzniknout sdílené úložiště relací s atomickou revokací, TTL a testy mezi instancemi. Sticky sessions tento požadavek nenahrazují. Paměťová cache používá klíč vlastník + relace + zdroj, má pevné limity a sama o sobě nedává oprávnění.

Soukromý snímek neposíláme v HTML/RSC ani Next Router Cache. Až klientská komponenta zavolá chráněné API a runtime validuje DTO i konec platnosti relace. Private HTML/API/auth mají `private, no-store`; upstream požadavky `no-store`. Neexistuje persistentní klientské uložení soukromých dat ani service worker.

Při odhlášení, `pagehide`, skrytí záložky a navigaci se obsah skryje přímo v DOM a následně odstraní ze state. Generační čítač a abort zamezí obnovení opožděnou odpovědí. `pageshow`, návrat v historii, focus a obnova stránky vyžadují novou autorizaci. BroadcastChannel a storage událost přenášejí pouze signál odhlášení mezi záložkami. Odhlášení čeká na potvrzení prázdné serverové session a potom provede plnou navigaci. Při chybě zůstane obsah skrytý a je možné odhlášení opakovat.

To není záruka vymazání screenshotů, OS náhledů, paměti kompromitovaného prohlížeče ani údajů již přečtených uživatelem. Skutečné BFCache a Safari/iPhone chování je nutné před aktivací ověřit; syntetické události nenahrazují test skutečného obnovení stránky. Průběžná obnova je po 60 sekundách, lokální expirace obsah rovněž zamkne.

## GitHub adaptér a datový model

| Zdroj          | Read-only endpoint                                       | Výběr                                            |
| -------------- | -------------------------------------------------------- | ------------------------------------------------ |
| Repozitář      | `GET /repos/{owner}/{repo}`                              | Metadata, výchozí větev, viditelnost             |
| Otevřená PR    | `GET /repos/{owner}/{repo}/pulls?state=open`             | Nejvýše 3 stránky po 100, potom `complete=false` |
| GitHub Actions | `GET /repos/{owner}/{repo}/actions/runs`                 | Nejvýše 20 posledních běhů napříč větvemi        |
| Commity        | `GET /repos/{owner}/{repo}/commits?sha={default_branch}` | Nejvýše 5 posledních commitů výchozí větve       |

Používá se API verze `2026-03-10`. Transport povolí pouze GET, pevný HTTPS host a tyto cesty, odmítne redirecty a cizí stránkovací URL. Timeout jednoho požadavku je 3 s, celkový rozpočet snímku 8 s, tělo nejvýše 1 MiB. Zod validuje a redukuje odpověď; nevydáváme raw chyby GitHubu, tokeny, e-maily autorů, diffs, logy ani artefakty.

Každý zdroj obsahuje `source`, `state` (`fresh`, `stale`, `unavailable`), `checkedAt`, `attemptedAt`, `complete`, `error`, `retryAt`. `checkedAt` ve fixture režimu znamená čas přečtení simulace, nikoli ověření GitHubu. Neznámá data jsou `null`, nikoli nula nebo úspěch. Prázdné pole je možné pouze po úspěšné odpovědi. Nepoužíváme fiktivní počty testů, coverage ani odvozené „zdraví projektu“.

Běh Actions zachovává ID workflow/běhu, pokus, event, větev, přesný `head_sha`, status, conclusion a čas aktualizace. Úspěch jednoho běhu neznamená úspěch všech kontrol, aktuálního HEAD ani produkčního nasazení. Nový neznámý status se zobrazí jako neznámý; cancel/skipped/neutral nejsou úspěch.

## Chyby a limity

- Čerstvá serverová cache: 60 s. Při timeoutu/5xx může autorizovaný uživatel vidět explicitně označená starší data maximálně 10 minut od úspěšného čtení, nejdéle do expirace relace. Čas ověření se neposouvá. Po restartu není fallback.
- GitHub 401 zahodí cache a odmítne celý snímek; 403/404 odstraní dotčený zdroj. Žádný tichý fallback do DEMO. Neprozrazujeme, zda 404 znamená neexistující či nepřístupný repozitář.
- 429 nebo 403 s rate-limit hlavičkami respektuje `Retry-After`/reset a zastaví další požadavky. Lokálně nejvýše 10 obnov za minutu na relaci. Automatické opakování 5xx není v tomto řezu zapnuté; další pokus provede další oprávněná obnova po cooldownu.
- Výpadek jednoho zdroje nezneplatní ostatní. Neúplná stránkovaná odpověď je označena `complete=false`; počty nejsou vydávány za úplné. Odpověď klientského API při neověřitelném přístupu nezobrazuje dříve přijatý snapshot.
- API vrací generické 401/403/503, při lokálním limitu 429. Zápisové metody nejsou implementované (405). Přihlášení bez konfigurace je nedostupné; DEMO dále funguje.

## Testování bez skutečných účtů

```bash
npm ci
npm run check
npm run test:auth-http
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

`check` spustí TypeScript, Vitest, produkční build a původní HTTP smoke test. Vitest blokuje neočekávaný globální fetch. Ověřuje autorizaci při cache hitu a dokončení, revokaci, izolaci DEMO, chybové stavy, limity, stránkování, redakci, přesné SHA a klientské závody při skrytí/odhlášení.

HTTP integrační test prochází skutečným Auth.js přihlášením, šifrovanou cookie, přístupem k API, odhlášením a replayem původní cookie. Pouze OAuth provider odpovědi jsou simulované preloadem testovacího procesu; produkční aplikace nemá testovací bypass. Testy odmítnou cizí ID, změněný state a cizí Origin/Host. Browser scénáře pokrývají Chromium a mobilní WebKit, historii, klientskou navigaci, skrytí DOM, logout mezi záložkami a šířku mobilního rozložení. WebKit emulace není fyzický iPhone.

CI používá syntetické hodnoty a nemá produkční secrets ani deployment job. Browser trace/screenshoty obsahují pouze simulovaná data. Přesný výsledek běhu je v novém PR; příprava testu sama o sobě není důkaz jeho úspěchu.

## Pozdější aktivace: samostatná schvalovaná změna

1. Dokončit kontrolu PR #1 a tohoto Draft PR, skutečné prohlížečové testy včetně Safari/iPhonu, rozhodnout hosting a sdílené revokovatelné relace. Oba PR zůstávají nesloučené, dokud nebudou samostatně schválené.
2. Vytvořit vyhrazenou OAuth App pouze pro identitu, ověřit číselné ID vlastníka a callback `{AUTH_URL}/api/auth/callback/github`. Přihlášení oddělit od přístupových údajů k repozitáři.
3. Po výslovném souhlasu zřídit **fine-grained PAT** jen pro `romanolsak7-sudo/nasobilkozrouti`, s krátkou expirací (např. 30 dní): **Metadata: Read**, **Contents: Read**, **Pull requests: Read**, **Actions: Read**. Žádný classic `repo`, zápis, administrační oprávnění, secrets, issues, webhooks ani přístup k dalším repozitářům. Contents Read umožňuje i čtení kódu: GitHub nemá užší oprávnění jen pro seznam commitů; aplikační adaptér proto povolí pouze potřebné cesty.
4. Tajné hodnoty vložit pouze serverově do secret manageru hostingu; lokálně do ignorovaného `.env.local` s omezenými právy. Nikdy `NEXT_PUBLIC_*`, git, chat, URL, client bundle, session, logy nebo CI pro PR z forků. OAuth secret, session secret a PAT jsou různé hodnoty. Sepsat rotaci a okamžitou revokaci; údaje se nezadávají do tohoto PR.
5. Implementovat explicitní serverový síťový transport a nový live kontrakt s `source=github`. Nedělat z fixture režimu automatický fallback. Provést schválené srovnání přesného SHA/PR/workflow/času proti GitHubu a zaznamenat limity dostupnosti dat.

Pro více repozitářů a dlouhodobý provoz zvážit GitHub App s instalací na vybrané repozitáře a krátkodobým installation tokenem. To je následný krok, nikoli podmínka lokálního fixture prototypu.

## Oficiální podklady

- [Auth.js instalace a aktuální beta větev](https://authjs.dev/getting-started/installation)
- [GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Metadata repozitáře](https://docs.github.com/en/rest/repos/repos#get-a-repository)
- [Otevřené PR](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests)
- [Workflow runs a Actions Read](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository)
- [Commity a Contents Read](https://docs.github.com/en/rest/commits/commits#list-commits)
- Next.js dokumentace odpovídající instalované verzi: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` a `data-security.md`.
