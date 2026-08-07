# 🧟 DERNIÈRE LUEUR

Un jeu de tir 3D à la première personne : un homme, une arme, une horde de zombies
sans fin. Tirez sur les cristaux d'amélioration pour devenir plus fort, et abattez
les gros zombies blindés avant qu'ils ne vous écrasent.

Tout tourne dans le navigateur, sans build, sans installation, sans réseau :
Three.js est inclus dans le dépôt et l'audio est généré à la volée (WebAudio).

## Lancer le jeu

Le jeu utilise les modules ES : il doit être servi par un serveur HTTP
(l'ouvrir avec `file://` ne fonctionnera pas).

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

ou, si vous préférez Node :

```bash
npx serve .
```

Cliquez sur **JOUER**, puis sur l'écran pour capturer la souris (Échap pour la libérer).

## Commandes

| Touche | Action |
| --- | --- |
| `Z Q S D` / `W A S D` | Se déplacer |
| Souris | Viser |
| Clic gauche | Tirer |
| Clic droit | Visée précise (dispersion réduite) |
| `R` | Recharger |
| `Maj` | Sprinter (consomme de l'endurance) |
| `Espace` | Sauter |
| `Ctrl` / `C` | S'accroupir |
| `F` / `V` | Coup de crosse (repousse et étourdit) |
| `G` | Lancer une grenade |
| `1` … `4` / molette | Changer d'arme |
| `Échap` | Pause |

## Devenir plus fort — les éléments à détruire

Le cœur de la progression : **on tire sur le décor pour se renforcer**.

- **Cristaux d'amélioration** — losanges lumineux flottants, plusieurs par vague.
  Les détruire accorde immédiatement une amélioration permanente :
  dégâts, cadence, chargeur, vitesse, PV max, rechargement, perforation,
  régénération, coup critique, balles explosives. Chaque amélioration est
  cumulable jusqu'à un plafond, et la couleur du cristal indique laquelle.
- **Caisses d'armes** — les détruire débloque le fusil à pompe (vague 2), le
  fusil d'assaut (vague 4) puis le fusil de précision (vague 7) ; ensuite elles
  fournissent des munitions.
- **Barils explosifs** — dégâts de zone, réaction en chaîne entre barils proches.
  Attention, l'explosion blesse aussi le joueur.
- **Trousses de soin, munitions et grenades** au sol, ramassées en marchant dessus.

## Enchaîner les éliminations

Chaque victime relance une chaîne de 3,6 s. À 4, 9, 16 et 26 éliminations sans
temps mort, le score est multiplié par 1,5 puis 2, 3 et 4 — avec un bandeau
(ENCHAÎNÉ, CARNAGE, BOUCHERIE, APOCALYPSE). Jouer agressivement rapporte
beaucoup plus que jouer prudemment, ce qui est tout l'enjeu.

## Difficulté

Trois réglages, choisis sur l'écran d'accueil et conservés d'une partie à l'autre :

| Mode | Effet |
| --- | --- |
| **Survivant** | Zombies plus faibles et moins nombreux, répit de 11 s, score ×0,8 |
| **Vétéran** | L'équilibre prévu |
| **Cauchemar** | +40 % de vie, +35 % de dégâts, +30 % d'effectifs, répit de 6 s, score ×1,6 |

## Vagues spéciales

À intervalles réguliers, une vague change les règles et l'annonce à l'écran :

- **DÉFERLANTE** — deux fois plus nombreux et bien plus rapides, mais fragiles.
- **COLONNE BLINDÉE** — une escouade de brutes, peu de chair à canon.
- **BROUILLARD TOXIQUE** — visibilité réduite à quelques mètres ; la minicarte devient vitale.
- **MEUTE DE RAMPANTS** — ils arrivent au ras du sol, en nombre.

## Les ennemis

| Ennemi | Comportement |
| --- | --- |
| **Marcheur** | Le fond de la horde : lent, nombreux. |
| **Coureur** | Rapide et fragile, arrive par les flancs. |
| **Cracheur** | Attaque à distance avec des projectiles acides, garde ses distances. |
| **Rampant** | Se traîne au ras du sol à 4,9 m/s. Un tir à hauteur de torse le manque : il faut baisser la visée. |
| **Boursouflé** | Abdomen distendu qui palpite de plus en plus vite à l'approche. Il explose en mourant — et se fait sauter au contact. Son ventre est un point faible (×1,6). |
| **BRUTE** | Gros zombie : 750 PV, 45 % des dégâts absorbés par son armure, frappe le sol avec une onde de choc. Ses **trois pustules jaunes** ignorent l'armure et infligent ×4,5 de dégâts. |
| **COLOSSE** | Boss, toutes les 5 vagues : 3 400 PV, charge à pleine vitesse, invoque des renforts à 75 %, 50 % et 25 % de sa vie. Même faiblesse : les pustules. |

Les gros zombies laissent tomber un cristal, des munitions et souvent une trousse
de soin. Vague après vague, les zombies gagnent en vie et en vitesse.

## Armes

| Arme | Profil |
| --- | --- |
| **Pistolet 9 mm** | Semi-auto, munitions illimitées en réserve, précis. |
| **Fusil à pompe** | 9 plombs, dévastateur de près, perforant, rechargement cartouche par cartouche. |
| **Fusil d'assaut** | Automatique, 30 coups, polyvalent. |
| **Fusil de précision** | 165 de dégâts, lunette (champ de vision 22°), traverse trois corps alignés. |

Tir à la tête : ×2,6 de dégâts (et décapitation sur les petits zombies). Un tir
qui dépasse largement les points de vie restants pulvérise le corps en morceaux.

**Coup de crosse** (`F`) : 55 de dégâts dans un cône de 3 m devant vous, avec
recul et étourdissement d'une seconde. C'est la sortie de secours quand la horde
vous colle.

**Grenades** (`G`) : 3 au maximum, 260 de dégâts sur 8,5 m, avec rebonds sur le
décor et fusée sonore. Elles blessent aussi le lanceur.

## Organisation du code

```
index.html          page + HUD + écrans (menu, options, pause, fin de partie)
styles/style.css    interface
vendor/             Three.js r160 (MIT), inclus pour fonctionner hors ligne
src/
  main.js           démarrage
  game.js           orchestration : boucle, vagues, résolution des tirs, score
  config.js         toutes les constantes d'équilibrage
  world.js          arène procédurale (bâtiments, conteneurs, lampadaires)
  player.js         déplacement, collisions, vie, statistiques
  weapons.js        armes, vue première personne, recul, rechargement
  enemies.js        zombies : IA, sphères de tir, points faibles, boss
  pickups.js        cristaux, caisses, barils, objets au sol
  effects.js        particules, traçantes, impacts, chiffres de dégâts
  grenades.js       grenades : balistique, rebonds, détonation
  store.js          réglages et records conservés (localStorage)
  hud.js            interface de jeu, combo, minicarte
  audio.js          synthèse sonore procédurale
  input.js          clavier, souris, verrouillage du pointeur
  utils.js          maths, collisions cercle/boîte, lancers de rayons
```

Pour rééquilibrer le jeu, `src/config.js` suffit dans la grande majorité des cas.

## Notes techniques

- Les tirs sont instantanés (*hitscan*) : chaque zombie expose des sphères de
  toucher (tête, torse, corps, jambes, pustules) testées par lancer de rayon,
  avec gestion de la perforation.
- Le modèle d'arme est rendu dans une passe séparée avec sa propre caméra et son
  propre éclairage, pour qu'il ne traverse jamais le décor.
- Les collisions utilisent des boîtes alignées aux axes et une résolution
  cercle/boîte qui produit un glissement naturel le long des murs.
- Aucune ressource externe : textures dessinées sur canvas, sons synthétisés.
- Un bref ralenti (*hit stop*) sur la mort des gros ennemis et les coups de
  crosse réussis donne du poids aux impacts.
- Records et réglages (sensibilité, volume, champ de vision, résolution de
  rendu, ombres) sont conservés entre les parties ; le stockage indisponible
  est géré sans casser le jeu.
