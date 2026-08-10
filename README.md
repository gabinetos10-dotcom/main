# 🧟 DERNIÈRE LUEUR

Un jeu de tir 3D à la première personne, en **manches sans fin** dans un complexe
cloisonné. Les infectés arrivent par les fenêtres barricadées, vous gagnez des
points en tirant, et vous dépensez ces points pour ouvrir la carte, acheter des
armes et vous renforcer.

Tout tourne dans le navigateur, sans build, sans installation, sans réseau :
Three.js est inclus dans le dépôt et l'audio est synthétisé à la volée (WebAudio).

## Lancer le jeu

Le plus simple : ouvrir **`standalone.html`** (le jeu entier dans un seul fichier,
ouvrable directement en `file://`, sans serveur).

Pour la version en modules ES, il faut un serveur HTTP :

```bash
python3 -m http.server 8000    # puis http://localhost:8000
```

Cliquez sur **JOUER**, puis sur l'écran pour capturer la souris (Échap pour la libérer).

## Commandes

| Touche | Action |
| --- | --- |
| `Z Q S D` / `W A S D` | Se déplacer |
| Clic gauche / droit | Tirer / viser |
| `E` | Acheter, ouvrir, activer |
| `E` maintenu | Rebarricader une fenêtre |
| `R` | Recharger |
| `F` / `V` | Coup de crosse |
| `G` | Grenade |
| `Maj` | Sprinter |
| `Espace` / `Ctrl` | Sauter / s'accroupir |
| `1` `2` `3` / molette | Changer d'arme |
| `Échap` | Pause |

## La boucle de jeu

Les manches s'enchaînent automatiquement : plus nombreuses, plus rapides, plus
résistantes. Il n'y a **pas de barre de vie** — l'écran se couvre de sang, le
cœur bat, et la santé se régénère quelques secondes après le dernier coup encaissé.

**Les infectés entrent par les fenêtres.** Ils arrivent de l'extérieur, arrachent
les planches une par une, puis se hissent à l'intérieur. Maintenir `E` devant une
fenêtre repose une planche et rapporte 10 points. C'est le rythme de base :
tenir les fenêtres, ou choisir lesquelles abandonner.

### L'économie de points

| Action | Points |
| --- | --- |
| Balle qui touche | 10 |
| Élimination | 60 |
| Élimination à la tête | 130 |
| Coup de crosse fatal | 130 |
| Brute ou colosse | ×4 |
| Planche reposée | 10 |

Les points servent à tout : **ouvrir les portes** (750 à 1750) pour accéder aux
autres salles, **acheter les armes murales** (silhouettes à la craie ; les
munitions coûtent ensuite moitié prix), tenter la **caisse mystère** (950 points
pour une arme au hasard — elle change de place après quelques tirages), acheter
les **atouts** et **améliorer votre arme**.

### Le courant

L'interrupteur est au fond de la salle des machines, au bout du parcours. Tant
qu'il n'est pas enclenché, les distributeurs d'atouts et le poste d'amélioration
restent éteints et les salles ne sont éclairées que par un fanal de secours rouge.
C'est le premier vrai objectif de la partie.

### Atouts

Achetés une fois, conservés jusqu'à la mort.

| Atout | Prix | Effet |
| --- | --- | --- |
| **Second souffle** | 1500 | Vous vous relevez seul, une fois par partie |
| **Bottes lestes** | 2000 | Course et endurance améliorées |
| **Peau dure** | 2500 | Plus du double de résistance |
| **Mains agiles** | 3000 | Rechargement deux fois plus rapide |
| **Doigt léger** | 3000 | Cadence de tir nettement supérieure |

### Poste d'amélioration

5000 points pour transformer l'arme en main : dégâts ×2,35, chargeur ×1,8,
réserve ×1,6. L'arme améliorée porte une étoile dans l'inventaire.

### Bonus lâchés par les zombies

🔋 munitions max · 💀 mort instantanée (30 s) · ✖ points doublés (30 s) ·
☢ anéantissement (tue tout et rapporte 400) · 🔨 charpentier (rebarricade tout).
Ils tombent au hasard et disparaissent au bout de 30 secondes.

## La carte

Cinq salles reliées par quatre portes payantes :

```
        ┌───────────┬───────────┬───────────┐
        │  CANTINE  │   HALL    │  ATELIER  │      ← départ au centre
        └───────────┴─────┬─────┴───────────┘
        ┌─────────────────┴─────────────────┐
        │             COULOIR               │
        └────────────┬──────────────────────┘
                     │  SALLE DES MACHINES  │      ← courant + amélioration
                     └──────────────────────┘
```

Cantine et atelier sont des impasses à récompenses ; le couloir mène à la salle
des machines. Les zombies se déplacent avec un **champ de navigation** recalculé
en continu : ils contournent le décor, empruntent les portes ouvertes et
reconfigurent leurs trajets dès qu'une porte s'ouvre.

## Armes

| Arme | Profil |
| --- | --- |
| **Pistolet 9 mm** | De départ, réserve illimitée |
| **Fusil à pompe** | 9 plombs, perforant, rechargement cartouche par cartouche |
| **Mitraillette** | Très rapide, peu de dégâts |
| **Fusil d'assaut** | Polyvalent |
| **Fusil de précision** | 165 de dégâts, lunette, traverse trois corps |
| **Mitrailleuse lourde** | 100 coups, perforante |

Inventaire limité à **trois emplacements**, pistolet compris : une nouvelle arme
remplace celle que vous tenez.

**Coup de crosse** (`F`) : 55 de dégâts en cône, avec recul et étourdissement.
**Grenades** (`G`) : 3 au maximum, rebonds sur le décor, 260 de dégâts sur 8,5 m.

## Les ennemis

| Ennemi | Comportement |
| --- | --- |
| **Marcheur** | Le fond de la horde |
| **Coureur** | Rapide et fragile |
| **Rampant** | Au ras du sol : un tir à hauteur de torse le manque |
| **Boursouflé** | Explose en mourant, et se fait sauter au contact |
| **Cracheur** | Projectiles acides à distance |
| **BRUTE** | Blindé à 45 %, onde de choc au sol ; ses trois pustules jaunes ignorent l'armure |
| **COLOSSE** | Boss toutes les 10 manches : charge et invoque des renforts |

## Organisation du code

```
index.html          page + HUD + écrans
styles/style.css    interface
vendor/             Three.js r160 (MIT), inclus pour fonctionner hors ligne
src/
  main.js           démarrage
  game.js           orchestration : manches, points, interactions, tirs
  config.js         toutes les constantes d'équilibrage
  map.js            le complexe : salles, murs percés, portes, néons
  navgrid.js        champ de navigation (parcours en largeur sur grille)
  interactables.js  portes, achats muraux, distributeurs, caisse, barricades
  powerups.js       bonus lâchés par les zombies
  enemies.js        zombies : IA, entrée par les fenêtres, points faibles
  weapons.js        armes, inventaire, vue première personne, amélioration
  grenades.js       grenades : balistique, rebonds, détonation
  player.js         déplacement, santé régénérative, atouts, mise à terre
  effects.js        particules, traçantes, impacts, chiffres de dégâts
  pickups.js        barils explosifs
  hud.js            interface de jeu
  audio.js          synthèse sonore procédurale
  store.js          réglages et records conservés
  input.js          clavier, souris, verrouillage du pointeur
  utils.js          maths, collisions, lancers de rayons
tools/              construction du fichier unique
```

Pour rééquilibrer le jeu, `src/config.js` suffit dans la grande majorité des cas.

## Notes techniques

- **Navigation** : grille d'occupation 1 m + parcours en largeur depuis le joueur,
  recalculé toutes les 0,22 s. Les portes fermées sont des cases infranchissables,
  donc ouvrir une porte reconfigure instantanément tous les trajets.
- **Murs percés** : chaque mur est construit par morceaux autour de ses ouvertures.
  Une fenêtre laisse un appui bas (1,65 m, infranchissable même en sautant) et un
  linteau ; une porte est un bloc plein retiré de la scène *et* de la liste de
  collision à l'achat.
- **Éclairage par pixel** (`MeshPhongMaterial`) : avec `MeshLambertMaterial`,
  l'éclairage est calculé par sommet et un grand sol reste noir sous des lampes
  ponctuelles. L'atténuation linéaire des lampes est réactivée
  (`renderer.useLegacyLights`) pour garder des halos lisibles sans intensités
  démesurées.
- Le modèle d'arme est rendu dans une passe séparée avec sa propre caméra et son
  propre éclairage : il ne traverse jamais le décor.
- Aucune ressource externe : textures dessinées sur canvas, sons synthétisés.
