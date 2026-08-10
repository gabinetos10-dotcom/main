# Baccalauréat en ligne

Le jeu du **petit bac** en multijoueur temps réel. L'hôte ouvre un salon, partage
un code à 4 lettres, et tout le monde rejoint depuis son téléphone ou son
ordinateur. Une lettre est tirée, chacun remplit ses cases, le plus rapide crie
STOP, puis on dépouille ensemble.

Pas de compte, pas de base de données : une partie vit en mémoire le temps qu'on
y joue.

## Lancer le jeu

```bash
npm install
npm start
```

Puis ouvre <http://localhost:3000>.

Pour que tes amis rejoignent depuis leur téléphone sur le même réseau Wi-Fi,
donne-leur ton adresse locale (`http://192.168.x.x:3000`, visible avec
`ip addr` ou `ifconfig`). Le port s'ajuste avec `PORT=8080 npm start`.

## Comment on joue

1. **Créer** une partie avec un pseudo → un code à 4 lettres apparaît.
2. **Partager** le code (ou le lien `http://…/ABCD`, qui pré-remplit le code).
3. L'hôte règle les catégories, le nombre de manches et le chrono, puis lance.
4. Une **lettre est tirée** au sort. Tout le monde remplit ses cases avec des
   mots commençant par cette lettre.
5. Le premier qui a **tout rempli** peut crier **STOP** : les autres ont quelques
   secondes pour finir. Sinon la manche s'arrête au chrono.
6. **Dépouillement** : on voit toutes les réponses. Chacun peut contester un mot
   douteux ; à la majorité des autres joueurs, il saute.
7. L'hôte valide, on passe à la manche suivante, et le podium tombe à la fin.

### Barème

| Situation | Points |
|---|---|
| Personne d'autre n'a trouvé de réponse valable dans la catégorie | **15** |
| Réponse valable que personne d'autre n'a écrite | **10** |
| Réponse valable écrite aussi par quelqu'un d'autre | **5** |
| Case vide, mauvaise lettre, ou réponse rejetée au vote | **0** |

Les doublons sont détectés sans tenir compte de la casse, des accents ni de la
ponctuation : « Éléphant » et « elephant » comptent comme le même mot. Une
réponse qui ne commence pas par la bonne lettre est écartée automatiquement,
sans avoir besoin de voter.

## Réglages (hôte)

- **Catégories** : 3 à 12, à piocher dans une liste ou à écrire soi-même.
- **Manches** : 1 à 15.
- **Durée** : 30 à 600 secondes par manche.
- **Délai après STOP** : le sursis laissé aux autres, 0 à 30 secondes.
- **Bouton STOP** : désactivable pour jouer uniquement au chrono.
- **Lettres écartées** : K, Q, W, X, Y et Z par défaut. Une même lettre ne
  ressort pas tant que le paquet n'est pas épuisé.

## Détails qui comptent

- **Rien ne fuite** : pendant une manche, le serveur n'envoie que la progression
  des autres joueurs (« 4/6 »), jamais leurs mots.
- **Reconnexion** : recharge la page ou perds le réseau, tu reprends ta place et
  tes réponses. La session est gardée dans le `localStorage`.
- **Hôte absent** : si l'hôte se déconnecte plus de 12 secondes, un autre joueur
  reprend la main automatiquement.
- **Le serveur fait autorité** sur le chrono, le tirage et les points — le
  client ne fait que dessiner l'état reçu.

## Tests

```bash
node test/e2e.js
```

Lance un vrai serveur, branche trois clients WebSocket et joue une partie
complète : barème, votes à la majorité, reconnexion, exclusion, fin de partie.

## Structure

```
server/
  index.js    serveur HTTP (fichiers statiques) + WebSocket, routage des messages
  game.js     salons, joueurs, machine à états d'une partie
  scoring.js  dépouillement et barème
  config.js   catégories, limites, normalisation des mots
public/
  index.html  les six écrans du jeu
  style.css   direction artistique « cahier d'écolier »
  app.js      client : connexion, rendu, saisie
test/
  e2e.js      partie complète jouée par trois clients
```

## Déploiement

Une seule dépendance (`ws`) et aucun état sur disque : n'importe quel hébergeur
Node fait l'affaire. Écoute sur `PORT` (3000 par défaut) et `HOST`
(`0.0.0.0` par défaut). Derrière un reverse proxy, pense à laisser passer
l'upgrade WebSocket sur `/ws` :

```nginx
location /ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Les salons vides sont recyclés au bout de 15 minutes, et toute partie expire
après 8 heures.
