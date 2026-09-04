import { Router } from "express";
import { eq, desc, or } from "drizzle-orm";
import { db, newId } from "../db";
import { meetings, meetingInvites, users } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateJitsiRoom, jitsiUrl } from "../utils/jitsi";
import { alias } from "drizzle-orm/pg-core";

const router = Router();
const inviteeAlias = alias(users, "invitee_u");

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const hosted = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.hostId, req.userId!));
  const invited = await db
    .select({ meetingId: meetingInvites.meetingId })
    .from(meetingInvites)
    .where(eq(meetingInvites.userId, req.userId!));

  const ids = new Set([...hosted.map((h) => h.id), ...invited.map((i) => i.meetingId)]);
  if (ids.size === 0) return res.json([]);

  const all = await db.select().from(meetings).orderBy(desc(meetings.scheduledAt));
  const mine = all.filter((m) => ids.has(m.id));

  const inviteRows = await db
    .select({
      invite: meetingInvites,
      user: { firstName: inviteeAlias.firstName, lastName: inviteeAlias.lastName },
    })
    .from(meetingInvites)
    .leftJoin(inviteeAlias, eq(meetingInvites.userId, inviteeAlias.id));

  res.json(
    mine.map((m) => ({
      ...m,
      joinUrl: jitsiUrl(m.jitsiRoom),
      invites: inviteRows.filter((i) => i.invite.meetingId === m.id).map((i) => ({ ...i.invite, user: i.user })),
    }))
  );
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { title, scheduledAt, inviteeIds } = req.body;
  const room = generateJitsiRoom("reunion");
  const [meeting] = await db
    .insert(meetings)
    .values({ id: newId(), title, hostId: req.userId!, scheduledAt: new Date(scheduledAt), jitsiRoom: room })
    .returning();

  if (inviteeIds && inviteeIds.length) {
    await db.insert(meetingInvites).values(
      inviteeIds.map((userId: string) => ({ id: newId(), meetingId: meeting.id, userId }))
    );
  }
  res.status(201).json({ ...meeting, joinUrl: jitsiUrl(room) });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { status, summary } = req.body;
  const [meeting] = await db.update(meetings).set({ status, summary }).where(eq(meetings.id, req.params.id)).returning();
  res.json(meeting);
});

export default router;
