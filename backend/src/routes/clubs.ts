import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { clubs } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const list = await db.select().from(clubs).orderBy(asc(clubs.name));
  res.json(list);
});

router.get("/:id", requireAuth, async (req, res) => {
  const [club] = await db.select().from(clubs).where(eq(clubs.id, req.params.id)).limit(1);
  if (!club) return res.status(404).json({ error: "Introuvable" });
  res.json(club);
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, city, postalCode, address, phone, amenities, description } = req.body;
  const [club] = await db
    .insert(clubs)
    .values({ id: newId(), name, city, postalCode, address, phone, amenities: amenities || [], description })
    .returning();
  res.status(201).json(club);
});

export default router;
