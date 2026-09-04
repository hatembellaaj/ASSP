import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill, Button, EmptyState, Loading } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import JitsiRoom from "../components/JitsiRoom";

export default function Meetings() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await api.get("/meetings")).data,
  });

  const upcoming = data?.filter((m: any) => new Date(m.scheduledAt) >= new Date() && m.status !== "TERMINEE") || [];
  const history = data?.filter((m: any) => !(new Date(m.scheduledAt) >= new Date() && m.status !== "TERMINEE")) || [];

  return (
    <div>
      <PageHeader title="Mes réunions" />
      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <p className="text-sm text-slate-500">Retrouvez ici les réunions auxquelles vous êtes convié(e), ainsi que l'historique.</p>

        {isLoading && <Loading />}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">À venir</h2>
            <span className="text-xs text-slate-400">{upcoming.length} réunion(s)</span>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Vous n'avez aucune réunion à venir." />
          ) : (
            <div className="space-y-2">
              {upcoming.map((m: any) => (
                <Card key={m.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{m.title}</div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(m.scheduledAt), "d MMM yyyy, HH:mm", { locale: fr })} · {m.invites?.length || 0} invité(s)
                    </div>
                  </div>
                  <Button onClick={() => setActiveRoom(m.jitsiRoom)}>Rejoindre</Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Historique</h2>
            <span className="text-xs text-slate-400">{history.length} réunion(s)</span>
          </div>
          <div className="space-y-2">
            {history.map((m: any) => (
              <Card key={m.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{m.title}</div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(m.scheduledAt), "EEE d MMM, HH:mm", { locale: fr })} · {m.invites?.length || 0} invité(s)
                  </div>
                </div>
                <StatusPill status={m.status} />
              </Card>
            ))}
          </div>
        </div>
      </div>
      {activeRoom && (
        <JitsiRoom room={activeRoom} displayName={`${user?.firstName} ${user?.lastName}`} onClose={() => setActiveRoom(null)} />
      )}
    </div>
  );
}
