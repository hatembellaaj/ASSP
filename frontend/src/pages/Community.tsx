import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Avatar, Button, Loading, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";

type PendingMedia = { mediaType: "PHOTO" | "VIDEO"; mediaUrl: string };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Programmateur",
  ENTRAINEUR: "Coach",
  CONSEILLER: "Conseiller",
  MEMBRE: "Membre",
};

export default function Community() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => (await api.get("/community/posts")).data,
  });

  const uploadMedia = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return (await api.post("/community/upload", formData)).data as PendingMedia;
    },
    onSuccess: (data) => {
      setMediaError(null);
      setPendingMedia(data);
    },
    onError: (err: any) => {
      setMediaError(err?.response?.data?.error || "Échec de l'envoi du fichier");
    },
  });

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadMedia.mutate(file);
  }

  const createPost = useMutation({
    mutationFn: async () =>
      (
        await api.post("/community/posts", {
          content,
          mediaType: pendingMedia?.mediaType,
          mediaUrl: pendingMedia?.mediaUrl,
        })
      ).data,
    onSuccess: () => {
      setContent("");
      setPendingMedia(null);
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) =>
      (await api.post(`/community/posts/${postId}/comments`, { content: text })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => (await api.post(`/community/posts/${postId}/like`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  return (
    <div>
      <PageHeader title="Communauté" />
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        <Card>
          <div className="flex gap-3">
            <Avatar firstName={user?.firstName} lastName={user?.lastName} color={user?.avatarColor} />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Partagez quelque chose avec la communauté…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          {pendingMedia && (
            <div className="relative mt-3 inline-block">
              {pendingMedia.mediaType === "PHOTO" ? (
                <img src={pendingMedia.mediaUrl} alt="Aperçu" className="max-h-48 rounded-lg border border-slate-200" />
              ) : (
                <video src={pendingMedia.mediaUrl} controls className="max-h-48 rounded-lg border border-slate-200" />
              )}
              <button
                type="button"
                onClick={() => setPendingMedia(null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white shadow"
                aria-label="Retirer le média"
              >
                ✕
              </button>
            </div>
          )}
          {uploadMedia.isPending && <p className="mt-2 text-xs text-slate-400">Envoi du fichier…</p>}
          {mediaError && <p className="mt-2 text-xs text-rose-600">{mediaError}</p>}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-3 text-xs text-slate-500">
              <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handleFileSelected} />
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleFileSelected} />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadMedia.isPending}
                className="hover:text-brand-600"
              >
                📷 Photo
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadMedia.isPending}
                className="hover:text-brand-600"
              >
                🎬 Vidéo
              </button>
              <span>😊 Émotion</span>
            </div>
            <Button
              disabled={!content.trim() || createPost.isPending || uploadMedia.isPending}
              onClick={() => createPost.mutate()}
            >
              Publier
            </Button>
          </div>
        </Card>

        {isLoading && <Loading />}
        {!isLoading && posts?.length === 0 && <EmptyState title="Aucune publication pour le moment" />}

        {posts?.map((post: any) => {
          const liked = post.likes?.some((l: any) => l.userId === user?.id);
          return (
            <Card key={post.id}>
              <div className="mb-2 flex items-center gap-3">
                <Avatar firstName={post.author?.firstName} lastName={post.author?.lastName} color={post.author?.avatarColor} />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {post.author?.firstName} {post.author?.lastName}{" "}
                    <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                      {ROLE_LABEL[post.author?.role] || post.author?.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
                  </div>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm text-slate-700">{post.content}</p>

              {post.mediaType === "PHOTO" && post.mediaUrl && (
                <img src={post.mediaUrl} alt="" className="mt-2 max-h-96 w-full rounded-lg object-cover" />
              )}
              {post.mediaType === "VIDEO" && post.mediaUrl && (
                <video src={post.mediaUrl} controls className="mt-2 max-h-96 w-full rounded-lg" />
              )}

              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <button
                  onClick={() => toggleLike.mutate(post.id)}
                  className={`flex items-center gap-1 hover:text-brand-600 ${liked ? "font-semibold text-brand-600" : ""}`}
                >
                  👍 J'aime {post.likes?.length ? `(${post.likes.length})` : ""}
                </button>
                <span>💬 Commenter ({post.comments?.length || 0})</span>
              </div>

              {post.comments?.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                  {post.comments.map((c: any) => (
                    <div key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">
                        {c.author?.firstName} {c.author?.lastName}
                      </span>{" "}
                      <span className="text-slate-600">{c.content}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <input
                  value={commentDrafts[post.id] || ""}
                  onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                  placeholder="Écrire un commentaire…"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentDrafts[post.id]?.trim()) {
                      addComment.mutate({ postId: post.id, text: commentDrafts[post.id] });
                      setCommentDrafts((d) => ({ ...d, [post.id]: "" }));
                    }
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
