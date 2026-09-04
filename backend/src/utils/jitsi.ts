import { randomUUID } from "crypto";

export function generateJitsiRoom(prefix: string): string {
  return `mouvplus-${prefix}-${randomUUID().slice(0, 8)}`;
}

export function jitsiUrl(room: string): string {
  const domain = process.env.JITSI_DOMAIN || "meet.jit.si";
  return `https://${domain}/${room}`;
}
