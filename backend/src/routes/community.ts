import { Router } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { db, newId } from "../db";
import { posts, comments, likes, users } from "../db/schema";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { alias } from "drizzle-orm/pg-core";
import { UPLOAD_DIR } from "../utils/uploads";

const router = Router();
const commentAuthorAlias = alias(users, "comment_author");

// ---------- Upload de médias (photos / vidéos) ----------
const ALLOWED_MIME: Record<string, "PHOTO" | "VIDEO"> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "image/webp": "PHOTO",
  "image/gif": "PHOTO",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) return cb(null, true);
    cb(new Error("Type de fichier non supporté (photos ou vidéos uniquement)"));
  },
});

router.post("/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Échec de l'envoi du fichier" });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    const mediaType = ALLOWED_MIME[req.file.mimetype];
    res.status(201).json({ mediaType, mediaUrl: `/api/uploads/${req.file.filename}` });
  });
});

router.get("/posts", requireAuth, async (_req, res) => {
  const postRows = await db
    .select({
      post: posts,
      author: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatarColor: users.avatarColor,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

  const allComments = await db
    .select({
      comment: comments,
      author: { firstName: commentAuthorAlias.firstName, lastName: commentAuthorAlias.lastName, role: commentAuthorAlias.role },
    })
    .from(comments)
    .leftJoin(commentAuthorAlias, eq(comments.authorId, commentAuthorAlias.id))
    .orderBy(asc(comments.createdAt));

  const allLikes = await db.select().from(likes);

  const result = postRows.map((p) => ({
    ...p.post,
    author: p.author,
    comments: allComments.filter((c) => c.comment.postId === p.post.id).map((c) => ({ ...c.comment, author: c.author })),
    likes: allLikes.filter((l) => l.postId === p.post.id),
  }));

  res.json(result);
});

router.post("/posts", requireAuth, async (req: AuthedRequest, res) => {
  const { content, mediaType, mediaUrl } = req.body;
  const [post] = await db
    .insert(posts)
    .values({ id: newId(), authorId: req.userId!, content, mediaType: mediaType || "AUCUN", mediaUrl })
    .returning();
  const [author] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role, avatarColor: users.avatarColor })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);
  res.status(201).json({ ...post, author });
});

router.post("/posts/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const { content } = req.body;
  const [comment] = await db
    .insert(comments)
    .values({ id: newId(), postId: req.params.id, authorId: req.userId!, content })
    .returning();
  const [author] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);
  res.status(201).json({ ...comment, author });
});

router.post("/posts/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const [existing] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.postId, req.params.id), eq(likes.userId, req.userId!)))
    .limit(1);
  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    return res.json({ liked: false });
  }
  await db.insert(likes).values({ id: newId(), postId: req.params.id, userId: req.userId! });
  res.json({ liked: true });
});

export default router;
