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
- **Visioconférence** : Jitsi Meet **auto-hébergé** (4 conteneurs officiels dans `docker-compose.yml`,
  gratuit, sans limite de durée), accès réservé aux utilisateurs MouvPlus par jeton JWT
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

L'application est alors disponible sur `http://votre-serveur:18400/` (`FRONTEND_PORT` dans `.env` pour
changer), l'API sur `http://votre-serveur:18401/api` (`BACKEND_PORT`). Ces ports par défaut ont été choisis
pour ne pas entrer en conflit avec d'autres conteneurs déjà présents sur un serveur partagé — vérifiez avec
`sudo docker ps` et ajustez `BACKEND_PORT`/`FRONTEND_PORT` dans `.env` si l'un d'eux est déjà pris.

### Visioconférence auto-hébergée (Jitsi)

Les services `jitsi-web`, `jitsi-prosody`, `jitsi-jicofo` et `jitsi-jvb` démarrent avec le reste de la stack.
Avant le premier `docker compose up` :

1. **DNS** : créez un enregistrement `A` pour `meet.mouvplus.com` (valeur de `JITSI_DOMAIN`) vers l'IP du
   serveur. nginx-proxy + letsencrypt-companion génèrent le certificat HTTPS automatiquement.
2. **Pare-feu** : ouvrez le port **UDP 10000** (flux audio/vidéo ; il ne passe pas par nginx-proxy) :
   `sudo ufw allow 10000/udp` (et dans le pare-feu de l'hébergeur s'il y en a un).
3. **`.env`** : renseignez `JITSI_PUBLIC_IP` (`curl -4 ifconfig.me`) et générez les trois secrets
   `JITSI_APP_SECRET`, `JITSI_JICOFO_PASSWORD`, `JITSI_JVB_PASSWORD` avec `openssl rand -hex 32`.
   `docker compose` refuse de démarrer tant qu'ils sont vides.
4. `docker compose up -d --build`, puis vérifiez que https://meet.mouvplus.com répond.

⚠️ **Le site doit être ouvert en HTTPS** (`https://mouvplus.com`) : les navigateurs bloquent caméra et
micro sur une page HTTP comme `http://mouvplus.com:18400`.

Une salle ouverte directement sur `https://meet.mouvplus.com/...` sans passer par l'application est
refusée : seul le backend MouvPlus peut délivrer l'accès.

### Comptes utilisateurs et séances

Au quotidien, l'administrateur crée les comptes depuis le site : **Utilisateurs → + Ajouter un utilisateur**
(rôle *Adhérent* pour les personnes qui s'entraînent, *Entraîneur* pour le coach). Le mot de passe provisoire
s'affiche une fois ; « Réinitialiser le mot de passe » en génère un nouveau. Le coach planifie ensuite les
séances visio depuis **Espace Coach sportif → + Planifier une séance** ; elles apparaissent chez l'adhérent dans
« Mes séances » avec le bouton « Rejoindre ».

Le tout premier compte ADMIN (et tout compte en dépannage) se crée depuis le serveur (le mot de passe généré s'affiche une seule fois ; il se change
ensuite dans « Mon profil ») :

```bash
sudo docker compose exec backend npx tsx src/db/create-user.ts --role ADMIN --email vous@exemple.fr --first Prénom --last Nom
sudo docker compose exec backend npx tsx src/db/create-user.ts --role ENTRAINEUR --email coach@exemple.fr --first Prénom --last Nom
sudo docker compose exec backend npx tsx src/db/create-user.ts --role MEMBRE --email adherent@exemple.fr --first Prénom --last Nom
```

Relancer la commande sur un email existant réinitialise son mot de passe.

Le seed (`src/db/seed.ts`) crée des comptes et données **de démonstration** (`admin@mouvplus.fr`, etc.) et
**vide toute la base** avant : ne l'exécutez jamais en production et laissez `SEED_ON_START=false`. Pour
supprimer les comptes de démonstration (après avoir créé votre propre compte ADMIN) :

```bash
sudo docker compose exec backend npx tsx src/db/remove-demo.ts
```

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
- **Visioconférence** : chaque séance/réunion génère une "room" Jitsi unique (`mouvplus-seance-xxxxx`). Au
  clic sur « Rejoindre », le frontend appelle `GET /api/sessions/:id/join` (ou `/api/meetings/:id/join`) :
  le backend vérifie que l'utilisateur participe, puis renvoie le domaine Jitsi, la salle et un jeton signé
  (valable 4 h, pour cette salle uniquement ; `moderator: true` pour le coach / l'organisateur). Le frontend
  charge `external_api.js` depuis ce domaine et affiche la visio en plein écran.
- **Recommandations InBody "IA"** : génération par règles métier (IMC, % masse grasse, graisse viscérale,
  masse musculaire relative) adaptées à un public sénior — pas d'appel à un modèle externe, donc aucun coût
  ni clé API à gérer. Peut être remplacé par un vrai appel LLM plus tard sans changer le reste de
  l'architecture (le point d'entrée est `backend/src/utils/inbodyAi.ts`).
- **Sécurité** : mots de passe hashés (bcrypt), JWT, contrôle d'accès par rôle sur chaque route sensible.
  Pensez à changer `JWT_SECRET` et tous les mots de passe de démonstration avant mise en production.
