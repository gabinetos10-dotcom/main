#!/usr/bin/env bash
#
# Postgres local pour développer et faire tourner les tests E2E, sans Docker et
# sans service tiers. Utilise les binaires PostgreSQL déjà présents sur la
# machine (paquet `postgresql-16` sur Debian/Ubuntu, `brew install postgresql@16`
# sur macOS).
#
#   ./scripts/postgres-local.sh start    démarre le cluster et crée la base
#   ./scripts/postgres-local.sh stop     arrête le cluster
#   ./scripts/postgres-local.sh status   état du cluster
#   ./scripts/postgres-local.sh reset    supprime tout et repart de zéro
#   ./scripts/postgres-local.sh url      affiche la DATABASE_URL
#
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${PGDATA:-$RACINE/.data/pg}"
PGPORT="${PGPORT:-54329}"
PGDATABASE="${PGDATABASE:-calque}"
LOG="$PGDATA/postgres.log"

# Les binaires ne sont pas toujours dans le PATH (Debian les range par version).
trouver_bin() {
  if command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v pg_ctl)"
    return
  fi
  for candidat in /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin; do
    if [ -x "$candidat/pg_ctl" ]; then
      echo "$candidat"
      return
    fi
  done
  echo "Erreur : binaires PostgreSQL introuvables." >&2
  echo "  Debian/Ubuntu : sudo apt-get install postgresql-16" >&2
  echo "  macOS         : brew install postgresql@16" >&2
  exit 1
}

BIN="$(trouver_bin)"
URL="postgres://postgres@127.0.0.1:$PGPORT/$PGDATABASE"

# PostgreSQL refuse de tourner en root. C'est le cas par défaut dans beaucoup de
# conteneurs (CI, devcontainers) : on bascule alors sur un compte système dédié.
# Le rôle SQL reste `postgres` quel que soit l'utilisateur du système.
COMPTE_SYS="${PGSYSUSER:-calque-pg}"
SOUS=""
if [ "$(id -u)" -eq 0 ]; then
  if ! id -u "$COMPTE_SYS" >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "$COMPTE_SYS"
  fi
  mkdir -p "$PGDATA"
  chown -R "$COMPTE_SYS" "$PGDATA"
  SOUS="setpriv --reuid=$COMPTE_SYS --regid=$(id -g "$COMPTE_SYS") --clear-groups"
fi

demarrer() {
  if [ ! -d "$PGDATA/base" ]; then
    echo "→ Initialisation du cluster dans $PGDATA"
    mkdir -p "$PGDATA"
    $SOUS "$BIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
  fi

  if $SOUS "$BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "→ Cluster déjà démarré"
  else
    echo "→ Démarrage sur le port $PGPORT"
    $SOUS "$BIN/pg_ctl" -D "$PGDATA" -l "$LOG" \
      -o "-p $PGPORT -k $PGDATA -c listen_addresses=127.0.0.1" -w start >/dev/null
  fi

  if ! "$BIN/psql" -h 127.0.0.1 -p "$PGPORT" -U postgres -lqt | cut -d'|' -f1 | grep -qw "$PGDATABASE"; then
    echo "→ Création de la base « $PGDATABASE »"
    "$BIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U postgres "$PGDATABASE"
  fi

  echo "✓ Prêt."
  echo
  echo "  DATABASE_DRIVER=pg"
  echo "  DATABASE_URL=$URL"
}

case "${1:-start}" in
  start) demarrer ;;
  stop) $SOUS "$BIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null && echo "✓ Arrêté." ;;
  status) $SOUS "$BIN/pg_ctl" -D "$PGDATA" status ;;
  url) echo "$URL" ;;
  reset)
    $SOUS "$BIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    echo "✓ Cluster supprimé."
    ;;
  *)
    echo "Usage : $0 {start|stop|status|url|reset}" >&2
    exit 1
    ;;
esac
