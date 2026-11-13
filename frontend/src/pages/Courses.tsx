import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Button, Card, EmptyState, Loading } from "../components/ui";
import { useAuth, isFollowed } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

interface Course {
  id: string;
  title: string | null;
  notes: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  capacity: number | null;
  placesTaken: number;
  enrolled: boolean;
  coach: { firstName: string; lastName: string } | null;
}

/** Catalogue des cours ouverts : l'adhérent s'y inscrit ou s'en désinscrit lui-même. */
export default function Courses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/sessions/available")).data as Course[],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["courses"] });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const enroll = useMutation({
    mutationFn: async (c: Course) => (await api.post(`/sessions/${c.id}/enroll`)).data,
    onSuccess: (_d, c) => {
      setMessage({ type: "ok", text: `Inscription confirmée : ${courseName(c)}, ${when(c)}. Retrouvez-le dans « Mes séances ».` });
      refresh();
    },
    onError: (e: any) => {
      setMessage({ type: "error", text: e?.response?.data?.error || "Inscription impossible" });
      refresh();
    },
  });

  const leave = useMutation({
    mutationFn: async (c: Course) => (await api.delete(`/sessions/${c.id}/enroll`)).data,
    onSuccess: (_d, c) => {
      setMessage({ type: "ok", text: `Vous êtes désinscrit de ${courseName(c)}.` });
      refresh();
    },
    onError: (e: any) => setMessage({ type: "error", text: e?.response?.data?.error || "Désinscription impossible" }),
  });

  const busy = enroll.isPending || leave.isPending;

  // Avant l'entretien d'accueil, le client suit son parcours depuis le tableau de bord.
  if (!isFollowed(user)) return <Navigate to="/tableau-de-bord" replace />;

  return (
    <div>
      <PageHeader title="Cours disponibles" />
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-slate-500">
          Inscrivez-vous aux cours en visio proposés par nos coachs. Le jour J, rejoignez le cours depuis « Mes séances ».
        </p>

        {message && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {isLoading && <Loading />}
        {!isLoading && courses?.length === 0 && (
          <EmptyState
            icon="🗓️"
            title="Aucun cours ouvert pour le moment"
            subtitle="Les prochains cours apparaîtront ici dès que votre coach les aura programmés."
          />
        )}

        {courses?.map((c) => {
          const full = c.capacity !== null && c.placesTaken >= c.capacity;
          const left = c.capacity !== null ? c.capacity - c.placesTaken : null;
          const started = new Date(c.scheduledAt).getTime() <= Date.now();
          return (
            <Card key={c.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">{courseName(c)}</div>
                <div className="text-xs text-slate-500">
                  {when(c)} · {c.durationMin} min
                  {c.coach && ` · avec ${c.coach.firstName} ${c.coach.lastName}`}
                </div>
                {c.notes && <div className="mt-1 text-xs italic text-slate-500">{c.notes}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {c.enrolled && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">✓ Inscrit</span>
                  )}
                  {left !== null && (
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        full ? "bg-slate-100 text-slate-500" : left <= 2 ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {full ? "Complet" : `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`}
                    </span>
                  )}
                  {c.capacity !== null && (
                    <span className="text-slate-400">
                      {c.placesTaken} / {c.capacity} inscrits
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {c.enrolled ? (
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={busy || started}
                    onClick={() => {
                      if (confirm(`Se désinscrire de ${courseName(c)} ?`)) leave.mutate(c);
                    }}
                  >
                    Se désinscrire
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" disabled={busy || full} onClick={() => enroll.mutate(c)}>
                    {full ? "Complet" : "S'inscrire"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function courseName(c: Course): string {
  return c.title || "Cours collectif";
}

function when(c: Course): string {
  return format(new Date(c.scheduledAt), "EEEE d MMMM 'à' HH:mm", { locale: fr });
}
