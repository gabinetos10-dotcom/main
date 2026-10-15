#!/bin/bash
# GJS — lance le site en local.
# macOS : double-clic (la 1re fois : clic droit › Ouvrir si macOS bloque le fichier).
# Linux : ./lancer-le-site.command
cd "$(dirname "$0")" || exit 1

ouvrir() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1
  else echo "Ouvrez $1 dans votre navigateur."
  fi
}

echo "GJS — serveur local. Fermez cette fenêtre (ou Ctrl+C) pour l'arrêter."
if command -v npx >/dev/null 2>&1; then
  echo "Site disponible sur http://localhost:3000 (si le port est pris, l'adresse affichée ci-dessous fait foi)."
  (sleep 5; ouvrir "http://localhost:3000") &
  npx --yes serve . -l 3000
elif command -v python3 >/dev/null 2>&1; then
  echo "Site disponible sur http://localhost:8000"
  (sleep 2; ouvrir "http://localhost:8000") &
  python3 -m http.server 8000
else
  echo "Aucun outil trouvé : installez Node.js (https://nodejs.org), puis relancez ce fichier."
  read -r -p "Appuyez sur Entrée pour fermer…"
fi
