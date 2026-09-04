import { Router } from "express";
import { eq, inArray, ilike, and } from "drizzle-orm";
import { db } from "../db";
import { users, intervenantProfiles } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { specialty } = req.query;

  const rows = await db
    .select({ user: users, profile: intervenantProfiles })
    .from(users)
    .leftJoin(intervenantProfiles, eq(intervenantProfiles.userId, users.id))
    .where(inArray(users.role, ["ENTRAINEUR", "CONSEILLER"]));

  let result = rows.map((r) => ({ ...sanitize(r.user), intervenantProfile: r.profile || null }));
  if (specialty) {
    const q = String(specialty).toLowerCase();
    result = result.filter((r) => r.intervenantProfile?.specialty?.toLowerCase().includes(q));
  }
  res.json(result);
});

router.get("/:id", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!user || !["ENTRAINEUR", "CONSEILLER"].includes(user.role)) {
    return res.status(404).json({ error: "Introuvable" });
  }
  const [profile] = await db
    .select()
    .from(intervenantProfiles)
    .where(eq(intervenantProfiles.userId, user.id))
    .limit(1);
  res.json({ ...sanitize(user), intervenantProfile: profile || null });
});

function sanitize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
