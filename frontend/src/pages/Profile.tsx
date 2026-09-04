import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Avatar, ProgressBar, StatusPill, Loading } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  const { data: gamification, isLoading: loadingGam } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => (await api.get("/gamification/me")).data,
  });
  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get("/sessions")).data,
  });
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/subscriptions/mine")).data,
  });

  if (!user) return <Loading />;

  return (
    <div>
      <PageHeader title="Mon profil" />
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <Card className="flex items-center gap-4 bg-gradient-to-r from-brand-700 to-brand-500 text-white">
          <Avatar firstName={user.firstName} lastName={user.lastName} color="rgba(255,255,255,0.2)" size={56} />
          <div>
            <div className="text-lg font-semibold">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-brand-100">{user.email}</div>
            {subscription && <div className="text-xs text-brand-200">Membre depuis {format(new Date(subscription.startDate), "d MMM yyyy", { locale: fr })}</div>}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Informations personnelles</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Email" value={user.email} />
              <Row label="Téléphone" value={user.phone || "—"} />
              <Row label="Plan" value={user.plan} />
              {user.bio && <Row label="Bio" value={user.bio} />}
            </dl>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">🏆 Mon niveau &amp; points</h3>
            {loadingGam ? (
              <Loading />
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{gamification?.level?.name}</span>
                  <span className="text-slate-400">{gamification?.totalPoints} pts accumulés</span>
                </div>
                <ProgressBar value={gamification?.level?.progressPct || 0} max={100} color="#7c3aed" />
                <div className="mt-4 flex flex-wrap gap-3">
                  {gamification?.badges?.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      <span>{b.badge?.icon}</span> {b.badge?.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Historique des séances</h3>
          <div className="space-y-2">
            {sessions?.slice(0, 8).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm last:border-0">
                <div>
                  <div className="font-medium text-slate-800">
                    {s.coach?.firstName} {s.coach?.lastName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(s.scheduledAt), "d MMM yyyy, HH:mm", { locale: fr })}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </div>
            ))}
            {sessions?.length === 0 && <p className="text-sm text-slate-400">Aucune séance pour le moment.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
