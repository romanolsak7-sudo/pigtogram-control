# Předání první verze

Větev: `feat/pigtogram-control-demo`

Připravený název PR: **feat: první DEMO verze PIGTOGRAM CONTROL**

Popis PR je v [first-version-pr.md](first-version-pr.md).

## Odeslání po doplnění oprávnění GitHubu

Původní odeslání přes Git skončilo HTTP 403. GitHub konektor také odmítl vytvoření větve zprávou `Resource not accessible by integration`. Vzdálená větev ani Pull Request nebyly vytvořeny; změny jsou kompletně commitované lokálně. Je potřeba připojení s oprávněním zapisovat obsah, Pull Requesty a workflow do tohoto jediného repozitáře.

```bash
git push -u origin feat/pigtogram-control-demo
gh pr create --draft --base main --head feat/pigtogram-control-demo --title 'feat: první DEMO verze PIGTOGRAM CONTROL' --body-file docs/first-version-pr.md
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

Pak lze použít příkazy pro odeslání větve a vytvoření PR výše. Neslučovat ani nenasazovat bez schválení vlastníka.
