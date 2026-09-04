import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, newId } from "../db";
import { roadmapItems, users } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN", "ENTRAINEUR", "CONSEILLER"), async (_req, res) => {
  const rows = await db
    .select({
      item: roadmapItems,
      author: { firstName: users.firstName, lastName: users.lastName, role: users.role },
    })
    .from(roadmapItems)
    .leftJoin(users, eq(roadmapItems.authorId, users.id))
    .orderBy(asc(roadmapItems.quarter));
  res.json(rows.map((r) => ({ ...r.item, author: r.author })));
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req: AuthedRequest, res) => {
  const { title, description, quarter, status } = req.body;
  const [item] = await db
    .insert(roadmapItems)
    .values({ id: newId(), title, description, quarter, status: status || "IDEE", authorId: req.userId })
    .returning();
  res.status(201).json(item);
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { status } = req.body;
  const [item] = await db.update(roadmapItems).set({ status }).where(eq(roadmapItems.id, req.params.id)).returning();
  res.json(item);
});

export default router;
