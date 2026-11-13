import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill, Button, Loading, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import JitsiRoom from "../components/JitsiRoom";
import { participantsFullList, participantsLabel, sessionParticipants } from "../utils/sessions";

export default function Sessions() {
  const { user } = useAuth();
  const isIntervenant = user?.role === "ENTRAINEUR" || user?.role === "CONSEILLER";
  const [active, setActive] = useState<{ id: string; title: string } | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get("/sessions")).data,
  });

  return (
    <div>
      <PageHeader title="Mes séances" />
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6 lg:p-8">
        {isLoading && <Loading />}
        {!isLoading && sessions?.length === 0 && (
          <EmptyState icon="🎥" title="Aucune séance" subtitle="Vos séances de coaching apparaîtront ici." />
        )}
        {sessions?.map((s: any) => (
          <Card key={s.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                {sessionParticipants(s).length > 1 ? "Groupe" : "Individuel"} ·{" "}
                {isIntervenant ? participantsLabel(s) : `${s.coach?.firstName} ${s.coach?.lastName}`}
              </div>
              <div className="text-xs text-slate-400">
                {format(new Date(s.scheduledAt), "EEEE d MMMM yyyy à HH:mm", { locale: fr })} · {s.durationMin} min
              </div>
              {sessionParticipants(s).length > 1 && (
                <div className="mt-1 text-xs text-slate-500">Participants : {participantsFullList(s)}</div>
              )}
              {s.notes && <div className="mt-1 text-xs italic text-slate-500">{s.notes}</div>}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <StatusPill status={s.status} />
              <Button
                variant="secondary"
                disabled={s.status === "ANNULEE"}
                onClick={() =>
                  setActive({
                    id: s.id,
                    title: isIntervenant
                      ? `Séance · ${participantsLabel(s)}`
                      : `Séance avec ${s.coach?.firstName} ${s.coach?.lastName}`,
                  })
                }
              >
                Rejoindre
              </Button>
            </div>
          </Card>
        ))}
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
