import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, newId } from "../db";
import { icopeAssessments } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { computeIcopeScore } from "../utils/icope";

const router = Router();

router.get("/icope/:userId?", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.params.userId || req.userId!;
  const [latest] = await db
    .select()
    .from(icopeAssessments)
    .where(eq(icopeAssessments.userId, userId))
    .orderBy(desc(icopeAssessments.assessedAt))
    .limit(1);
  if (!latest) return res.json(null);
  res.json({ ...latest, score: computeIcopeScore(latest) });
});

router.get("/icope/:userId/history", requireAuth, async (req, res) => {
  const list = await db
    .select()
    .from(icopeAssessments)
    .where(eq(icopeAssessments.userId, req.params.userId))
    .orderBy(desc(icopeAssessments.assessedAt));
  res.json(list.map((a) => ({ ...a, score: computeIcopeScore(a) })));
});

router.post("/icope", requireAuth, requireRole("CONSEILLER", "ENTRAINEUR", "ADMIN"), async (req: AuthedRequest, res) => {
  const { userId, mobilite, nutrition, memoire, vision, audition, bienEtre } = req.body;
  const [assessment] = await db
    .insert(icopeAssessments)
    .values({ id: newId(), userId, assessedById: req.userId, mobilite, nutrition, memoire, vision, audition, bienEtre })
    .returning();
  res.status(201).json({ ...assessment, score: computeIcopeScore(assessment) });
});

export default router;
