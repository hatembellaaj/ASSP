import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { users, intervenantProfiles } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const list = await db.select().from(users).orderBy(desc(users.createdAt));
  res.json(list.map(sanitize));
});

// Liste légère des adhérents (pour planifier une séance)
router.get("/members", requireAuth, requireRole("ENTRAINEUR", "CONSEILLER", "ADMIN"), async (_req, res) => {
  const list = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(eq(users.role, "MEMBRE"))
    .orderBy(asc(users.lastName), asc(users.firstName));
  res.json(list);
});

function generatePassword() {
  return randomBytes(9).toString("base64url");
}

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  role: z.enum(["ADMIN", "ENTRAINEUR", "CONSEILLER", "MEMBRE"]),
  phone: z.string().trim().optional(),
});

// Création d'un compte par l'admin. Le mot de passe provisoire est renvoyé UNE fois.
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides (email, prénom, nom, rôle)" });
  const { email, firstName, lastName, role, phone } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return res.status(409).json({ error: "Un compte existe déjà avec cet email" });

  const password = generatePassword();
  const [user] = await db
    .insert(users)
    .values({
      id: newId(),
      email,
      firstName,
      lastName,
      role,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 10),
    })
    .returning();

  if (role === "ENTRAINEUR" || role === "CONSEILLER") {
    await db.insert(intervenantProfiles).values({
      id: newId(),
      userId: user.id,
      specialty: role === "ENTRAINEUR" ? "Coach sportif" : "Conseiller sportif",
    });
  }
  res.status(201).json({ user: sanitize(user), password });
});

router.post("/:id/reset-password", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!user) return res.status(404).json({ error: "Introuvable" });
  const password = generatePassword();
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  res.json({ email: user.email, password });
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
