export interface SessionPerson {
  id: string;
  firstName: string;
  lastName: string;
}

const fullName = (p: SessionPerson) => `${p.firstName} ${p.lastName}`;

/** Participants d'une séance (nouveau format), ou l'adhérent unique (ancien format). */
export function sessionParticipants(s: any): SessionPerson[] {
  if (Array.isArray(s?.participants)) return s.participants;
  return s?.member ? [s.member] : [];
}

/** Libellé court des participants : « Léa Martin », « Léa Martin, Paul Durand » ou « Groupe · 5 participants ». */
export function participantsLabel(s: any): string {
  const list = sessionParticipants(s);
  if (list.length === 0) return "Aucun participant";
  if (list.length <= 2) return list.map(fullName).join(", ");
  return `Groupe · ${list.length} participants`;
}

/** Liste complète des noms, pour une info-bulle ou une ligne de détail. */
export function participantsFullList(s: any): string {
  return sessionParticipants(s).map(fullName).join(", ");
}
