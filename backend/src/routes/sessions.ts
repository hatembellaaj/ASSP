import { Router } from "express";
import { eq, and, gte, lt, desc, asc, inArray, or, ne } from "drizzle-orm";
import { db, newId } from "../db";
import { sessionsTable, sessionParticipants, users, notifications } from "../db/schema";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom, jitsiUrl, jitsiJoinInfo } from "../utils/jitsi";
import { participantsBySession, sessionIdsOfMember } from "../utils/sessionParticipants";
import { isFollowed } from "../utils/onboarding";
import { markFollowed } from "./conseiller";
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
  if (req.userRole === "CONSEILLER") {
    // Le conseiller voit les séances qu'il anime et celles qu'il a planifiées pour ses clients
    return or(eq(sessionsTable.coachId, req.userId!), eq(sessionsTable.plannedById, req.userId!))!;
  }
  return req.userRole === "ENTRAINEUR"
    ? eq(sessionsTable.coachId, req.userId!)
    : inArray(sessionsTable.id, sessionIdsOfMember(req.userId!));
}

/** Séances non annulées du coach qui chevauchent [start, start + durationMin). */
async function coachConflicts(coachId: string, start: Date, durationMin: number) {
  const dayBefore = new Date(start.getTime() - 24 * 3600000);
  const end = new Date(start.getTime() + durationMin * 60000);
  const rows = await db
    .select({ scheduledAt: sessionsTable.scheduledAt, durationMin: sessionsTable.durationMin })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.coachId, coachId),
        ne(sessionsTable.status, "ANNULEE"),
        gte(sessionsTable.scheduledAt, dayBefore),
        lt(sessionsTable.scheduledAt, end)
      )
    );
  return rows.filter((r) => r.scheduledAt.getTime() + r.durationMin * 60000 > start.getTime());
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
  const seesNames = isIntervenantRole(req.userRole) || req.userRole === "ADMIN";

  res.json(
    rows.map((r) => {
      const all = participants.get(r.session.id) || [];
      // Cours ouvert : un adhérent ne voit pas les noms des autres inscrits (confidentialité), seulement leur nombre.
      const list = r.session.isOpen && !seesNames ? all.filter((p) => p.id === req.userId) : all;
      return {
        ...r.session,
        status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
        joinUrl: jitsiUrl(r.session.jitsiRoom),
        coach: r.coach,
        participants: list,
        participantsCount: all.length,
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
      participants:
        r.session.isOpen && !isIntervenantRole(req.userRole) && req.userRole !== "ADMIN"
          ? (participants.get(r.session.id) || []).filter((p) => p.id === req.userId)
          : participants.get(r.session.id) || [],
    }))
  );
});

const createSchema = z.object({
  memberIds: z.array(z.string()).max(MAX_PARTICIPANTS).optional(),
  // Ancien format (un seul adhérent), toujours accepté
  memberId: z.string().optional(),
  coachId: z.string().optional(),
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
  durationMin: z.number().int().min(15).max(180).optional(),
  notes: z.string().max(2000).optional(),
  title: z.string().trim().max(120).optional(),
  // Cours ouvert aux inscriptions des adhérents, avec un nombre de places
  isOpen: z.boolean().optional(),
  capacity: z.number().int().min(1).max(MAX_PARTICIPANTS).optional(),
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
  // Seuls le coach et l'admin ouvrent un cours aux inscriptions
  const isOpen = !isMembre && !!body.isOpen;
  const capacity = isOpen ? body.capacity ?? 10 : null;
  // Le coach planifie pour lui-même ; le conseiller et l'admin choisissent le coach.
  const coachId = req.userRole === "ENTRAINEUR" ? req.userId! : body.coachId;
  const memberIds = isMembre
    ? [req.userId!]
    : [...new Set(body.memberIds || (body.memberId ? [body.memberId] : []))];
  if (!coachId) return res.status(400).json({ error: "Coach requis" });
  if (memberIds.length === 0 && !isOpen) return res.status(400).json({ error: "Choisissez au moins un adhérent" });
  if (memberIds.length > MAX_PARTICIPANTS) {
    return res.status(400).json({ error: `${MAX_PARTICIPANTS} participants maximum par séance` });
  }
  if (capacity !== null && memberIds.length > capacity) {
    return res.status(400).json({ error: `Plus d'adhérents choisis (${memberIds.length}) que de places (${capacity})` });
  }

  const [coach] = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
  if (!coach || !isIntervenantRole(coach.role)) return res.status(400).json({ error: "Coach introuvable" });

  const members = memberIds.length ? await db.select().from(users).where(inArray(users.id, memberIds)) : [];
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
        type: isOpen || memberIds.length > 1 ? "GROUPE" : "INDIVIDUEL",
        scheduledAt,
        durationMin: body.durationMin || 45,
        status: isMembre ? "A_CONFIRMER" : "PLANIFIEE",
        jitsiRoom: room,
        notes: body.notes,
        title: body.title || null,
        isOpen,
        capacity,
        plannedById: req.userId!,
      })
      .returning();

    if (memberIds.length === 0) return created;
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

const participantsSchema = z.object({ memberIds: z.array(z.string()).max(MAX_PARTICIPANTS) });

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
  // Un cours ouvert peut rester sans inscrit ; une séance fermée garde au moins un adhérent.
  if (memberIds.length === 0 && !session.isOpen) {
    return res.status(400).json({ error: "Gardez au moins un adhérent" });
  }
  if (session.isOpen && session.capacity && memberIds.length > session.capacity) {
    return res.status(400).json({ error: `Ce cours est limité à ${session.capacity} places` });
  }

  const members = memberIds.length ? await db.select().from(users).where(inArray(users.id, memberIds)) : [];
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
    if (memberIds.length) {
      await tx.insert(sessionParticipants).values(memberIds.map((memberId) => ({ sessionId: session.id, memberId })));
    }
    await tx
      .update(sessionsTable)
      .set({ type: session.isOpen || memberIds.length > 1 ? "GROUPE" : "INDIVIDUEL", memberId: null })
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

const seriesSchema = z.object({
  memberId: z.string(),
  coachId: z.string(),
  firstAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
  count: z.number().int().min(1).max(24),
  intervalDays: z.union([z.literal(7), z.literal(14)]).optional(),
  durationMin: z.number().int().min(15).max(180).optional(),
  title: z.string().trim().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

// Le conseiller planifie, après l'entretien, une ou plusieurs séances du client avec un coach
// (ex : 12 séances, chaque mardi à 10 h). Le client passe en « suivi ».
router.post("/series", requireAuth, async (req: AuthedRequest, res) => {
  if (req.userRole !== "CONSEILLER" && req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Réservé au conseiller sportif" });
  }
  const parsed = seriesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const b = parsed.data;
  const durationMin = b.durationMin || 45;
  const interval = b.intervalDays || 7;

  const [coach] = await db.select().from(users).where(eq(users.id, b.coachId)).limit(1);
  if (!coach || coach.role !== "ENTRAINEUR") return res.status(400).json({ error: "Coach introuvable" });
  const [member] = await db.select().from(users).where(eq(users.id, b.memberId)).limit(1);
  if (!member || member.role !== "MEMBRE") return res.status(400).json({ error: "Client introuvable" });

  const first = new Date(b.firstAt);
  if (first.getTime() < Date.now() - 5 * 60000) {
    return res.status(400).json({ error: "La date de la première séance est déjà passée" });
  }
  // Même heure locale chaque semaine (le passage à l'heure d'hiver/été ne décale pas la séance)
  const dates = Array.from({ length: b.count }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + i * interval);
    return d;
  });

  const conflicts: string[] = [];
  for (const d of dates) {
    if ((await coachConflicts(coach.id, d, durationMin)).length) conflicts.push(d.toISOString());
  }
  if (conflicts.length) {
    return res.status(409).json({
      error: `${coach.firstName} ${coach.lastName} a déjà une séance à ${conflicts.length} de ces dates`,
      conflicts,
    });
  }

  const created = await db.transaction(async (tx) => {
    const ids: string[] = [];
    for (const d of dates) {
      const id = newId();
      ids.push(id);
      await tx.insert(sessionsTable).values({
        id,
        coachId: coach.id,
        memberId: null,
        type: "INDIVIDUEL",
        scheduledAt: d,
        durationMin,
        status: "PLANIFIEE",
        jitsiRoom: generateJitsiRoom("seance"),
        notes: b.notes,
        title: b.title || null,
        plannedById: req.userId!,
      });
      await tx.insert(sessionParticipants).values({ sessionId: id, memberId: member.id });
    }
    const when = first.toLocaleString("fr-FR", {
      timeZone: process.env.TZ || "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const what = b.count > 1 ? `${b.count} séances` : "1 séance";
    await tx.insert(notifications).values([
      { id: newId(), userId: member.id, message: `${what} planifiée${b.count > 1 ? "s" : ""} avec ${coach.firstName} ${coach.lastName}, à partir du ${when}` },
      { id: newId(), userId: coach.id, message: `${what} planifiée${b.count > 1 ? "s" : ""} avec ${member.firstName} ${member.lastName}, à partir du ${when}` },
    ]);
    return ids;
  });

  if (!isFollowed(member.onboarding)) await markFollowed(member.id, member.interviewMeetingId);
  res.status(201).json({ created: created.length, ids: created });
});

/** Un cours accepte encore des inscriptions : ouvert, non annulé, pas encore terminé. */
function acceptsEnrollment(s: typeof sessionsTable.$inferSelect): boolean {
  return s.isOpen && s.status !== "ANNULEE" && s.status !== "EFFECTUEE" && s.scheduledAt.getTime() + s.durationMin * 60000 > Date.now();
}

// Cours ouverts aux inscriptions (catalogue vu par les adhérents, après l'entretien d'accueil).
router.get("/available", requireAuth, async (req: AuthedRequest, res) => {
  if (req.userRole === "MEMBRE") {
    const [me] = await db.select({ onboarding: users.onboarding }).from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!isFollowed(me?.onboarding)) return res.json([]);
  }
  const rows = await db
    .select({
      session: sessionsTable,
      coach: { id: coachAlias.id, firstName: coachAlias.firstName, lastName: coachAlias.lastName },
    })
    .from(sessionsTable)
    .leftJoin(coachAlias, eq(sessionsTable.coachId, coachAlias.id))
    .where(and(eq(sessionsTable.isOpen, true), gte(sessionsTable.scheduledAt, new Date(Date.now() - 3 * 3600000))))
    .orderBy(asc(sessionsTable.scheduledAt));

  const open = rows.filter((r) => acceptsEnrollment(r.session));
  const participants = await participantsBySession(open.map((r) => r.session.id));

  res.json(
    open.map((r) => {
      const list = participants.get(r.session.id) || [];
      return {
        id: r.session.id,
        title: r.session.title,
        notes: r.session.notes,
        scheduledAt: r.session.scheduledAt,
        durationMin: r.session.durationMin,
        status: computeStatus(r.session.scheduledAt, r.session.durationMin, r.session.status),
        capacity: r.session.capacity,
        placesTaken: list.length,
        enrolled: list.some((p) => p.id === req.userId),
        coach: r.coach,
      };
    })
  );
});

// S'inscrire à un cours ouvert (adhérent).
router.post("/:id/enroll", requireAuth, async (req: AuthedRequest, res) => {
  if (req.userRole !== "MEMBRE") return res.status(403).json({ error: "Réservé aux adhérents" });
  const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  if (!isFollowed(me?.onboarding)) {
    return res.status(403).json({ error: "Les inscriptions aux cours s'ouvrent après votre entretien avec le conseiller sportif" });
  }

  const result = await db.transaction(async (tx) => {
    // Verrou sur la séance : deux inscriptions simultanées ne peuvent pas dépasser la capacité.
    const [session] = await tx
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, req.params.id))
      .for("update")
      .limit(1);
    if (!session) return { code: 404, error: "Cours introuvable" } as const;
    if (!acceptsEnrollment(session)) return { code: 409, error: "Les inscriptions à ce cours sont fermées" } as const;

    const current = await tx
      .select({ memberId: sessionParticipants.memberId })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, session.id));
    if (current.some((c) => c.memberId === req.userId)) return { code: 409, error: "Vous êtes déjà inscrit" } as const;
    if (session.capacity && current.length >= session.capacity) {
      return { code: 409, error: "Ce cours est complet" } as const;
    }

    await tx.insert(sessionParticipants).values({ sessionId: session.id, memberId: req.userId! });
    const [me] = await tx.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    await tx.insert(notifications).values({
      id: newId(),
      userId: session.coachId,
      message: `Nouvelle inscription : ${me.firstName} ${me.lastName}, cours${session.title ? ` « ${session.title} »` : " collectif"}`,
    });
    return { code: 201, placesTaken: current.length + 1, capacity: session.capacity } as const;
  });

  if ("error" in result) return res.status(result.code).json({ error: result.error });
  res.status(201).json({ enrolled: true, placesTaken: result.placesTaken, capacity: result.capacity });
});

// Se désinscrire d'un cours ouvert (adhérent), tant qu'il n'a pas commencé.
router.delete("/:id/enroll", requireAuth, async (req: AuthedRequest, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.id)).limit(1);
  if (!session) return res.status(404).json({ error: "Cours introuvable" });
  if (!session.isOpen) return res.status(409).json({ error: "Contactez votre coach pour quitter cette séance" });
  if (session.scheduledAt.getTime() <= Date.now()) {
    return res.status(409).json({ error: "Le cours a déjà commencé" });
  }
  if (!(await isParticipant(session.id, req.userId!))) return res.status(404).json({ error: "Vous n'êtes pas inscrit" });

  await db
    .delete(sessionParticipants)
    .where(and(eq(sessionParticipants.sessionId, session.id), eq(sessionParticipants.memberId, req.userId!)));
  const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  await db.insert(notifications).values({
    id: newId(),
    userId: session.coachId,
    message: `Désinscription : ${me.firstName} ${me.lastName}, cours${session.title ? ` « ${session.title} »` : " collectif"}`,
  });
  res.json({ enrolled: false });
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
  // (Pour un cours ouvert, l'adhérent se désinscrit au lieu d'annuler le cours.)
  if (!allowed && status === "ANNULEE" && !existing.isOpen && (await isParticipant(existing.id, req.userId!))) {
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
