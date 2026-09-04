import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------
export const roleEnum = pgEnum("role", ["ADMIN", "ENTRAINEUR", "CONSEILLER", "MEMBRE"]);
export const planTypeEnum = pgEnum("plan_type", ["DECOUVERTE", "STANDARD", "PREMIUM"]);
export const sessionTypeEnum = pgEnum("session_type", ["INDIVIDUEL", "GROUPE"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "LIBRE",
  "PLANIFIEE",
  "IMMINENTE",
  "EFFECTUEE",
  "A_CONFIRMER",
  "EN_RETARD",
  "ANNULEE",
]);
export const mediaTypeEnum = pgEnum("media_type", ["PHOTO", "VIDEO", "EMOTION", "AUCUN"]);
export const muscleLevelEnum = pgEnum("muscle_level", [
  "NON_EVALUE",
  "URGENT",
  "A_AMELIORER",
  "BIEN",
  "TRES_BIEN",
  "OPTIMAL",
]);
export const muscleSideEnum = pgEnum("muscle_side", ["AVANT", "ARRIERE"]);
export const subFormuleEnum = pgEnum("sub_formule", ["MENSUEL", "TRIMESTRIEL", "ANNUEL"]);
export const programLevelEnum = pgEnum("program_level", ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]);
export const certStatusEnum = pgEnum("cert_status", ["NON_COMMENCEE", "EN_COURS", "VALIDEE"]);
export const meetingStatusEnum = pgEnum("meeting_status", [
  "PLANIFIEE",
  "EN_COURS",
  "TERMINEE",
  "ANNULEE",
]);
export const roadmapStatusEnum = pgEnum("roadmap_status", ["IDEE", "EN_COURS", "LIVRE"]);

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at").notNull().defaultNow();

// ---------- USERS ----------
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: roleEnum("role").notNull().default("MEMBRE"),
  phone: text("phone"),
  birthDate: timestamp("birth_date"),
  plan: planTypeEnum("plan").notNull().default("STANDARD"),
  avatarColor: text("avatar_color").notNull().default("#2563eb"),
  bio: text("bio"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const intervenantProfiles = pgTable("intervenant_profiles", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
  description: text("description"),
  hourlyRate: doublePrecision("hourly_rate").notNull().default(0),
  rating: doublePrecision("rating").notNull().default(5),
  sessionsCount: integer("sessions_count").notNull().default(0),
  score: integer("score").notNull().default(0),
});

// ---------- CLUBS ----------
export const clubs = pgTable("clubs", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  address: text("address"),
  phone: text("phone"),
  amenities: text("amenities").array().notNull().default([]),
  description: text("description"),
  createdAt: createdAt(),
});

export const clubMemberships = pgTable(
  "club_memberships",
  {
    id: id(),
    clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({ clubMembershipUnique: uniqueIndex("club_membership_unique").on(t.clubId, t.userId) })
);

// ---------- SESSIONS ----------
export const sessionsTable = pgTable("sessions", {
  id: id(),
  memberId: text("member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coachId: text("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull().default("INDIVIDUEL"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMin: integer("duration_min").notNull().default(45),
  status: sessionStatusEnum("status").notNull().default("PLANIFIEE"),
  jitsiRoom: text("jitsi_room").notNull().unique(),
  notes: text("notes"),
  createdAt: createdAt(),
});

// ---------- PROGRAMS ----------
export const programs = pgTable("programs", {
  id: id(),
  name: text("name").notNull(),
  level: programLevelEnum("level").notNull().default("DEBUTANT"),
  description: text("description"),
  createdAt: createdAt(),
});

export const programAssignments = pgTable("program_assignments", {
  id: id(),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedById: text("assigned_by_id").references(() => users.id),
  score: integer("score").notNull().default(0),
  assignedAt: createdAt(),
});

// ---------- COMMUNITY ----------
export const posts = pgTable("posts", {
  id: id(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull().default("AUCUN"),
  mediaUrl: text("media_url"),
  createdAt: createdAt(),
});

export const comments = pgTable("comments", {
  id: id(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const likes = pgTable(
  "likes",
  {
    id: id(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({ likeUnique: uniqueIndex("like_unique").on(t.postId, t.userId) })
);

// ---------- HEALTH / ICOPE ----------
export const icopeAssessments = pgTable("icope_assessments", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessedById: text("assessed_by_id").references(() => users.id),
  mobilite: integer("mobilite").notNull().default(0),
  nutrition: integer("nutrition").notNull().default(0),
  memoire: integer("memoire").notNull().default(0),
  vision: integer("vision").notNull().default(0),
  audition: integer("audition").notNull().default(0),
  bienEtre: integer("bien_etre").notNull().default(0),
  assessedAt: createdAt(),
});

// ---------- INBODY ----------
export const inBodyRecords = pgTable("inbody_records", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weightKg: doublePrecision("weight_kg").notNull(),
  heightCm: doublePrecision("height_cm"),
  imc: doublePrecision("imc").notNull(),
  muscleMassKg: doublePrecision("muscle_mass_kg").notNull(),
  fatMassPct: doublePrecision("fat_mass_pct").notNull(),
  visceralFat: doublePrecision("visceral_fat"),
  aiRecommendation: text("ai_recommendation"),
  uploadedAt: createdAt(),
});

// ---------- MUSCLE PROGRESSION ----------
export const muscleEvaluations = pgTable(
  "muscle_evaluations",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    assessedById: text("assessed_by_id").references(() => users.id),
    region: text("region").notNull(),
    side: muscleSideEnum("side").notNull(),
    level: muscleLevelEnum("level").notNull().default("NON_EVALUE"),
    evaluatedAt: createdAt(),
  },
  (t) => ({ muscleEvalUnique: uniqueIndex("muscle_eval_unique").on(t.userId, t.region, t.side) })
);

// ---------- SUBSCRIPTIONS ----------
export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formule: subFormuleEnum("formule").notNull().default("TRIMESTRIEL"),
  type: sessionTypeEnum("type").notNull().default("INDIVIDUEL"),
  price: doublePrecision("price").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  lastPaymentDate: timestamp("last_payment_date").notNull().defaultNow(),
});

// ---------- GAMIFICATION ----------
export const gamificationEvents = pgTable("gamification_events", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: createdAt(),
});

export const badges = pgTable("badges", {
  id: id(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  description: text("description"),
});

export const badgeAwards = pgTable(
  "badge_awards",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: createdAt(),
  },
  (t) => ({ badgeAwardUnique: uniqueIndex("badge_award_unique").on(t.userId, t.badgeId) })
);

// ---------- MEETINGS ----------
export const meetings = pgTable("meetings", {
  id: id(),
  title: text("title").notNull(),
  hostId: text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  jitsiRoom: text("jitsi_room").notNull().unique(),
  status: meetingStatusEnum("status").notNull().default("PLANIFIEE"),
  summary: text("summary"),
  createdAt: createdAt(),
});

export const meetingInvites = pgTable(
  "meeting_invites",
  {
    id: id(),
    meetingId: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({ meetingInviteUnique: uniqueIndex("meeting_invite_unique").on(t.meetingId, t.userId) })
);

// ---------- CERTIFICATIONS ----------
export const certifications = pgTable("certifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleCible: roleEnum("role_cible").notNull(),
  moduleName: text("module_name").notNull(),
  status: certStatusEnum("status").notNull().default("NON_COMMENCEE"),
  progressPct: integer("progress_pct").notNull().default(0),
  completedAt: timestamp("completed_at"),
});

// ---------- ROADMAP ----------
export const roadmapItems = pgTable("roadmap_items", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  quarter: text("quarter").notNull(),
  status: roadmapStatusEnum("status").notNull().default("IDEE"),
  authorId: text("author_id").references(() => users.id),
  createdAt: createdAt(),
});

// ---------- NOTIFICATIONS ----------
export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: createdAt(),
});

// ---------- RELATIONS (pour les requêtes imbriquées via query API) ----------
export const usersRelations = relations(users, ({ one, many }) => ({
  intervenantProfile: one(intervenantProfiles, {
    fields: [users.id],
    references: [intervenantProfiles.userId],
  }),
  memberSessions: many(sessionsTable, { relationName: "memberSessions" }),
  coachSessions: many(sessionsTable, { relationName: "coachSessions" }),
}));

export const intervenantProfilesRelations = relations(intervenantProfiles, ({ one }) => ({
  user: one(users, { fields: [intervenantProfiles.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  member: one(users, { fields: [sessionsTable.memberId], references: [users.id], relationName: "memberSessions" }),
  coach: one(users, { fields: [sessionsTable.coachId], references: [users.id], relationName: "coachSessions" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

export const clubMembershipsRelations = relations(clubMemberships, ({ one }) => ({
  club: one(clubs, { fields: [clubMemberships.clubId], references: [clubs.id] }),
  user: one(users, { fields: [clubMemberships.userId], references: [users.id] }),
}));

export const programAssignmentsRelations = relations(programAssignments, ({ one }) => ({
  program: one(programs, { fields: [programAssignments.programId], references: [programs.id] }),
  user: one(users, { fields: [programAssignments.userId], references: [users.id] }),
  assignedBy: one(users, { fields: [programAssignments.assignedById], references: [users.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  host: one(users, { fields: [meetings.hostId], references: [users.id] }),
  invites: many(meetingInvites),
}));

export const meetingInvitesRelations = relations(meetingInvites, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingInvites.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingInvites.userId], references: [users.id] }),
}));

export const badgeAwardsRelations = relations(badgeAwards, ({ one }) => ({
  badge: one(badges, { fields: [badgeAwards.badgeId], references: [badges.id] }),
  user: one(users, { fields: [badgeAwards.userId], references: [users.id] }),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one }) => ({
  author: one(users, { fields: [roadmapItems.authorId], references: [users.id] }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(users, { fields: [certifications.userId], references: [users.id] }),
}));

export const icopeAssessmentsRelations = relations(icopeAssessments, ({ one }) => ({
  user: one(users, { fields: [icopeAssessments.userId], references: [users.id] }),
  assessedBy: one(users, { fields: [icopeAssessments.assessedById], references: [users.id] }),
}));

export const inBodyRecordsRelations = relations(inBodyRecords, ({ one }) => ({
  user: one(users, { fields: [inBodyRecords.userId], references: [users.id] }),
}));

export const muscleEvaluationsRelations = relations(muscleEvaluations, ({ one }) => ({
  user: one(users, { fields: [muscleEvaluations.userId], references: [users.id] }),
  assessedBy: one(users, { fields: [muscleEvaluations.assessedById], references: [users.id] }),
}));
