import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatCard, StatusPill, EmptyState, Loading, Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import ScheduleSessionForm from "../components/ScheduleSessionForm";
import JitsiRoom from "../components/JitsiRoom";
import ParticipantPicker from "../components/ParticipantPicker";
import { participantsFullList, participantsLabel, sessionParticipants, sessionTitle } from "../utils/sessions";

/** Modification des participants d'une séance déjà planifiée. */
function EditParticipants({ session, onDone }: { session: any; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [memberIds, setMemberIds] = useState<string[]>(sessionParticipants(session).map((p) => p.id));
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () => (await api.put(`/sessions/${session.id}/participants`, { memberIds })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onDone();
    },
    onError: (e: any) => setError(e?.response?.data?.error || "Modification impossible"),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <ParticipantPicker value={memberIds} onChange={setMemberIds} max={session.isOpen && session.capacity ? session.capacity : undefined} />
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Fermer
        </Button>
        <Button disabled={save.isPending || (memberIds.length === 0 && !session.isOpen)} onClick={() => save.mutate()}>
          {save.isPending ? "Enregistrement…" : "Enregistrer les participants"}
        </Button>
      </div>
    </div>
  );
}

export default function CoachSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [active, setActive] = useState<{ id: string; title: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: async (id: string) => api.patch(`/sessions/${id}/status`, { status: "ANNULEE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get("/sessions")).data,
  });

  // À venir = pas encore terminée (inclut la séance en cours) et non annulée, de la plus proche à la plus lointaine
  const upcoming =
    sessions
      ?.filter(
        (s: any) =>
          new Date(s.scheduledAt).getTime() + s.durationMin * 60000 >= Date.now() && s.status !== "ANNULEE"
      )
      .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) || [];
  const done = sessions?.filter((s: any) => s.status === "EFFECTUEE") || [];
  const uniqueMembers = new Set(
    sessions?.filter((s: any) => s.status !== "ANNULEE").flatMap((s: any) => sessionParticipants(s).map((p) => p.id))
  ).size;

  return (
    <div>
      <PageHeader
        title="Espace Coach sportif"
        action={!showForm && <Button onClick={() => setShowForm(true)}>+ Planifier une séance</Button>}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {showForm && <ScheduleSessionForm onDone={() => setShowForm(false)} />}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard icon="🎥" label="Séances données" value={done.length} />
          <StatCard icon="📅" label="Séances à venir" value={upcoming.length} />
          <StatCard icon="👥" label="Adhérents suivis" value={uniqueMembers} />
        </div>
        {user?.intervenantProfile && (
          <Card className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">{user.intervenantProfile.specialty}</div>
              <div className="text-xs text-slate-400">{user.intervenantProfile.hourlyRate} €/h · Score {user.intervenantProfile.score}/100</div>
            </div>
            <div className="text-sm text-amber-500">⭐ {user.intervenantProfile.rating?.toFixed(1)}</div>
          </Card>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Mes prochaines séances</h2>
          {isLoading && <Loading />}
          {!isLoading && upcoming.length === 0 && <EmptyState title="Aucune séance à venir" />}
          <div className="space-y-2">
            {upcoming.map((s: any) => (
              <Card key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-800" title={participantsFullList(s)}>
                        {sessionTitle(s)}
                      </span>
                      {s.isOpen && (
                        <span className="whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          Ouvert · {participantsLabel(s)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(s.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })} · {s.durationMin} min
                    </div>
                    {(s.title || s.isOpen ? sessionParticipants(s).length > 0 : sessionParticipants(s).length > 2) && (
                      <div className="mt-1 text-xs text-slate-500">{participantsFullList(s)}</div>
                    )}
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <StatusPill status={s.status} />
                    <Button variant="ghost" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                      Participants
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={cancel.isPending}
                      onClick={() => {
                        if (confirm(`Annuler « ${sessionTitle(s)} » ? Tous les participants seront concernés.`))
                          cancel.mutate(s.id);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setActive({ id: s.id, title: sessionTitle(s) })}
                    >
                      Rejoindre
                    </Button>
                  </div>
                </div>
                {editing === s.id && <EditParticipants session={s} onDone={() => setEditing(null)} />}
              </Card>
            ))}
          </div>
        </div>
      </div>
      {active && (
        <JitsiRoom
          joinPath={`/sessions/${active.id}/join`}
          title={active.title}
          displayName={`${user?.firstName} ${user?.lastName}`}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
