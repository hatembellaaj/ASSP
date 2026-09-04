import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, newId } from "../db";
import { muscleEvaluations } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/muscles/:userId?", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.params.userId || req.userId!;
  const evaluations = await db.select().from(muscleEvaluations).where(eq(muscleEvaluations.userId, userId));
  res.json(evaluations);
});

router.post(
  "/muscles",
  requireAuth,
  requireRole("CONSEILLER", "ENTRAINEUR", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const { userId, region, side, level } = req.body;
    const [evaluation] = await db
      .insert(muscleEvaluations)
      .values({ id: newId(), userId, region, side, level, assessedById: req.userId })
      .onConflictDoUpdate({
        target: [muscleEvaluations.userId, muscleEvaluations.region, muscleEvaluations.side],
        set: { level, assessedById: req.userId, evaluatedAt: new Date() },
      })
      .returning();
    res.status(201).json(evaluation);
  }
);

export default router;
