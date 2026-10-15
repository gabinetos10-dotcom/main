#!/bin/bash
# GJS — lance le site en local.
# macOS : double-clic (la 1re fois : clic droit › Ouvrir, ou Réglages › Confidentialité et sécurité › Ouvrir quand même).
# Linux : ./lancer-le-site.command
cd "$(dirname "$0")" || exit 1

pause_et_quitter() { read -r -p "Appuyez sur Entrée pour fermer…"; exit "${1:-0}"; }

if [ ! -f index.html ]; then
  echo "Dézippez d'abord l'archive, puis relancez ce fichier depuis le dossier extrait."
  pause_et_quitter 1
fi

ouvrir() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1
  else echo "Ouvrez $1 dans votre navigateur."
  fi
}

# Ouvre le navigateur dès que le serveur répond (2 minutes maximum)
ouvrir_quand_pret() {
  local port=$1 parent=$$
  for _ in $(seq 1 120); do
    if curl -s -o /dev/null "http://127.0.0.1:$port/"; then ouvrir "http://localhost:$port"; return; fi
    kill -0 "$parent" 2>/dev/null || return
    sleep 1
  done
  ouvrir "http://localhost:$port"
}

# Sur macOS, /usr/bin/python3 est un leurre tant que les outils développeur ne sont pas installés
python_ok() {
  command -v python3 >/dev/null 2>&1 || return 1
  if [ "$(uname -s)" = Darwin ] && ! xcode-select -p >/dev/null 2>&1; then return 1; fi
  python3 -c 'import http.server' >/dev/null 2>&1
}

echo "GJS — serveur local. Fermez cette fenêtre (ou Ctrl+C) pour l'arrêter."
echo "Au premier lancement, l'installation peut prendre jusqu'à une minute : le navigateur s'ouvrira tout seul."
if command -v npx >/dev/null 2>&1; then
  ouvrir_quand_pret 3000 &
  npx --yes serve . -l tcp://127.0.0.1:3000 || { echo; echo "Le serveur n'a pas pu démarrer : lisez le message ci-dessus."; pause_et_quitter 1; }
elif python_ok; then
  ouvrir_quand_pret 8000 &
  python3 -m http.server 8000 --bind 127.0.0.1 || { echo; echo "Le serveur n'a pas pu démarrer : lisez le message ci-dessus."; pause_et_quitter 1; }
else
  echo "Aucun outil trouvé : installez Node.js (https://nodejs.org, version LTS), puis relancez ce fichier."
  pause_et_quitter 1
fi
