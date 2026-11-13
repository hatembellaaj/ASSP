import { Router } from "express";
import { eq, desc, asc, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { db, newId } from "../db";
import {
  users,
  meetings,
  meetingInvites,
  notifications,
  icopeAssessments,
  muscleEvaluations,
  inBodyRecords,
  programAssignments,
  programs,
} from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom } from "../utils/jitsi";
import { ONBOARDING } from "../utils/onboarding";
import { computeIcopeScore } from "../utils/icope";

const router = Router();

router.get("/adherents", requireAuth, requireRole("CONSEILLER", "ADMIN", "ENTRAINEUR"), async (_req, res) => {
  const members = await db.select().from(users).where(eq(users.role, "MEMBRE"));

  const allIcope = await db.select().from(icopeAssessments).orderBy(desc(icopeAssessments.assessedAt));
  const allMuscle = await db.select().from(muscleEvaluations);
  const allInBody = await db.select().from(inBodyRecords).orderBy(desc(inBodyRecords.uploadedAt));
  const allAssignments = await db
    .select({ assignment: programAssignments, program: programs })
    .from(programAssignments)
    .leftJoin(programs, eq(programAssignments.programId, programs.id))
    .orderBy(desc(programAssignments.assignedAt));

  const result = members.map((m) => {
    const icope = allIcope.find((a) => a.userId === m.id);
    const inBody = allInBody.find((r) => r.userId === m.id);
    const assignment = allAssignments.find((a) => a.assignment.userId === m.id);
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      plan: m.plan,
      avatarColor: m.avatarColor,
      dernierIcope: icope ? computeIcopeScore(icope) : null,
      nbEvaluationsMusculaires: allMuscle.filter((e) => e.userId === m.id).length,
      dernierInBody: inBody || null,
      programmeActuel: assignment?.program?.name || null,
      onboarding: m.onboarding || ONBOARDING.SUIVI,
      availability: m.availability || {},
      availabilityNote: m.availabilityNote,
    };
  });

  res.json(result);
});

// Nouveaux clients : inscrits qui attendent ou ont planifié leur entretien d'accueil.
router.get("/nouveaux", requireAuth, requireRole("CONSEILLER", "ADMIN"), async (_req, res) => {
  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "MEMBRE"),
        inArray(users.onboarding, [ONBOARDING.A_CONTACTER, ONBOARDING.ENTRETIEN_PLANIFIE])
      )
    )
    .orderBy(asc(users.createdAt));

  const meetingIds = rows.map((r) => r.interviewMeetingId).filter((x): x is string => !!x);
  const interviews = meetingIds.length ? await db.select().from(meetings).where(inArray(meetings.id, meetingIds)) : [];

  res.json(
    rows.map((u) => {
      const m = interviews.find((i) => i.id === u.interviewMeetingId);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        avatarColor: u.avatarColor,
        createdAt: u.createdAt,
        onboarding: u.onboarding,
        availability: u.availability || {},
        availabilityNote: u.availabilityNote,
        conseillerId: u.conseillerId,
        interview: m && m.status !== "ANNULEE" ? { id: m.id, scheduledAt: m.scheduledAt, status: m.status } : null,
      };
    })
  );
});

// Coachs (entraîneurs) vers qui le conseiller oriente le client.
router.get("/coachs", requireAuth, requireRole("CONSEILLER", "ADMIN"), async (_req, res) => {
  const coaches = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.role, "ENTRAINEUR"))
    .orderBy(asc(users.lastName));
  res.json(coaches);
});

const interviewSchema = z.object({
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
});

// Planifier (ou déplacer) l'entretien d'accueil en visio avec le client.
router.post(
  "/clients/:id/entretien",
  requireAuth,
  requireRole("CONSEILLER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = interviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Date invalide" });
    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (scheduledAt.getTime() < Date.now() - 5 * 60000) {
      return res.status(400).json({ error: "La date de l'entretien est déjà passée" });
    }

    const [client] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!client || client.role !== "MEMBRE") return res.status(404).json({ error: "Client introuvable" });

    const [existing] = client.interviewMeetingId
      ? await db.select().from(meetings).where(eq(meetings.id, client.interviewMeetingId)).limit(1)
      : [];

    let meetingId: string;
    if (existing && existing.status !== "ANNULEE" && existing.status !== "TERMINEE") {
      // Déplacement d'un entretien déjà planifié
      await db.update(meetings).set({ scheduledAt, hostId: req.userId! }).where(eq(meetings.id, existing.id));
      meetingId = existing.id;
    } else {
      meetingId = newId();
      await db.transaction(async (tx) => {
        await tx.insert(meetings).values({
          id: meetingId,
          title: `Entretien d'accueil — ${client.firstName} ${client.lastName}`,
          hostId: req.userId!,
          scheduledAt,
          jitsiRoom: generateJitsiRoom("entretien"),
        });
        await tx.insert(meetingInvites).values({ id: newId(), meetingId, userId: client.id });
      });
    }

    await db
      .update(users)
      .set({
        onboarding: ONBOARDING.ENTRETIEN_PLANIFIE,
        interviewMeetingId: meetingId,
        conseillerId: req.userRole === "CONSEILLER" ? req.userId! : client.conseillerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, client.id));

    const when = scheduledAt.toLocaleString("fr-FR", {
      timeZone: process.env.TZ || "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    await db.insert(notifications).values({
      id: newId(),
      userId: client.id,
      message: `${existing ? "Entretien déplacé" : "Votre entretien avec votre conseiller sportif est planifié"} : ${when}`,
    });

    res.status(201).json({ meetingId, scheduledAt });
  }
);

// Entretien fait : le client passe en suivi (sans planifier de séance tout de suite).
router.post(
  "/clients/:id/suivi",
  requireAuth,
  requireRole("CONSEILLER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const [client] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!client || client.role !== "MEMBRE") return res.status(404).json({ error: "Client introuvable" });
    await markFollowed(client.id, client.interviewMeetingId);
    res.json({ onboarding: ONBOARDING.SUIVI });
  }
);

/** Passe le client en suivi et clôt son entretien d'accueil. */
export async function markFollowed(clientId: string, interviewMeetingId: string | null) {
  await db.update(users).set({ onboarding: ONBOARDING.SUIVI, updatedAt: new Date() }).where(eq(users.id, clientId));
  if (interviewMeetingId) {
    await db.update(meetings).set({ status: "TERMINEE" }).where(eq(meetings.id, interviewMeetingId));
  }
}

export default router;
