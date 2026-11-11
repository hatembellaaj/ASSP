import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { sessionParticipants, users } from "../db/schema";

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

/** Sous-requête : identifiants des séances auxquelles participe un adhérent. */
export function sessionIdsOfMember(memberId: string) {
  return db
    .select({ id: sessionParticipants.sessionId })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.memberId, memberId));
}

/** Participants de plusieurs séances, regroupés par séance (triés par nom). */
export async function participantsBySession(sessionIds: string[]): Promise<Map<string, Participant[]>> {
  const map = new Map<string, Participant[]>();
  if (sessionIds.length === 0) return map;
  const rows = await db
    .select({
      sessionId: sessionParticipants.sessionId,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(sessionParticipants)
    .innerJoin(users, eq(sessionParticipants.memberId, users.id))
    .where(inArray(sessionParticipants.sessionId, sessionIds))
    .orderBy(users.lastName, users.firstName);
  for (const { sessionId, ...p } of rows) {
    if (!map.has(sessionId)) map.set(sessionId, []);
    map.get(sessionId)!.push(p);
  }
  return map;
}

/**
 * Reprise des séances créées avant l'arrivée des séances de groupe : leur
 * adhérent unique (sessions.member_id) devient participant. Idempotent,
 * exécuté au démarrage du serveur.
 */
export async function backfillSessionParticipants(): Promise<void> {
  const res = await db.execute(sql`
    INSERT INTO session_participants (session_id, member_id)
    SELECT id, member_id FROM sessions WHERE member_id IS NOT NULL
    ON CONFLICT (session_id, member_id) DO NOTHING
  `);
  if (res.rowCount) console.log(`Séances : ${res.rowCount} participant(s) repris de l'ancien format.`);
}
