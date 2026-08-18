# @calque/builder

`build(source, blueprint, contenu) → site_final`. Fonction pure : elle lit un instantané
immuable et renvoie des fichiers. Elle n'écrit rien, ne mute rien, ne dépend d'aucune
horloge ni d'aucun réseau.

## L'invariant

```
build(source, blueprint, initialContent(blueprint)) ≡ source
```

Byte pour byte, sur les trois fixtures. C'est le filet de sécurité de tout le système
(§15), et c'est le premier test écrit dans ce package.

Il tient pour deux raisons :

1. **Un champ dont la valeur n'a pas changé n'est pas réécrit.** La comparaison porte sur
   la valeur enregistrée dans le blueprint, pas sur le texte du source — ce qui rend
   l'invariant insensible aux entités HTML (`&nbsp;`) et à l'indentation.
2. **Rien n'est resérialisé.** Le builder remplace des intervalles d'octets, et seuls
   ceux-là. Aucun aller-retour par un sérialiseur, qui normaliserait les guillemets,
   l'ordre des attributs et les balises auto-fermantes.

## Résolution

Le builder ne fait pas confiance aux offsets du blueprint : il reparse le source et
retrouve chaque champ en trois étages — `domPath` exact, puis empreinte + hachage de
contenu, puis empreinte seule si elle ne désigne qu'un candidat. Au-delà, il ne devine
pas : le champ part dans `unresolvedFieldIds` et **rien n'est écrit**.

C'est ce qui permet de republier un site dont l'agence a bougé le design sans écrire à
l'aveugle dans un fichier qui a changé sous nos pieds.

## Ce que le build fait

| Étape (§15)                      | Où                          |
| -------------------------------- | --------------------------- |
| Valeurs de champs                | `writes.ts`                 |
| Items ajoutés, retirés, déplacés | `collections.ts`            |
| Masquage et duplication de blocs | `index.ts` + `overrides.ts` |
| `assets/calque-overrides.css`    | `overrides.ts`              |
| SEO, `sitemap.xml`, `robots.txt` | `seo.ts`, `sitemap.ts`      |
| Retrait des `data-calque*`       | `index.ts`                  |

Le CSS d'origine n'est **jamais** modifié : tout ce que le client change dans le thème
vit dans `assets/calque-overrides.css`, chargée en dernier. La supprimer rend le site à
son état livré.

## Sécurité

Tout ce qui vient du client traverse `escape.ts` :

- un texte est échappé, jamais interprété comme du balisage ;
- un texte enrichi est assaini contre une liste blanche — un élément hors liste est
  _déballé_, son contenu remonte, plutôt que supprimé avec ce que le client croyait
  avoir écrit ;
- une URL en `javascript:` ou `data:` devient `#` ;
- une valeur de jeton est validée contre une liste blanche par type, et rejetée sinon.

## Ce qui n'est pas là

- La réécriture des URLs médias vers le CDN (§15 étape 6) — P8, avec la bibliothèque de
  médias.
- L'archivage dans R2 et le déploiement Cloudflare Pages (§15 étapes 10 à 12) — P4 et P8.
  Le builder s'arrête à la production des fichiers, ce qui le garde pur et testable.
