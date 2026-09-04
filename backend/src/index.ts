import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import coachRoutes from "./routes/coaches";
import clubRoutes from "./routes/clubs";
import sessionRoutes from "./routes/sessions";
import programRoutes from "./routes/programs";
import communityRoutes from "./routes/community";
import healthRoutes from "./routes/health";
import inbodyRoutes from "./routes/inbody";
import progressionRoutes from "./routes/progression";
import subscriptionRoutes from "./routes/subscriptions";
import gamificationRoutes from "./routes/gamification";
import meetingRoutes from "./routes/meetings";
import certificationRoutes from "./routes/certifications";
import roadmapRoutes from "./routes/roadmap";
import dashboardRoutes from "./routes/dashboard";
import conseillerRoutes from "./routes/conseiller";
import notificationRoutes from "./routes/notifications";
import { UPLOAD_DIR } from "./utils/uploads";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Fichiers médias uploadés (photos/vidéos de la Communauté)
app.use("/api/uploads", express.static(UPLOAD_DIR));

app.get("/api/health-check", (_req, res) => res.json({ ok: true, service: "mouvplus-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/inbody", inbodyRoutes);
app.use("/api/progression", progressionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/certifications", certificationRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/conseiller", conseillerRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur serveur" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`MouvPlus backend démarré sur le port ${PORT}`);
});
