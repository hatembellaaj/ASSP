import { Router } from "express";
import { eq, and, gte, lt, desc, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { sessionsTable, users } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom, jitsiUrl } from "../utils/jitsi";
import { alias } from "drizzle-orm/pg-core";

const router = Router();
const memberAlias = alias(users, "member_u");
const coachAlias = alias(users, "coach_u");

function computeStatus(scheduledAt: Date, durationMin: number, current: string): string {
  if (current === "ANNULEE" || current === "EFFECTUEE") return current;
  const now = new Date();
  const end = new Date(scheduledAt.getTime() + durationMin * 60000);
  if (now > end) return "EFFECTUEE";
  const diffMin = (scheduledAt.getTime() - now.getTime()) / 60000;
  if (diffMin <= 60 && diffMin >= -durationMin) return "IMMINENTE";
  return current === "A_CONFIRMER" ? "A_CONFIRMER" : "PLANIFIEE";
}

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const isIntervenant = req.userRole === "ENTRAINEUR" || req.userRole === "CONSEILLER";
  const whereClause = isIntervenant
    ? eq(sessionsTable.coachId, req.userId!)
    : eq(sessionsTable.memberId, req.userId!);

  const rows = await db
    .select({
      session: sessionsTable,
      member: { id: memberAlias.id, firstName: memberAlias.firstName, lastName: memberAlias.lastName },
      coach: { id: coachAlias.id, firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(memberAlias, eq(sessionsTable.memberId, memberAlias.id))
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(whereClause)
    .orderBy(desc(sessionsTable.scheduledAt));

  const result = rows.map((r) => ({
    ...r.session,
    status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
    joinUrl: jitsiUrl(r.session.jitsiRoom),
    member: r.member,
    coach: r.coach,
  }));

  res.json(result);
});

router.get("/calendar", requireAuth, async (req: AuthedRequest, res) => {
  const { month, year } = req.query;
  const y = year ? Number(year) : new Date().getFullYear();
  const m = month ? Number(month) : new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const isIntervenant = req.userRole === "ENTRAINEUR" || req.userRole === "CONSEILLER";
  const personClause = isIntervenant
    ? eq(sessionsTable.coachId, req.userId!)
    : eq(sessionsTable.memberId, req.userId!);

  const rows = await db
    .select({
      session: sessionsTable,
      coach: { firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(and(personClause, gte(sessionsTable.scheduledAt, start), lt(sessionsTable.scheduledAt, end)))
    .orderBy(asc(sessionsTable.scheduledAt));

  res.json(
    rows.map((r) => ({
      ...r.session,
      status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
      coach: r.coach,
    }))
  );
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { coachId, memberId, type, scheduledAt, durationMin, notes } = req.body;
  const effectiveMemberId = req.userRole === "MEMBRE" ? req.userId! : memberId;
  const room = generateJitsiRoom("seance");

  const [session] = await db
    .insert(sessionsTable)
    .values({
      id: newId(),
      coachId,
      memberId: effectiveMemberId,
      type: type || "INDIVIDUEL",
      scheduledAt: new Date(scheduledAt),
      durationMin: durationMin || 45,
      status: "A_CONFIRMER",
      jitsiRoom: room,
      notes,
    })
    .returning();
  res.status(201).json({ ...session, joinUrl: jitsiUrl(room) });
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const [session] = await db
    .update(sessionsTable)
    .set({ status })
    .where(eq(sessionsTable.id, req.params.id))
    .returning();
  res.json(session);
});

router.get("/:id/join", requireAuth, async (req, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!session) return res.status(404).json({ error: "Introuvable" });
  res.json({ joinUrl: jitsiUrl(session.jitsiRoom), room: session.jitsiRoom });
});

export default router;
