import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatCard, StatusPill, EmptyState, Loading } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function CoachSpace() {
  const { user } = useAuth();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get("/sessions")).data,
  });

  const upcoming = sessions?.filter((s: any) => new Date(s.scheduledAt) >= new Date()) || [];
  const done = sessions?.filter((s: any) => s.status === "EFFECTUEE") || [];
  const uniqueMembers = new Set(sessions?.map((s: any) => s.member?.id)).size;

  return (
    <div>
      <PageHeader title="Espace Coach sportif" />
      <div className="space-y-6 p-8">
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
                    {format(new Date(s.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })} · {s.type === "GROUPE" ? "Groupe" : "Individuel"}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
