---
name: verify
description: Recette de vérification end-to-end du site GJS — build, serveur de prod, pilotage Playwright (Chromium préinstallé), points de contrôle connus.
---

# Vérifier le site GJS

## Build & lancement

```bash
npm run build          # doit générer 12 routes sans erreur
npm start &            # sert http://localhost:3000 (tuer l'ancien : pkill -f next-server)
```

## Pilotage navigateur

Playwright n'est PAS dans package.json (volontaire) : `npm i --no-save playwright`.
Lancer avec le Chromium préinstallé :

```js
chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
```

⚠️ Le script doit vivre sous la racine du projet (résolution ESM de `playwright`).

## Points de contrôle

- **Préloader** : attendre `[aria-label="Chargement du site GJS"]` en état `detached` (≤15 s), puis ~800 ms de settle. Il est **sauté** si `sessionStorage.gjs-visited=1` ou en `reducedMotion: "reduce"` (contexte propre à chaque test !).
- **Cookies** : bouton `Tout refuser` visible au premier chargement ; cliquer pour dégager les captures suivantes.
- **API** : `POST /api/contact` — valide → `{ok:true}` ; sans `consent:true` → 400 ; champ `website` rempli (honeypot) → `{ok:true,id:"noop"}` ; >5 req/min/IP → 429.
- **Terminal** : taper `gjs` (hors input) → dialog `Terminal secret GJS` ; l'input doit être **vide** à l'ouverture (la touche déclencheuse ne doit pas fuiter).
- **Sections actives** : en haut de page, `nav a[aria-current="true"]` doit compter 0.
- **Mobile 390px** : `scrollWidth - clientWidth` du document ≤ 1 (jamais de scroll horizontal).
- **Jeux** : services → hover panneau → bouton `▶ Jouer à …` → intro → jouer.

## Pièges connus de l'environnement headless

- Rendu logiciel (SwiftShader) → **~10 fps** : les jeux (dt plafonné à 0,05 s) avancent à mi-vitesse, les premières puces du Data Catcher mettent ~5 s réelles à entrer à l'écran. Ce n'est PAS un bug du site — vérifié à 60 fps sur vrai matériel.
- `pkill -f "next start"` matche le shell appelant (exit 144) : utiliser `pkill -f next-server`.
- Les screenshots pris <1,5 s après la fin du préloader attrapent l'intro GSAP en cours (éléments semi-transparents) : attendre.
