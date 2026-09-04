import { Router } from "express";
import { eq, and, gte, count, desc, asc } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  sessionsTable,
  icopeAssessments,
  subscriptions,
  gamificationEvents,
  muscleEvaluations,
} from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { computeIcopeScore } from "../utils/icope";
import { alias } from "drizzle-orm/pg-core";

const router = Router();
const coachAlias = alias(users, "coach_u");

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  const doneSessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.memberId, userId), eq(sessionsTable.status, "EFFECTUEE")));

  const monthSessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.memberId, userId), gte(sessionsTable.scheduledAt, monthStart)));

  const [latestIcope] = await db
    .select()
    .from(icopeAssessments)
    .where(eq(icopeAssessments.userId, userId))
    .orderBy(desc(icopeAssessments.assessedAt))
    .limit(1);

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.startDate))
    .limit(1);

  const gamEvents = await db.select().from(gamificationEvents).where(eq(gamificationEvents.userId, userId));
  const muscleEvals = await db.select().from(muscleEvaluations).where(eq(muscleEvaluations.userId, userId));

  const nextSessionsRows = await db
    .select({
      session: sessionsTable,
      coach: { firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(and(eq(sessionsTable.memberId, userId), gte(sessionsTable.scheduledAt, now)))
    .orderBy(asc(sessionsTable.scheduledAt))
    .limit(5);

  const totalPoints = gamEvents.reduce((s, e) => s + e.points, 0);

  res.json({
    user: user ? { firstName: user.firstName, lastName: user.lastName, plan: user.plan } : null,
    stats: {
      seancesEffectuees: doneSessions.length,
      seancesCeMois: monthSessions.length,
      scoreIcope: latestIcope ? computeIcopeScore(latestIcope) : null,
      scoreIcopeMax: 24,
      engagementPoints: totalPoints,
    },
    abonnement: sub || null,
    icope: latestIcope ? { ...latestIcope, score: computeIcopeScore(latestIcope) } : null,
    muscleEvaluationsCount: muscleEvals.length,
    prochainesSeances: nextSessionsRows.map((r) => ({ ...r.session, coach: r.coach })),
  });
});

export default router;
