import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { certifications, users } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = (req.query.userId as string) || req.userId!;
  const list = await db
    .select()
    .from(certifications)
    .where(eq(certifications.userId, userId))
    .orderBy(asc(certifications.moduleName));
  res.json(list);
});

router.get("/overview", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const rows = await db
    .select({
      cert: certifications,
      user: { firstName: users.firstName, lastName: users.lastName, role: users.role },
    })
    .from(certifications)
    .leftJoin(users, eq(certifications.userId, users.id));

  const byRole: Record<string, any[]> = { ADMIN: [], ENTRAINEUR: [], CONSEILLER: [] };
  for (const r of rows) {
    const entry = { ...r.cert, user: r.user };
    if (byRole[r.cert.roleCible]) byRole[r.cert.roleCible].push(entry);
  }
  res.json(byRole);
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { userId, roleCible, moduleName } = req.body;
  const [cert] = await db
    .insert(certifications)
    .values({ id: newId(), userId, roleCible, moduleName, status: "NON_COMMENCEE" })
    .returning();
  res.status(201).json(cert);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { status, progressPct } = req.body;
  const [cert] = await db
    .update(certifications)
    .set({ status, progressPct, completedAt: status === "VALIDEE" ? new Date() : undefined })
    .where(eq(certifications.id, req.params.id))
    .returning();
  res.json(cert);
});

export default router;
