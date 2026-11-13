import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import { db, newId } from "../db";
import { users, intervenantProfiles, notifications } from "../db/schema";
import { ONBOARDING, cleanAvailability } from "../utils/onboarding";
import { signToken } from "../lib/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").max(200),
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  phone: z.string().trim().max(30).optional(),
  // Disponibilités : { lun: ["matin", "soir"], … } et précisions libres
  availability: z.record(z.array(z.string())).optional(),
  availabilityNote: z.string().trim().max(500).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides" });
  const { email, password, firstName, lastName, phone, availability, availabilityNote } = parsed.data;
  // Inscription publique : toujours un compte Adhérent. Les comptes coach /
  // conseiller / admin se créent côté serveur (src/db/create-user.ts).
  const role = "MEMBRE" as const;

  const [existing] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing) return res.status(409).json({ error: "Un compte existe déjà avec cet email. Connectez-vous." });

  const passwordHash = await bcrypt.hash(password, 10);
  const id = newId();
  // Parcours : le nouveau client voit d'abord un conseiller sportif (le premier conseiller du club).
  const conseillers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "CONSEILLER"))
    .orderBy(asc(users.createdAt));
  const [user] = await db
    .insert(users)
    .values({
      id,
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone: phone || null,
      onboarding: ONBOARDING.A_CONTACTER,
      availability: cleanAvailability(availability),
      availabilityNote: availabilityNote || null,
      conseillerId: conseillers[0]?.id ?? null,
    })
    .returning();

  if (conseillers.length) {
    await db.insert(notifications).values(
      conseillers.map((c) => ({
        id: newId(),
        userId: c.id,
        message: `Nouveau client à contacter : ${firstName} ${lastName}${phone ? ` (${phone})` : ""}`,
      }))
    );
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
  if (!parsed.success) return res.status(400).json({ error: "Email ou mot de passe manquant" });
  const { email, password } = parsed.data;

  // Insensible à la casse : « Jean@Exemple.fr » = « jean@exemple.fr »
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
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
