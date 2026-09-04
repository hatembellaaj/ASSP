import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, newId } from "../db";
import { gamificationEvents, badgeAwards, badges } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

function levelFromPoints(points: number) {
  const levels = [
    { name: "Débutant", min: 0, max: 100 },
    { name: "Actif", min: 100, max: 250 },
    { name: "Régulier", min: 250, max: 500 },
    { name: "Confirmé", min: 500, max: 1000 },
    { name: "Expert", min: 1000, max: Infinity },
  ];
  const current = levels.find((l) => points >= l.min && points < l.max) || levels[0];
  const progressPct =
    current.max === Infinity ? 100 : Math.round(((points - current.min) / (current.max - current.min)) * 100);
  return { ...current, progressPct };
}

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const events = await db.select().from(gamificationEvents).where(eq(gamificationEvents.userId, req.userId!));
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
  const awardRows = await db
    .select({ award: badgeAwards, badge: badges })
    .from(badgeAwards)
    .leftJoin(badges, eq(badgeAwards.badgeId, badges.id))
    .where(eq(badgeAwards.userId, req.userId!));

  res.json({
    totalPoints,
    level: levelFromPoints(totalPoints),
    recentEvents: [...events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10),
    badges: awardRows.map((r) => ({ ...r.award, badge: r.badge })),
  });
});

router.post("/award", requireAuth, async (req: AuthedRequest, res) => {
  const { userId, points, reason } = req.body;
  const [event] = await db
    .insert(gamificationEvents)
    .values({ id: newId(), userId: userId || req.userId!, points, reason })
    .returning();
  res.status(201).json(event);
});

export default router;
