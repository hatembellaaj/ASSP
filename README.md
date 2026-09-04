# MouvPlus — plateforme de visioconférence et entraînement sportif

Application complète (front + back + base de données) inspirée du cahier des charges MouvPlus et de la
plateforme existante (mouvplus.gerhom.com) : visioconférence de séances de coaching, espace Conseiller
sportif, espace Coach sportif, certification/formation des intervenants (Programmateur / Entraîneur /
Conseiller), road map produit, communauté, suivi santé (ICOPE), analyse InBody, progression musculaire,
gamification, clubs partenaires.

## Stack technique

- **Frontend** : React 19 + Vite + TypeScript + Tailwind CSS v4, React Router, TanStack Query
- **Backend** : Node.js + Express + TypeScript, authentification JWT
- **Base de données** : PostgreSQL 16, via **Drizzle ORM** (pur TypeScript, aucun binaire natif à
  télécharger — plus robuste que Prisma derrière un pare-feu réseau strict)
- **Visioconférence** : Jitsi Meet (service public `meet.jit.si` par défaut, gratuit et sans clé API ;
  remplaçable par une instance Jitsi auto-hébergée via la variable `JITSI_DOMAIN`)
- **Déploiement** : Docker + docker-compose (3 services : `postgres`, `backend`, `frontend`/nginx)

## Rôles

| Rôle | Correspond à | Accès principaux |
|---|---|---|
| `ADMIN` | Programmateur | Road Map, Certification/Formation, gestion des utilisateurs |
| `ENTRAINEUR` | Coach / Entraîneur sportif | Espace Coach sportif, séances, certification |
| `CONSEILLER` | Conseiller sportif | Espace Conseiller sportif (bilans ICOPE, InBody, programmes), certification |
| `MEMBRE` | Adhérent | Tableau de bord, séances, programme, progression, santé, InBody, coachs, communauté |

## Démarrage rapide (Docker)

Prérequis : Docker + Docker Compose sur votre serveur Linux.

```bash
cp .env.example .env
# éditez .env : mot de passe Postgres, JWT_SECRET, CORS_ORIGIN, etc.

docker compose up -d --build
```

Au premier démarrage, injectez les données de démonstration (comptes de test, clubs, séances...) :

```bash
# une seule fois :
docker compose exec backend npx tsx src/db/seed.ts
```

(ou passez `SEED_ON_START=true` dans `.env` avant le tout premier `docker compose up`, puis repassez-le à
`false` pour les démarrages suivants afin de ne pas ré-écraser vos données).

L'application est alors disponible sur `http://votre-serveur/` (port 80 par défaut, `FRONTEND_PORT` dans
`.env` pour changer), l'API sur `http://votre-serveur:4000/api` (`BACKEND_PORT`).

### Comptes de démonstration (après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Programmateur | admin@mouvplus.fr | admin123 |
| Entraîneur (Slim) | slim.abderrahim@mouvplus.fr | coach123 |
| Conseiller sportif | conseiller@mouvplus.fr | conseiller123 |
| Adhérent (Hsan) | hsan.soussou@mouvplus.fr | membre123 |

**Changez ces mots de passe / supprimez ces comptes avant toute mise en production réelle.**

## Structure du projet

```
mouvplus/
  backend/          API Express + Drizzle ORM
    src/
      db/           schéma Drizzle, client DB, script de seed
      routes/       une route par module (auth, sessions, community, health, inbody, ...)
      middleware/   auth JWT + contrôle de rôle
      utils/        Jitsi, calcul score ICOPE, recommandations InBody
    Dockerfile
  frontend/         React + Vite + Tailwind
    src/
      pages/        une page par module (Dashboard, Community, Sessions, ConseillerSpace, ...)
      components/   Layout (sidebar par rôle), UI kit, intégration Jitsi
    Dockerfile
    nginx.conf       reverse-proxy /api -> backend, sert le build statique
  docker-compose.yml
  .env.example
```

## Développement local (sans Docker)

Backend :

```bash
cd backend
cp .env.example .env   # adapter DATABASE_URL vers votre Postgres local
npm install
npm run db:push        # applique le schéma
npm run seed            # données de démonstration
npm run dev              # démarre sur http://localhost:4000
```

Frontend :

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev               # démarre sur http://localhost:5173
```

## Notes de conception

- **Pourquoi Drizzle plutôt que Prisma ?** Prisma télécharge des moteurs binaires natifs depuis
  `binaries.prisma.sh` au moment des migrations ; sur un réseau d'entreprise filtré, ce téléchargement peut
  échouer et bloquer tout le déploiement. Drizzle est 100% TypeScript/JS et ne dépend d'aucun binaire
  externe, ce qui le rend plus fiable à déployer en conteneur derrière un pare-feu strict.
- **Visioconférence** : chaque séance/réunion génère une "room" Jitsi unique (`mouvplus-seance-xxxxx`). Le
  frontend charge le SDK `external_api.js` de Jitsi et l'affiche en plein écran. Passez à une instance Jitsi
  auto-hébergée (ou à un autre prestataire) en changeant simplement `JITSI_DOMAIN`.
- **Recommandations InBody "IA"** : génération par règles métier (IMC, % masse grasse, graisse viscérale,
  masse musculaire relative) adaptées à un public sénior — pas d'appel à un modèle externe, donc aucun coût
  ni clé API à gérer. Peut être remplacé par un vrai appel LLM plus tard sans changer le reste de
  l'architecture (le point d'entrée est `backend/src/utils/inbodyAi.ts`).
- **Sécurité** : mots de passe hashés (bcrypt), JWT, contrôle d'accès par rôle sur chaque route sensible.
  Pensez à changer `JWT_SECRET` et tous les mots de passe de démonstration avant mise en production.
