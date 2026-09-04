export interface IcopeInput {
  mobilite: number;
  nutrition: number;
  memoire: number;
  vision: number;
  audition: number;
  bienEtre: number;
}

// Score global ICOPE sur 24 (6 domaines x 4 points max)
export function computeIcopeScore(a: IcopeInput): number {
  return a.mobilite + a.nutrition + a.memoire + a.vision + a.audition + a.bienEtre;
}
