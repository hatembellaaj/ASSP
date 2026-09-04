import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Avatar, Button, Loading } from "../components/ui";

export default function Coaches() {
  const { data, isLoading } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => (await api.get("/coaches")).data,
  });

  return (
    <div>
      <PageHeader title="Mes coachs" />
      <div className="p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Choisissez un coach certifié pour vous accompagner.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> 40% Progression clients
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> 30% Avis utilisateurs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 20% Régularité séances
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> 10% Taux de rétention
            </span>
          </div>
        </div>
        {isLoading && <Loading />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((coach: any) => (
            <Card key={coach.id}>
              <div className="mb-3 flex items-center justify-between">
                <Avatar firstName={coach.firstName} lastName={coach.lastName} color={coach.avatarColor} size={44} />
                {coach.intervenantProfile && (
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                    Score {coach.intervenantProfile.score}/100
                  </span>
                )}
              </div>
              <div className="font-semibold text-slate-900">
                {coach.firstName} {coach.lastName}
              </div>
              <div className="mb-2 text-xs font-medium text-brand-600">{coach.intervenantProfile?.specialty}</div>
              {coach.bio && <p className="mb-3 text-sm text-slate-500">{coach.bio}</p>}
              <div className="mb-3 flex items-center gap-3 text-xs text-slate-400">
                <span>⭐ {coach.intervenantProfile?.rating?.toFixed(1)}</span>
                <span>{coach.intervenantProfile?.sessionsCount} séances</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{coach.intervenantProfile?.hourlyRate} €/h</span>
                <Button variant="secondary">Voir le calendrier</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
