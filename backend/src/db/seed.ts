import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool, newId } from "./index";
import {
  users,
  intervenantProfiles,
  clubs,
  programs,
  programAssignments,
  subscriptions,
  sessionsTable,
  posts,
  comments,
  likes,
  icopeAssessments,
  gamificationEvents,
  badges,
  badgeAwards,
  certifications,
  roadmapItems,
  meetings,
  meetingInvites,
} from "./schema";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

function room(prefix: string) {
  return `mouvplus-${prefix}-${newId().slice(0, 8)}`;
}

async function main() {
  console.log("Seed: réinitialisation...");
  await db.execute(sql`TRUNCATE TABLE
    notifications, badge_awards, badges, gamification_events, meeting_invites, meetings,
    certifications, roadmap_items, subscriptions, muscle_evaluations, inbody_records,
    icope_assessments, comments, likes, posts, program_assignments, programs,
    sessions, club_memberships, clubs, intervenant_profiles, users
    RESTART IDENTITY CASCADE`);

  console.log("Seed: utilisateurs...");

  const admin = (
    await db
      .insert(users)
      .values({
        id: newId(),
        email: "admin@mouvplus.fr",
        passwordHash: await hash("admin123"),
        firstName: "Laurent",
        lastName: "Chevalier",
        role: "ADMIN",
        avatarColor: "#0f172a",
        plan: "PREMIUM",
      })
      .returning()
  )[0];

  const slim = (
    await db
      .insert(users)
      .values({
        id: newId(),
        email: "slim.abderrahim@mouvplus.fr",
        passwordHash: await hash("coach123"),
        firstName: "Slim",
        lastName: "Abderrahim",
        role: "ENTRAINEUR",
        avatarColor: "#1d4ed8",
        plan: "PREMIUM",
        bio: "Ex sportif de haut niveau, expert et maître d'arts martiaux, encadreur sportif, entraîneur de sport militaire.",
      })
      .returning()
  )[0];
  await db.insert(intervenantProfiles).values({
    id: newId(),
    userId: slim.id,
    specialty: "APA - Activité Physique Adaptée",
    hourlyRate: 30,
    rating: 5.0,
    sessionsCount: 12,
    score: 79,
  });

  const coachSeeds = [
    { email: "marc.leblanc@mouvplus.fr", first: "Marc", last: "Leblanc", specialty: "Mobilité & équilibre", bio: "Spécialiste en prévention des chutes et rééducation fonctionnelle pour les seniors.", rate: 60, rating: 4.9, count: 234, score: 1 },
    { email: "sophie.martin@mouvplus.fr", first: "Sophie", last: "Martin", specialty: "Bien-être & nutrition", bio: "Coach certifiée en nutrition senior et activités douces pour le maintien de la forme.", rate: 55, rating: 4.8, count: 187, score: 60 },
    { email: "jp.dubois@mouvplus.fr", first: "Jean-Pierre", last: "Dubois", specialty: "Cardio & endurance", bio: "Ancien kinésithérapeute, spécialisé dans la remise en forme progressive des seniors.", rate: 65, rating: 4.7, count: 312, score: 55 },
    { email: "isabelle.bernard@mouvplus.fr", first: "Isabelle", last: "Bernard", specialty: "Yoga & méditation", bio: "Professeure de yoga adaptée aux besoins des seniors, avec 15 ans d'expérience.", rate: 50, rating: 4.9, count: 445, score: 65 },
    { email: "thomas.rousseau@mouvplus.fr", first: "Thomas", last: "Rousseau", specialty: "Renforcement musculaire", bio: "Coach sportif spécialisé dans le renforcement musculaire doux pour prévenir la sarcopénie.", rate: 58, rating: 4.6, count: 156, score: 58 },
  ];

  const coaches = [];
  for (const c of coachSeeds) {
    const [u] = await db
      .insert(users)
      .values({
        id: newId(),
        email: c.email,
        passwordHash: await hash("coach123"),
        firstName: c.first,
        lastName: c.last,
        role: "ENTRAINEUR",
        avatarColor: "#1d4ed8",
        bio: c.bio,
      })
      .returning();
    await db.insert(intervenantProfiles).values({
      id: newId(),
      userId: u.id,
      specialty: c.specialty,
      hourlyRate: c.rate,
      rating: c.rating,
      sessionsCount: c.count,
      score: c.score,
    });
    coaches.push(u);
  }

  const [conseiller] = await db
    .insert(users)
    .values({
      id: newId(),
      email: "conseiller@mouvplus.fr",
      passwordHash: await hash("conseiller123"),
      firstName: "Anne",
      lastName: "Fourgeaud",
      role: "CONSEILLER",
      avatarColor: "#0891b2",
      bio: "Conseillère sportive, référente ASSP (Association des Sportifs Séniors de Pauillac).",
    })
    .returning();
  await db.insert(intervenantProfiles).values({
    id: newId(),
    userId: conseiller.id,
    specialty: "Conseiller sportif",
    hourlyRate: 0,
    rating: 5.0,
    sessionsCount: 0,
    score: 90,
  });

  const [member] = await db
    .insert(users)
    .values({
      id: newId(),
      email: "hsan.soussou@mouvplus.fr",
      passwordHash: await hash("membre123"),
      firstName: "Hsan",
      lastName: "Soussou",
      role: "MEMBRE",
      avatarColor: "#0d9488",
      plan: "PREMIUM",
      phone: "+33782234871",
      birthDate: new Date("1976-06-24"),
    })
    .returning();

  const memberSeeds = [
    { email: "ramzi.cherif@mouvplus.fr", first: "Ramzi", last: "Cherif" },
    { email: "leila.cherifabselli@mouvplus.fr", first: "Leila", last: "Cherif Abselli" },
    { email: "annette.monnier@mouvplus.fr", first: "Annette", last: "Monnier" },
  ];
  const otherMembers = [];
  for (const m of memberSeeds) {
    const [u] = await db
      .insert(users)
      .values({
        id: newId(),
        email: m.email,
        passwordHash: await hash("membre123"),
        firstName: m.first,
        lastName: m.last,
        role: "MEMBRE",
        avatarColor: "#0d9488",
        plan: "STANDARD",
      })
      .returning();
    otherMembers.push(u);
  }

  console.log("Seed: clubs partenaires...");
  const clubSeeds = [
    { name: "Aqua Fitness Nantes", city: "Nantes", postalCode: "44000", phone: "02 40 00 00 06", amenities: ["Aquagym", "Natation", "Relaxation", "Vestiaires"] },
    { name: "Centre Bien-Être Toulouse", city: "Toulouse", postalCode: "31000", phone: "05 61 00 00 05", amenities: ["Balnéo", "Hammam", "Salle de fitness", "Accueil senior"] },
    { name: "Club Seniors Lyon Centre", city: "Lyon", postalCode: "69002", phone: "04 72 00 00 02", amenities: ["Gym douce", "Aquagym", "Vestiaires", "Cafétéria"] },
    { name: "Espace Forme Paris 8", city: "Paris", postalCode: "75008", phone: "01 42 00 00 01", amenities: ["Piscine", "Sauna", "Salle cardio", "Parking"] },
    { name: "Form'Active Marseille", city: "Marseille", postalCode: "13006", phone: "04 91 00 00 04", amenities: ["Salle de sport", "Piscine chauffée", "Coach sur place"] },
    { name: "Gym Senior Strasbourg", city: "Strasbourg", postalCode: "67000", phone: "03 88 00 00 08", amenities: ["Gym douce", "Stretching", "Balnéo", "Restaurant"] },
    { name: "Sport & Santé Lille", city: "Lille", postalCode: "59000", phone: "03 20 00 00 07", amenities: ["Cardio", "Musculation douce", "Cours collectifs", "Parking"] },
    { name: "Wellness Club Bordeaux", city: "Bordeaux", postalCode: "33000", phone: "05 56 00 00 03", amenities: ["Yoga", "Pilates", "Spa", "Jardins"] },
  ];
  for (const c of clubSeeds) {
    await db.insert(clubs).values({ id: newId(), ...c });
  }

  console.log("Seed: programmes...");
  const [niveau1] = await db
    .insert(programs)
    .values({
      id: newId(),
      name: "Niveau 1 : Réveil du Corps",
      level: "DEBUTANT",
      description:
        "Pour les séniors avec problèmes d'autonomie, articulations ou manque d'énergie. Séances douces et progressives pour retrouver mouvement et bien-être.",
    })
    .returning();
  await db.insert(programs).values({
    id: newId(),
    name: "Niveau 2 : Reprise du Sport Séniors",
    level: "INTERMEDIAIRE",
    description:
      "Pour les séniors actifs qui souhaitent reprendre le sport en toute sécurité. Renforcement, gainage et équilibre pour progresser à son rythme.",
  });

  await db.insert(programAssignments).values({
    id: newId(),
    programId: niveau1.id,
    userId: member.id,
    assignedById: conseiller.id,
    score: 5,
  });

  console.log("Seed: abonnement...");
  await db.insert(subscriptions).values({
    id: newId(),
    userId: member.id,
    formule: "TRIMESTRIEL",
    type: "INDIVIDUEL",
    price: 720,
    startDate: new Date("2026-07-06"),
    endDate: new Date("2026-09-27"),
    lastPaymentDate: new Date("2026-07-06"),
  });

  console.log("Seed: séances...");
  const now = new Date();
  const pastOffsets = [-25, -21, -19, -17, -14, -10, -7, -4];
  for (const off of pastOffsets) {
    const date = new Date(now);
    date.setDate(date.getDate() + off);
    date.setHours(8, 0, 0, 0);
    await db.insert(sessionsTable).values({
      id: newId(),
      memberId: member.id,
      coachId: slim.id,
      type: "GROUPE",
      scheduledAt: date,
      durationMin: 45,
      status: off < -2 ? "EFFECTUEE" : "A_CONFIRMER",
      jitsiRoom: room("seance"),
    });
  }
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + 2);
  nextDate.setHours(8, 0, 0, 0);
  await db.insert(sessionsTable).values({
    id: newId(),
    memberId: member.id,
    coachId: slim.id,
    type: "INDIVIDUEL",
    scheduledAt: nextDate,
    durationMin: 45,
    status: "PLANIFIEE",
    jitsiRoom: room("seance"),
  });

  console.log("Seed: communauté...");
  const [post1] = await db
    .insert(posts)
    .values({ id: newId(), authorId: otherMembers[0].id, content: "Notre vice championne Anette.", mediaType: "PHOTO" })
    .returning();
  await db.insert(comments).values({ id: newId(), postId: post1.id, authorId: admin.id, content: "bravo" });
  await db.insert(comments).values({ id: newId(), postId: post1.id, authorId: otherMembers[1].id, content: "Bravo" });
  await db.insert(likes).values({ id: newId(), postId: post1.id, userId: member.id });

  await db.insert(posts).values({
    id: newId(),
    authorId: otherMembers[0].id,
    content:
      "Bravo Anette à la superbe performance. Médaille d'argent championnat de France.\nBravo au coach Slim 🙌",
    mediaType: "PHOTO",
  });

  console.log("Seed: bilan ICOPE...");
  await db.insert(icopeAssessments).values({
    id: newId(),
    userId: member.id,
    assessedById: conseiller.id,
    mobilite: 2,
    nutrition: 1,
    memoire: 3,
    vision: 2,
    audition: 4,
    bienEtre: 3,
  });

  console.log("Seed: gamification...");
  await db.insert(gamificationEvents).values([
    { id: newId(), userId: member.id, points: 40, reason: "Séance complétée" },
    { id: newId(), userId: member.id, points: 40, reason: "Séance complétée" },
    { id: newId(), userId: member.id, points: 40, reason: "Séance complétée" },
    { id: newId(), userId: member.id, points: 40, reason: "Séance complétée" },
    { id: newId(), userId: member.id, points: 20, reason: "Activité hebdomadaire" },
    { id: newId(), userId: member.id, points: 20, reason: "Séance complétée" },
  ]);

  const [badgeDecouverte] = await db
    .insert(badges)
    .values({ id: newId(), name: "Découverte", icon: "🌱", description: "0 - 75 pts" })
    .returning();
  await db.insert(badges).values({ id: newId(), name: "Mise en route", icon: "🚀", description: "75 - 150 pts" });
  const [badgeEngagement] = await db
    .insert(badges)
    .values({ id: newId(), name: "Engagement", icon: "🔥", description: "150 - 300 pts" })
    .returning();
  await db.insert(badgeAwards).values({ id: newId(), userId: member.id, badgeId: badgeDecouverte.id });
  await db.insert(badgeAwards).values({ id: newId(), userId: member.id, badgeId: badgeEngagement.id });

  console.log("Seed: certifications...");
  const certModules: { role: "ADMIN" | "ENTRAINEUR" | "CONSEILLER"; module: string }[] = [
    { role: "ADMIN", module: "Coordination générale & planning" },
    { role: "ADMIN", module: "Gestion des roadmaps produit" },
    { role: "ENTRAINEUR", module: "Encadrement sportif seniors - fondamentaux" },
    { role: "ENTRAINEUR", module: "Prévention des chutes" },
    { role: "CONSEILLER", module: "Bilan ICOPE - méthodologie" },
    { role: "CONSEILLER", module: "Analyse InBody & recommandations" },
  ];
  const intervenants = [admin, slim, ...coaches, conseiller];
  for (const u of intervenants) {
    for (const cm of certModules.filter((c) => c.role === u.role)) {
      const validated = Math.random() > 0.4;
      await db.insert(certifications).values({
        id: newId(),
        userId: u.id,
        roleCible: cm.role,
        moduleName: cm.module,
        status: validated ? "VALIDEE" : "EN_COURS",
        progressPct: validated ? 100 : Math.floor(Math.random() * 80) + 10,
        completedAt: validated ? new Date() : null,
      });
    }
  }

  console.log("Seed: roadmap MouvPlus...");
  await db.insert(roadmapItems).values([
    { id: newId(), title: "Espace Conseiller sportif", description: "Suivi des adhérents, bilans ICOPE et InBody centralisés.", quarter: "T3 2026", status: "LIVRE", authorId: admin.id },
    { id: newId(), title: "Visioconférence intégrée (Jitsi)", description: "Séances et réunions en direct depuis la plateforme.", quarter: "T3 2026", status: "LIVRE", authorId: admin.id },
    { id: newId(), title: "Certification des intervenants", description: "Parcours de formation Programmateur / Entraîneur / Conseiller.", quarter: "T4 2026", status: "EN_COURS", authorId: admin.id },
    { id: newId(), title: "Avatar musculaire interactif", description: "Visualisation détaillée par groupe musculaire.", quarter: "T4 2026", status: "EN_COURS", authorId: admin.id },
    { id: newId(), title: "Marketplace clubs partenaires", description: "Réservation directe en clubs partenaires.", quarter: "T1 2027", status: "IDEE", authorId: admin.id },
  ]);

  console.log("Seed: réunion...");
  const [meeting] = await db
    .insert(meetings)
    .values({
      id: newId(),
      title: "Coaching",
      hostId: slim.id,
      scheduledAt: new Date("2026-07-11T08:03:00"),
      jitsiRoom: room("reunion"),
      status: "TERMINEE",
    })
    .returning();
  await db.insert(meetingInvites).values([
    { id: newId(), meetingId: meeting.id, userId: member.id },
    { id: newId(), meetingId: meeting.id, userId: otherMembers[0].id },
    { id: newId(), meetingId: meeting.id, userId: otherMembers[1].id },
    { id: newId(), meetingId: meeting.id, userId: otherMembers[2].id },
  ]);

  console.log("Seed terminé ✅");
  console.log("--------------------------------------------------");
  console.log("Comptes de démonstration :");
  console.log("  Admin / Programmateur : admin@mouvplus.fr / admin123");
  console.log("  Entraîneur (Slim)     : slim.abderrahim@mouvplus.fr / coach123");
  console.log("  Conseiller sportif    : conseiller@mouvplus.fr / conseiller123");
  console.log("  Adhérent (Hsan)       : hsan.soussou@mouvplus.fr / membre123");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
