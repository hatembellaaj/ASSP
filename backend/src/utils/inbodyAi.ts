interface InBodyInput {
  weightKg: number;
  heightCm?: number | null;
  imc: number;
  muscleMassKg: number;
  fatMassPct: number;
  visceralFat?: number | null;
}

// Génération de recommandations "IA" basées sur des règles simples,
// pensées pour un public sénior (cohérent avec le positionnement MouvPlus/ASSP).
export function generateInBodyRecommendation(data: InBodyInput): string {
  const tips: string[] = [];

  if (data.imc < 18.5) {
    tips.push(
      "Votre IMC est en dessous de la fourchette recommandée : privilégiez un apport protéiné suffisant à chaque repas pour préserver votre masse musculaire."
    );
  } else if (data.imc >= 25 && data.imc < 30) {
    tips.push(
      "Votre IMC est légèrement au-dessus de la norme : une activité douce régulière (marche, aquagym) associée à un rééquilibrage alimentaire peut aider."
    );
  } else if (data.imc >= 30) {
    tips.push(
      "Votre IMC indique un surpoids marqué : nous vous recommandons d'en parler avec votre conseiller sportif pour adapter votre programme et votre suivi nutritionnel."
    );
  } else {
    tips.push("Votre IMC est dans la fourchette recommandée, continuez ainsi !");
  }

  if (data.fatMassPct > 30) {
    tips.push(
      "Votre taux de masse grasse est élevé : le renforcement musculaire doux (2 à 3 séances/semaine) est particulièrement indiqué."
    );
  } else if (data.fatMassPct < 15) {
    tips.push("Votre taux de masse grasse est bas, veillez à un apport calorique suffisant.");
  }

  if (data.visceralFat && data.visceralFat > 10) {
    tips.push(
      "Votre niveau de graisse viscérale mérite une attention particulière : parlez-en à votre coach pour ajuster l'intensité cardio."
    );
  }

  if (data.muscleMassKg / data.weightKg < 0.35) {
    tips.push(
      "Votre masse musculaire relative est faible : un travail de renforcement progressif (2x/semaine) est conseillé pour limiter la sarcopénie liée à l'âge."
    );
  } else {
    tips.push("Votre masse musculaire est bien maintenue, un excellent indicateur pour l'autonomie.");
  }

  return tips.join(" ");
}
