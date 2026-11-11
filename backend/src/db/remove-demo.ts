/**
 * Supprime les comptes de démonstration créés par seed.ts, ainsi que tout ce
 * qui leur appartient (séances, publications, bilans, réunions…).
 * Les clubs, programmes, badges et la road map sont conservés.
 *
 * Par sécurité, refuse de s'exécuter tant qu'aucun vrai compte ADMIN n'existe
 * (créez-le d'abord avec create-user.ts), pour ne pas vous retrouver sans accès.
 *
 *   docker compose exec backend npx tsx src/db/remove-demo.ts
 */
import "dotenv/config";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db, pool } from "./index";
import {
  users,
  programAssignments,
  icopeAssessments,
  muscleEvaluations,
  roadmapItems,
} from "./schema";

const DEMO_EMAILS = [
  "admin@mouvplus.fr",
  "slim.abderrahim@mouvplus.fr",
  "marc.leblanc@mouvplus.fr",
  "sophie.martin@mouvplus.fr",
  "jp.dubois@mouvplus.fr",
  "isabelle.bernard@mouvplus.fr",
  "thomas.rousseau@mouvplus.fr",
  "conseiller@mouvplus.fr",
  "hsan.soussou@mouvplus.fr",
  "ramzi.cherif@mouvplus.fr",
  "leila.cherifabselli@mouvplus.fr",
  "annette.monnier@mouvplus.fr",
];

async function main() {
  const realAdmins = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), notInArray(users.email, DEMO_EMAILS)));
  if (realAdmins.length === 0) {
    console.error(
      "Aucun vrai compte ADMIN trouvé. Créez-le d'abord :\n" +
        "  npx tsx src/db/create-user.ts --role ADMIN --email <email> --first <prénom> --last <nom>"
    );
    process.exit(1);
  }

  const demo = await db.select({ id: users.id }).from(users).where(inArray(users.email, DEMO_EMAILS));
  if (demo.length === 0) {
    console.log("Aucun compte de démonstration à supprimer.");
    return;
  }
  const ids = demo.map((u) => u.id);

  await db.transaction(async (tx) => {
    // Références sans suppression en cascade : on les détache avant de supprimer.
    await tx.update(programAssignments).set({ assignedById: null }).where(inArray(programAssignments.assignedById, ids));
    await tx.update(icopeAssessments).set({ assessedById: null }).where(inArray(icopeAssessments.assessedById, ids));
    await tx.update(muscleEvaluations).set({ assessedById: null }).where(inArray(muscleEvaluations.assessedById, ids));
    await tx.update(roadmapItems).set({ authorId: null }).where(inArray(roadmapItems.authorId, ids));
    await tx.delete(users).where(inArray(users.id, ids));
  });

  console.log(`${ids.length} compte(s) de démonstration supprimé(s).`);
  console.log(`Comptes ADMIN restants : ${realAdmins.map((a) => a.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
