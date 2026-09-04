import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, newId } from "../db";
import { subscriptions } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, req.userId!))
    .orderBy(desc(subscriptions.startDate))
    .limit(1);
  res.json(sub || null);
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { userId, formule, type, price, endDate } = req.body;
  const [sub] = await db
    .insert(subscriptions)
    .values({ id: newId(), userId, formule, type, price, endDate: new Date(endDate) })
    .returning();
  res.status(201).json(sub);
});

export default router;
