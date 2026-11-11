import { Router } from "express";
import { eq, and, gte, lt, desc, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { sessionsTable, users, notifications } from "../db/schema";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom, jitsiUrl, jitsiJoinInfo } from "../utils/jitsi";
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

const createSchema = z.object({
  memberId: z.string().optional(),
  coachId: z.string().optional(),
  type: z.enum(["INDIVIDUEL", "GROUPE"]).optional(),
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
  durationMin: z.number().int().min(15).max(180).optional(),
  notes: z.string().max(2000).optional(),
});

// Planifier une séance.
// - Coach / conseiller : il est le coach de la séance, choisit l'adhérent → « Planifiée ».
// - Admin : choisit coach et adhérent → « Planifiée ».
// - Adhérent : demande une séance à un coach → « À confirmer ».
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const body = parsed.data;

  const isIntervenant = req.userRole === "ENTRAINEUR" || req.userRole === "CONSEILLER";
  const coachId = isIntervenant ? req.userId! : body.coachId;
  const memberId = req.userRole === "MEMBRE" ? req.userId! : body.memberId;
  if (!coachId || !memberId) return res.status(400).json({ error: "Coach et adhérent requis" });

  const [coach] = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
  const [member] = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
  if (!coach || !["ENTRAINEUR", "CONSEILLER"].includes(coach.role)) {
    return res.status(400).json({ error: "Coach introuvable" });
  }
  if (!member || member.role !== "MEMBRE") return res.status(400).json({ error: "Adhérent introuvable" });

  const scheduledAt = new Date(body.scheduledAt);
  if (scheduledAt.getTime() < Date.now() - 5 * 60000) {
    return res.status(400).json({ error: "La date de la séance est déjà passée" });
  }

  const room = generateJitsiRoom("seance");
  const [session] = await db
    .insert(sessionsTable)
    .values({
      id: newId(),
      coachId,
      memberId,
      type: body.type || "INDIVIDUEL",
      scheduledAt,
      durationMin: body.durationMin || 45,
      status: req.userRole === "MEMBRE" ? "A_CONFIRMER" : "PLANIFIEE",
      jitsiRoom: room,
      notes: body.notes,
    })
    .returning();

  await db.insert(notifications).values({
    id: newId(),
    userId: req.userRole === "MEMBRE" ? coachId : memberId,
    message:
      req.userRole === "MEMBRE"
        ? `Nouvelle demande de séance de ${member.firstName} ${member.lastName}`
        : `Nouvelle séance planifiée avec ${coach.firstName} ${coach.lastName}`,
  });

  res.status(201).json({ ...session, joinUrl: jitsiUrl(room) });
});

const STATUSES = ["PLANIFIEE", "A_CONFIRMER", "EFFECTUEE", "ANNULEE"] as const;

router.patch("/:id/status", requireAuth, async (req: AuthedRequest, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Statut invalide" });

  const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Introuvable" });
  const isCoach = existing.coachId === req.userId;
  const isMember = existing.memberId === req.userId;
  // L'adhérent peut seulement annuler ; le coach et l'admin peuvent tout changer.
  if (!(isCoach || req.userRole === "ADMIN" || (isMember && status === "ANNULEE"))) {
    return res.status(403).json({ error: "Action non autorisée" });
  }

  const [session] = await db
    .update(sessionsTable)
    .set({ status })
    .where(eq(sessionsTable.id, req.params.id))
    .returning();
  res.json(session);
});

router.get("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!session) return res.status(404).json({ error: "Introuvable" });

  const isCoach = session.coachId === req.userId;
  const isMember = session.memberId === req.userId;
  if (!isCoach && !isMember && req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Vous ne participez pas à cette séance" });
  }
  if (session.status === "ANNULEE") return res.status(409).json({ error: "Séance annulée" });

  const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  res.json(jitsiJoinInfo(session.jitsiRoom, me, isCoach || req.userRole === "ADMIN"));
});

export default router;
