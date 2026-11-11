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

export default function CoachSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [active, setActive] = useState<{ id: string; title: string } | null>(null);
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
  const uniqueMembers = new Set(sessions?.filter((s: any) => s.status !== "ANNULEE").map((s: any) => s.member?.id)).size;

  return (
    <div>
      <PageHeader
        title="Espace Coach sportif"
        action={!showForm && <Button onClick={() => setShowForm(true)}>+ Planifier une séance</Button>}
      />
      <div className="space-y-6 p-8">
        {showForm && <ScheduleSessionForm onDone={() => setShowForm(false)} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {s.member?.firstName} {s.member?.lastName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(s.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })} · {s.durationMin} min
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={s.status} />
                  <Button
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (confirm(`Annuler la séance avec ${s.member?.firstName} ${s.member?.lastName} ?`)) cancel.mutate(s.id);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={() => setActive({ id: s.id, title: `Séance avec ${s.member?.firstName} ${s.member?.lastName}` })}>
                    Rejoindre
                  </Button>
                </div>
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
