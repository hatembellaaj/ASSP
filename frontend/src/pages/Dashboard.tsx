import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatCard, ProgressBar, Loading, EmptyState } from "../components/ui";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  if (isLoading || !data) return <Loading />;

  const engagementMax = 300;

  return (
    <div>
      <PageHeader title="Tableau de bord" />
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 text-white">
          <div>
            <div className="text-sm text-brand-100">Bonjour, 👋</div>
            <div className="text-lg font-semibold">
              Plan {data.user?.plan === "PREMIUM" ? "Premium" : "Standard"} — continuez comme ça !
            </div>
          </div>
          <Link to="/seances" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">
            Réserver une séance →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="✅" label="Séances effectuées" value={data.stats.seancesEffectuees} />
          <StatCard icon="📅" label="Séances ce mois" value={data.stats.seancesCeMois} />
          <StatCard
            icon="💙"
            label="Score ICOPE"
            value={data.stats.scoreIcope !== null ? `${data.stats.scoreIcope}/${data.stats.scoreIcopeMax}` : "—"}
          />
          <StatCard icon="⏳" label="Mon niveau" value="Engagement" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">🏆 Ma progression — Engagement</span>
              <span className="text-xs text-slate-400">{data.stats.engagementPoints} / {engagementMax} pts</span>
            </div>
            <ProgressBar value={data.stats.engagementPoints} max={engagementMax} />
          </Card>

          <Card>
            <div className="mb-3 text-sm font-semibold text-slate-700">📋 Mon abonnement</div>
            {data.abonnement ? (
              <dl className="space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Formule</dt>
                  <dd className="font-medium text-slate-900">{data.abonnement.formule} · {data.abonnement.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Fin de l'abonnement</dt>
                  <dd>{format(new Date(data.abonnement.endDate), "d MMM yyyy", { locale: fr })}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Dernier paiement</dt>
                  <dd>{data.abonnement.price} € · {format(new Date(data.abonnement.lastPaymentDate), "d MMM yyyy", { locale: fr })}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Aucun abonnement actif.</p>
            )}
          </Card>
        </div>

        {data.icope && (
          <Card>
            <div className="mb-3 text-sm font-semibold text-slate-700">💙 Mon bilan ICOPE</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Mobilité", data.icope.mobilite],
                ["Nutrition", data.icope.nutrition],
                ["Mémoire", data.icope.memoire],
                ["Vision", data.icope.vision],
                ["Audition", data.icope.audition],
                ["Bien-être", data.icope.bienEtre],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{label}</span>
                    <span>{val}/4</span>
                  </div>
                  <ProgressBar value={val as number} max={4} color={(val as number) >= 3 ? "#16a34a" : (val as number) >= 2 ? "#f59e0b" : "#ef4444"} />
                </div>
              ))}
            </div>
          </Card>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Prochaines séances</h2>
            <Link to="/seances" className="text-xs text-brand-600 hover:underline">Voir tout →</Link>
          </div>
          {data.prochainesSeances?.length ? (
            <div className="space-y-2">
              {data.prochainesSeances.map((s: any) => (
                <Card key={s.id} className="flex items-center justify-between py-3">
                  <div className="text-sm">
                    <div className="font-medium text-slate-800">
                      {s.coach?.firstName} {s.coach?.lastName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(s.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })} · {s.durationMin} min
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon="📅" title="Aucune séance planifiée" subtitle="Réservez votre prochaine séance avec un coach." />
          )}
        </div>
      </div>
    </div>
  );
}
