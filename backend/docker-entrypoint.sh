#!/bin/sh
set -e

echo "MouvPlus backend — application du schéma de base de données…"
npx drizzle-kit push --force

if [ "$SEED_ON_START" = "true" ]; then
  echo "MouvPlus backend — insertion des données de démonstration…"
  npx tsx src/db/seed.ts || echo "Seed déjà appliqué ou en erreur (ignoré)."
fi

exec "$@"
