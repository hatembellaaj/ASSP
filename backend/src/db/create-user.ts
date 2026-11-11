/**
 * Crée (ou réinitialise le mot de passe d') un vrai compte.
 *
 *   docker compose exec backend npx tsx src/db/create-user.ts \
 *     --role ADMIN --email vous@exemple.fr --first Prénom --last Nom
 *
 * Rôles : ADMIN | ENTRAINEUR | CONSEILLER | MEMBRE.
 * Le mot de passe est généré aléatoirement et affiché une seule fois
 * (à changer ensuite depuis « Mon profil »). Ajoutez --password <mdp> pour le choisir.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, newId, pool } from "./index";
import { users, intervenantProfiles } from "./schema";

const ROLES = ["ADMIN", "ENTRAINEUR", "CONSEILLER", "MEMBRE"] as const;
type Role = (typeof ROLES)[number];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const firstName = arg("first");
  const lastName = arg("last");
  const role = (arg("role") || "MEMBRE").toUpperCase() as Role;
  const password = arg("password") || randomBytes(9).toString("base64url");

  if (!email || !firstName || !lastName || !ROLES.includes(role)) {
    console.error(
      "Usage : npx tsx src/db/create-user.ts --role ADMIN|ENTRAINEUR|CONSEILLER|MEMBRE " +
        "--email <email> --first <prénom> --last <nom> [--password <mdp>]"
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let userId: string;
  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, firstName, lastName, role, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    userId = existing.id;
    console.log(`Compte existant mis à jour : ${email} (${role})`);
  } else {
    userId = newId();
    await db.insert(users).values({ id: userId, email, passwordHash, firstName, lastName, role });
    console.log(`Compte créé : ${email} (${role})`);
  }

  if (role === "ENTRAINEUR" || role === "CONSEILLER") {
    const [profile] = await db
      .select()
      .from(intervenantProfiles)
      .where(eq(intervenantProfiles.userId, userId))
      .limit(1);
    if (!profile) {
      await db.insert(intervenantProfiles).values({
        id: newId(),
        userId,
        specialty: role === "ENTRAINEUR" ? "Coach sportif" : "Conseiller sportif",
      });
    }
  }

  console.log(`Mot de passe : ${password}`);
  console.log("Notez-le maintenant : il ne sera plus affiché.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
