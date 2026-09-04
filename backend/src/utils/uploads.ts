import path from "path";
import fs from "fs";

// Dossier de stockage des médias uploadés (photos/vidéos de la Communauté).
// process.cwd() vaut /app en conteneur (WORKDIR défini dans le Dockerfile),
// donc ce dossier correspond à /app/uploads, monté en volume Docker pour
// survivre aux rebuilds de l'image.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
