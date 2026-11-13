/** Étapes du parcours d'un nouvel adhérent : client → conseiller sportif → coach. */
export const ONBOARDING = {
  A_CONTACTER: "A_CONTACTER",
  ENTRETIEN_PLANIFIE: "ENTRETIEN_PLANIFIE",
  SUIVI: "SUIVI",
} as const;

export const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
export const SLOTS = ["matin", "aprem", "soir"] as const;

/** L'adhérent a fait son entretien d'accueil (ou son compte est antérieur au parcours). */
export function isFollowed(onboarding: string | null | undefined): boolean {
  return !onboarding || onboarding === ONBOARDING.SUIVI;
}

/** Garde uniquement les jours et créneaux connus. */
export function cleanAvailability(input: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!input || typeof input !== "object") return out;
  for (const day of DAYS) {
    const slots = (input as Record<string, unknown>)[day];
    if (!Array.isArray(slots)) continue;
    const kept = SLOTS.filter((s) => slots.includes(s));
    if (kept.length) out[day] = [...kept];
  }
  return out;
}
