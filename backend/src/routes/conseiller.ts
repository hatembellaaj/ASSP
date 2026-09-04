import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  icopeAssessments,
  muscleEvaluations,
  inBodyRecords,
  programAssignments,
  programs,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
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
    };
  });

  res.json(result);
});

export default router;
