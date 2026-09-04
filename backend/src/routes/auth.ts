import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, newId } from "../db";
import { users, intervenantProfiles } from "../db/schema";
import { signToken } from "../lib/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "ENTRAINEUR", "CONSEILLER", "MEMBRE"]).optional(),
  phone: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, firstName, lastName, role, phone } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return res.status(409).json({ error: "Email déjà utilisé" });

  const passwordHash = await bcrypt.hash(password, 10);
  const id = newId();
  const [user] = await db
    .insert(users)
    .values({ id, email, passwordHash, firstName, lastName, role: role || "MEMBRE", phone })
    .returning();

  if (user.role === "ENTRAINEUR" || user.role === "CONSEILLER") {
    await db.insert(intervenantProfiles).values({
      id: newId(),
      userId: user.id,
      specialty: user.role === "ENTRAINEUR" ? "Coach sportif" : "Conseiller sportif",
    });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: sanitize(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Identifiants invalides" });

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: sanitize(user) });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  if (!user) return res.status(404).json({ error: "Introuvable" });
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
