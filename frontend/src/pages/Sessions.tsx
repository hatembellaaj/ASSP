import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill, Button, Loading, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import JitsiRoom from "../components/JitsiRoom";

export default function Sessions() {
  const { user } = useAuth();
  const isIntervenant = user?.role === "ENTRAINEUR" || user?.role === "CONSEILLER";
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get("/sessions")).data,
  });

  return (
    <div>
      <PageHeader title="Mes séances" />
      <div className="mx-auto max-w-3xl space-y-3 p-8">
        {isLoading && <Loading />}
        {!isLoading && sessions?.length === 0 && (
          <EmptyState icon="🎥" title="Aucune séance" subtitle="Vos séances de coaching apparaîtront ici." />
        )}
        {sessions?.map((s: any) => (
          <Card key={s.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {s.type === "GROUPE" ? "Groupe" : "Individuel"} ·{" "}
                {isIntervenant ? `${s.member?.firstName} ${s.member?.lastName}` : `${s.coach?.firstName} ${s.coach?.lastName}`}
              </div>
              <div className="text-xs text-slate-400">
                {format(new Date(s.scheduledAt), "EEEE d MMMM yyyy à HH:mm", { locale: fr })} · {s.durationMin} min
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={s.status} />
              <Button variant="secondary" onClick={() => setActiveRoom(s.jitsiRoom)}>
                Rejoindre
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {activeRoom && (
        <JitsiRoom
          room={activeRoom}
          displayName={`${user?.firstName} ${user?.lastName}`}
          onClose={() => setActiveRoom(null)}
        />
      )}
    </div>
  );
}
