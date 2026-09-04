import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, newId } from "../db";
import { inBodyRecords } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateInBodyRecommendation } from "../utils/inbodyAi";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = (req.query.userId as string) || req.userId!;
  const records = await db
    .select()
    .from(inBodyRecords)
    .where(eq(inBodyRecords.userId, userId))
    .orderBy(desc(inBodyRecords.uploadedAt));
  res.json(records);
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { weightKg, heightCm, muscleMassKg, fatMassPct, visceralFat, userId } = req.body;
  const targetUserId = userId || req.userId!;
  const heightM = heightCm ? heightCm / 100 : 1.7;
  const imc = weightKg / (heightM * heightM);

  const aiRecommendation = generateInBodyRecommendation({ weightKg, heightCm, imc, muscleMassKg, fatMassPct, visceralFat });

  const [record] = await db
    .insert(inBodyRecords)
    .values({ id: newId(), userId: targetUserId, weightKg, heightCm, imc, muscleMassKg, fatMassPct, visceralFat, aiRecommendation })
    .returning();
  res.status(201).json(record);
});

export default router;
