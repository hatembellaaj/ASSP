import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, newId } from "../db";
import { programs, programAssignments, users } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { alias } from "drizzle-orm/pg-core";

const router = Router();
const assignerAlias = alias(users, "assigner_u");

router.get("/", requireAuth, async (_req, res) => {
  const list = await db.select().from(programs).orderBy(desc(programs.createdAt));
  res.json(list);
});

router.post("/", requireAuth, requireRole("ADMIN", "CONSEILLER", "ENTRAINEUR"), async (req, res) => {
  const { name, level, description } = req.body;
  const [program] = await db.insert(programs).values({ id: newId(), name, level, description }).returning();
  res.status(201).json(program);
});

router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db
    .select({
      assignment: programAssignments,
      program: programs,
      assignedBy: { firstName: assignerAlias.firstName, lastName: assignerAlias.lastName },
    })
    .from(programAssignments)
    .leftJoin(programs, eq(programAssignments.programId, programs.id))
    .leftJoin(assignerAlias, eq(programAssignments.assignedById, assignerAlias.id))
    .where(eq(programAssignments.userId, req.userId!))
    .orderBy(desc(programAssignments.assignedAt));

  res.json(rows.map((r) => ({ ...r.assignment, program: r.program, assignedBy: r.assignedBy })));
});

router.post("/assign", requireAuth, requireRole("ADMIN", "CONSEILLER", "ENTRAINEUR"), async (req: AuthedRequest, res) => {
  const { programId, userId, score } = req.body;
  const [assignment] = await db
    .insert(programAssignments)
    .values({ id: newId(), programId, userId, assignedById: req.userId, score: score || 0 })
    .returning();
  const [program] = await db.select().from(programs).where(eq(programs.id, programId)).limit(1);
  res.status(201).json({ ...assignment, program });
});

export default router;
