import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const list = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, req.userId!))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  res.json(list);
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const [n] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, req.params.id)).returning();
  res.json(n);
});

export default router;
