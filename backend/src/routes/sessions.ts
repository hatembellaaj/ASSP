import { Router } from "express";
import { eq, and, gte, lt, desc, asc, inArray } from "drizzle-orm";
import { db, newId } from "../db";
import { sessionsTable, sessionParticipants, users, notifications } from "../db/schema";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom, jitsiUrl, jitsiJoinInfo } from "../utils/jitsi";
import { participantsBySession, sessionIdsOfMember } from "../utils/sessionParticipants";
import { alias } from "drizzle-orm/pg-core";

const router = Router();
const coachAlias = alias(users, "coach_u");

/** Nombre maximum d'adhérents dans une séance (au-delà, la visio devient lourde sur téléphone). */
export const MAX_PARTICIPANTS = 20;

function computeStatus(scheduledAt: Date, durationMin: number, current: string): string {
  if (current === "ANNULEE" || current === "EFFECTUEE") return current;
  const now = new Date();
  const end = new Date(scheduledAt.getTime() + durationMin * 60000);
  if (now > end) return "EFFECTUEE";
  const diffMin = (scheduledAt.getTime() - now.getTime()) / 60000;
  if (diffMin <= 60 && diffMin >= -durationMin) return "IMMINENTE";
  return current === "A_CONFIRMER" ? "A_CONFIRMER" : "PLANIFIEE";
}

const isIntervenantRole = (role?: string) => role === "ENTRAINEUR" || role === "CONSEILLER";

/** Séances visibles par l'utilisateur : celles qu'il anime (coach) ou auxquelles il participe (adhérent). */
function visibleSessionsClause(req: AuthedRequest) {
  return isIntervenantRole(req.userRole)
    ? eq(sessionsTable.coachId, req.userId!)
    : inArray(sessionsTable.id, sessionIdsOfMember(req.userId!));
}

async function isParticipant(sessionId: string, memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sessionParticipants.sessionId })
    .from(sessionParticipants)
    .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.memberId, memberId)))
    .limit(1);
  return !!row;
}

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db
    .select({
      session: sessionsTable,
      coach: { id: coachAlias.id, firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(visibleSessionsClause(req))
    .orderBy(desc(sessionsTable.scheduledAt));

  const participants = await participantsBySession(rows.map((r) => r.session.id));

  res.json(
    rows.map((r) => {
      const list = participants.get(r.session.id) || [];
      return {
        ...r.session,
        status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
        joinUrl: jitsiUrl(r.session.jitsiRoom),
        coach: r.coach,
        participants: list,
        // Compatibilité : premier participant
        member: list[0] || null,
      };
    })
  );
});

router.get("/calendar", requireAuth, async (req: AuthedRequest, res) => {
  const { month, year } = req.query;
  const y = year ? Number(year) : new Date().getFullYear();
  const m = month ? Number(month) : new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const rows = await db
    .select({
      session: sessionsTable,
      coach: { firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(and(visibleSessionsClause(req), gte(sessionsTable.scheduledAt, start), lt(sessionsTable.scheduledAt, end)))
    .orderBy(asc(sessionsTable.scheduledAt));

  const participants = await participantsBySession(rows.map((r) => r.session.id));

  res.json(
    rows.map((r) => ({
      ...r.session,
      status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
      coach: r.coach,
      participants: participants.get(r.session.id) || [],
    }))
  );
});

const createSchema = z.object({
  memberIds: z.array(z.string()).min(1).max(MAX_PARTICIPANTS).optional(),
  // Ancien format (un seul adhérent), toujours accepté
  memberId: z.string().optional(),
  coachId: z.string().optional(),
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
  durationMin: z.number().int().min(15).max(180).optional(),
  notes: z.string().max(2000).optional(),
});

// Planifier une séance.
// - Coach / conseiller : il est le coach de la séance, choisit un ou plusieurs adhérents → « Planifiée ».
// - Admin : choisit le coach et les adhérents → « Planifiée ».
// - Adhérent : demande une séance individuelle à un coach → « À confirmer ».
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const body = parsed.data;

  const isMembre = req.userRole === "MEMBRE";
  const coachId = isIntervenantRole(req.userRole) ? req.userId! : body.coachId;
  const memberIds = isMembre
    ? [req.userId!]
    : [...new Set(body.memberIds || (body.memberId ? [body.memberId] : []))];
  if (!coachId) return res.status(400).json({ error: "Coach requis" });
  if (memberIds.length === 0) return res.status(400).json({ error: "Choisissez au moins un adhérent" });
  if (memberIds.length > MAX_PARTICIPANTS) {
    return res.status(400).json({ error: `${MAX_PARTICIPANTS} participants maximum par séance` });
  }

  const [coach] = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
  if (!coach || !isIntervenantRole(coach.role)) return res.status(400).json({ error: "Coach introuvable" });

  const members = await db.select().from(users).where(inArray(users.id, memberIds));
  if (members.length !== memberIds.length || members.some((m) => m.role !== "MEMBRE")) {
    return res.status(400).json({ error: "Adhérent introuvable" });
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (scheduledAt.getTime() < Date.now() - 5 * 60000) {
    return res.status(400).json({ error: "La date de la séance est déjà passée" });
  }

  const room = generateJitsiRoom("seance");
  const session = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(sessionsTable)
      .values({
        id: newId(),
        coachId,
        memberId: null,
        type: memberIds.length > 1 ? "GROUPE" : "INDIVIDUEL",
        scheduledAt,
        durationMin: body.durationMin || 45,
        status: isMembre ? "A_CONFIRMER" : "PLANIFIEE",
        jitsiRoom: room,
        notes: body.notes,
      })
      .returning();

    await tx.insert(sessionParticipants).values(memberIds.map((memberId) => ({ sessionId: created.id, memberId })));

    await tx.insert(notifications).values(
      isMembre
        ? [{ id: newId(), userId: coachId, message: `Nouvelle demande de séance de ${members[0].firstName} ${members[0].lastName}` }]
        : memberIds.map((userId) => ({
            id: newId(),
            userId,
            message:
              memberIds.length > 1
                ? `Nouvelle séance de groupe planifiée avec ${coach.firstName} ${coach.lastName}`
                : `Nouvelle séance planifiée avec ${coach.firstName} ${coach.lastName}`,
          }))
    );
    return created;
  });

  const participants = (await participantsBySession([session.id])).get(session.id) || [];
  res.status(201).json({ ...session, participants, joinUrl: jitsiUrl(room) });
});

const participantsSchema = z.object({ memberIds: z.array(z.string()).min(1).max(MAX_PARTICIPANTS) });

// Modifier la liste des participants (coach de la séance ou admin).
router.put("/:id/participants", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = participantsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: `Entre 1 et ${MAX_PARTICIPANTS} adhérents` });
  }
  const memberIds = [...new Set(parsed.data.memberIds)];

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!session) return res.status(404).json({ error: "Introuvable" });
  if (session.coachId !== req.userId && req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Action non autorisée" });
  }
  if (session.status === "ANNULEE") return res.status(409).json({ error: "Séance annulée" });

  const members = await db.select().from(users).where(inArray(users.id, memberIds));
  if (members.length !== memberIds.length || members.some((m) => m.role !== "MEMBRE")) {
    return res.status(400).json({ error: "Adhérent introuvable" });
  }

  const before = await db
    .select({ memberId: sessionParticipants.memberId })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, session.id));
  const added = memberIds.filter((id) => !before.some((b) => b.memberId === id));

  const [coach] = await db.select().from(users).where(eq(users.id, session.coachId)).limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, session.id));
    await tx.insert(sessionParticipants).values(memberIds.map((memberId) => ({ sessionId: session.id, memberId })));
    await tx
      .update(sessionsTable)
      .set({ type: memberIds.length > 1 ? "GROUPE" : "INDIVIDUEL", memberId: null })
      .where(eq(sessionsTable.id, session.id));
    if (added.length > 0) {
      await tx.insert(notifications).values(
        added.map((userId) => ({
          id: newId(),
          userId,
          message: `Vous avez été ajouté à une séance avec ${coach?.firstName ?? ""} ${coach?.lastName ?? ""}`.trim(),
        }))
      );
    }
  });

  const participants = (await participantsBySession([session.id])).get(session.id) || [];
  res.json({ id: session.id, participants });
});

const STATUSES = ["PLANIFIEE", "A_CONFIRMER", "EFFECTUEE", "ANNULEE"] as const;

router.patch("/:id/status", requireAuth, async (req: AuthedRequest, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Statut invalide" });

  const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Introuvable" });
  const isCoach = existing.coachId === req.userId;

  // Le coach et l'admin peuvent tout changer. Un adhérent peut seulement annuler
  // une séance dont il est l'unique participant (pas une séance de groupe).
  let allowed = isCoach || req.userRole === "ADMIN";
  if (!allowed && status === "ANNULEE" && (await isParticipant(existing.id, req.userId!))) {
    const all = await db
      .select({ memberId: sessionParticipants.memberId })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, existing.id));
    allowed = all.length === 1;
  }
  if (!allowed) return res.status(403).json({ error: "Action non autorisée" });

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
  const allowed = isCoach || req.userRole === "ADMIN" || (await isParticipant(session.id, req.userId!));
  if (!allowed) return res.status(403).json({ error: "Vous ne participez pas à cette séance" });
  if (session.status === "ANNULEE") return res.status(409).json({ error: "Séance annulée" });

  const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  // Seul le coach (ou l'admin) est modérateur de la salle.
  res.json(jitsiJoinInfo(session.jitsiRoom, me, isCoach || req.userRole === "ADMIN"));
});

export default router;
