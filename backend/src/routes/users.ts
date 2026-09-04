import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { users, intervenantProfiles } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const list = await db.select().from(users).orderBy(desc(users.createdAt));
  res.json(list.map(sanitize));
});

router.get("/:id", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!user) return res.status(404).json({ error: "Introuvable" });
  const [profile] = await db
    .select()
    .from(intervenantProfiles)
    .where(eq(intervenantProfiles.userId, user.id))
    .limit(1);
  res.json({ ...sanitize(user), intervenantProfile: profile || null });
});

router.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { firstName, lastName, phone, birthDate, bio } = req.body;
  const [user] = await db
    .update(users)
    .set({
      firstName,
      lastName,
      phone,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      bio,
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.userId!))
    .returning();
  res.json(sanitize(user));
});

router.patch("/me/password", requireAuth, async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  if (!user) return res.status(404).json({ error: "Introuvable" });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect" });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  res.json({ ok: true });
});

function sanitize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
