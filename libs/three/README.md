# three.js (vendored)

Bibliothèque [three.js](https://threejs.org/) **version 0.185.1**, intégrée dans le dépôt
pour créer des éléments 3D sur les sites — utilisable directement, y compris sur un site
statique (sans étape de build).

## Contenu

| Dossier | Description |
|---------|-------------|
| `build/` | La bibliothèque compilée. Le fichier principal est `three.module.js` (ES module). Variantes : `.min.js` (minifiée pour la prod), `three.webgpu.js` (backend WebGPU), `three.core.js`. |
| `jsm/` | Les *addons* officiels : chargeurs (`GLTFLoader`, `OBJLoader`…), contrôles (`OrbitControls`…), post-processing, etc. |
| `LICENSE` | Licence MIT de three.js. |

## Utilisation — site statique (import map)

Aucun bundler nécessaire. Ajouter un `<script type="importmap">` puis importer depuis `three` :

```html
<script type="importmap">
{
  "imports": {
    "three": "/libs/three/build/three.module.js",
    "three/addons/": "/libs/three/jsm/"
  }
}
</script>

<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  // ... voir examples/basic-scene.html
</script>
```

> Adapter les chemins (`/libs/three/...`) à l'emplacement réel du site. Ils doivent être
> servis par un serveur HTTP (les modules ES ne se chargent pas via `file://`).

## Utilisation — projet avec bundler (Vite, Webpack…)

three.js est aussi déclaré dans le `package.json` à la racine. Dans ce cas :

```bash
npm install
```

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
```

## Exemple prêt à l'emploi

Voir [`examples/basic-scene.html`](./examples/basic-scene.html) — une scène minimale
(cube animé + contrôles souris) entièrement autonome.

## Mise à jour

```bash
npm install three@latest
cp -r node_modules/three/build   libs/three/build
cp -r node_modules/three/examples/jsm libs/three/jsm
```
