# Předání první verze

Větev: `feat/pigtogram-control-demo`

Pull Request: [#1 — první DEMO verze PIGTOGRAM CONTROL](https://github.com/romanolsak7-sudo/pigtogram-control/pull/1)

Popis PR je v [first-version-pr.md](first-version-pr.md).

## Práce s větví a Pull Requestem

Větev je odeslaná na GitHub a Pull Request je otevřený jako draft. Zahrnuje výsledky ověření i zbývající vizuální kontrolu. Další commity odeslané do této větve automaticky aktualizují existující PR.

```bash
git push -u origin feat/pigtogram-control-demo
gh pr view 1 --web
```

Tyto příkazy nic neslučují ani nenasazují. `gh` musí být přihlášený k účtu s přístupem k repozitáři.

## Přenos bez přístupu do cloudového workspace

Zdrojový ZIP obsahuje soubory projektu bez `node_modules`, buildů a tajných klíčů. Po rozbalení stačí `npm ci` a `npm run dev`.

Git bundle obsahuje celý repozitář a pracovní větev včetně historie. Po stažení:

```bash
git clone pigtogram-control-demo.bundle pigtogram-control
cd pigtogram-control
git switch feat/pigtogram-control-demo
git remote set-url origin https://github.com/romanolsak7-sudo/pigtogram-control.git
npm ci
npm run dev
```

Pak lze použít příkazy pro aktualizaci větve a otevření existujícího PR výše. Neslučovat ani nenasazovat bez schválení vlastníka.
