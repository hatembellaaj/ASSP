import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

// Domaine public du serveur Jitsi (ex: meet.mouvplus.com pour l'instance
// auto-hébergée, ou meet.jit.si pour le service public).
export function jitsiDomain(): string {
  return process.env.JITSI_DOMAIN || "meet.jit.si";
}

export function generateJitsiRoom(prefix: string): string {
  return `mouvplus-${prefix}-${randomUUID().slice(0, 8)}`;
}

export function jitsiUrl(room: string): string {
  return `https://${jitsiDomain()}/${room}`;
}

export interface JitsiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Jeton d'accès à une salle de l'instance Jitsi auto-hébergée (AUTH_TYPE=jwt).
 * Il n'est émis que si JITSI_APP_ID / JITSI_APP_SECRET sont configurés : sans eux
 * (ex: meet.jit.si), on rejoint la salle sans jeton.
 * Le jeton est limité à UNE salle et expire après quelques heures.
 */
export function jitsiToken(room: string, user: JitsiUser, moderator: boolean): string | null {
  const appId = process.env.JITSI_APP_ID;
  const secret = process.env.JITSI_APP_SECRET;
  if (!appId || !secret) return null;

  return jwt.sign(
    {
      aud: "jitsi",
      iss: appId,
      sub: process.env.JITSI_XMPP_DOMAIN || "meet.jitsi",
      room,
      context: {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          moderator,
        },
      },
    },
    secret,
    { algorithm: "HS256", expiresIn: "4h" }
  );
}

export function jitsiJoinInfo(room: string, user: JitsiUser, moderator: boolean) {
  const token = jitsiToken(room, user, moderator);
  return {
    domain: jitsiDomain(),
    room,
    jwt: token,
    joinUrl: token ? `${jitsiUrl(room)}?jwt=${token}` : jitsiUrl(room),
  };
}
