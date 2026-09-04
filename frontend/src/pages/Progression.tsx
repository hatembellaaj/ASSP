import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, EmptyState, Loading } from "../components/ui";

const LEVEL_COLORS: Record<string, string> = {
  NON_EVALUE: "#cbd5e1",
  URGENT: "#ef4444",
  A_AMELIORER: "#f59e0b",
  BIEN: "#22c55e",
  TRES_BIEN: "#16a34a",
  OPTIMAL: "#0f172a",
};

const LEVEL_LABELS: Record<string, string> = {
  NON_EVALUE: "Non évalué",
  URGENT: "Urgent",
  A_AMELIORER: "À améliorer",
  BIEN: "Bien",
  TRES_BIEN: "Très bien",
  OPTIMAL: "Optimal",
};

// positions approximatives (en % du silhouette) pour chaque région, avant / arrière
const REGIONS_AVANT = [
  { key: "epaules", label: "Épaules", cx: 50, cy: 18 },
  { key: "pectoraux", label: "Pectoraux", cx: 50, cy: 28 },
  { key: "abdominaux", label: "Abdominaux", cx: 50, cy: 40 },
  { key: "bras", label: "Bras", cx: 25, cy: 32 },
  { key: "avant-bras", label: "Avant-bras", cx: 22, cy: 48 },
  { key: "quadriceps", label: "Quadriceps", cx: 42, cy: 65 },
  { key: "quadriceps-d", label: "Quadriceps", cx: 58, cy: 65 },
];

const REGIONS_ARRIERE = [
  { key: "trapezes", label: "Trapèzes", cx: 50, cy: 16 },
  { key: "dos", label: "Dos", cx: 50, cy: 30 },
  { key: "lombaires", label: "Lombaires", cx: 50, cy: 42 },
  { key: "triceps", label: "Triceps", cx: 25, cy: 32 },
  { key: "fessiers", label: "Fessiers", cx: 50, cy: 52 },
  { key: "ischios", label: "Ischio-jambiers", cx: 42, cy: 65 },
  { key: "mollets", label: "Mollets", cx: 50, cy: 82 },
];

function MiniBody({ side, evaluations }: { side: "AVANT" | "ARRIERE"; evaluations: any[] }) {
  const regions = side === "AVANT" ? REGIONS_AVANT : REGIONS_ARRIERE;
  return (
    <div className="relative mx-auto h-72 w-40">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <ellipse cx="50" cy="8" rx="8" ry="8" fill="#e2e8f0" />
        <rect x="38" y="16" width="24" height="40" rx="10" fill="#e2e8f0" />
        <rect x="20" y="18" width="10" height="35" rx="5" fill="#e2e8f0" />
        <rect x="70" y="18" width="10" height="35" rx="5" fill="#e2e8f0" />
        <rect x="38" y="55" width="10" height="35" rx="5" fill="#e2e8f0" />
        <rect x="52" y="55" width="10" height="35" rx="5" fill="#e2e8f0" />
      </svg>
      {regions.map((r) => {
        const evalItem = evaluations.find((e) => e.region === r.key);
        const level = evalItem?.level || "NON_EVALUE";
        return (
          <div
            key={r.key}
            title={`${r.label}: ${LEVEL_LABELS[level]}`}
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${r.cx}%`, top: `${r.cy}%`, backgroundColor: LEVEL_COLORS[level] }}
          />
        );
      })}
    </div>
  );
}

export default function Progression() {
  const { data, isLoading } = useQuery({
    queryKey: ["muscle-evaluations"],
    queryFn: async () => (await api.get("/progression/muscles")).data,
  });

  const hasEvaluations = data && data.length > 0;

  return (
    <div>
      <PageHeader title="Ma progression musculaire" />
      <div className="p-8">
        <div className="mb-6 rounded-xl bg-gradient-to-r from-purple-600 to-brand-500 px-6 py-4 text-white">
          <div className="text-xs text-purple-100">Tableau de progression</div>
          <div className="text-lg font-semibold">Mes muscles</div>
          <div className="text-sm text-purple-100">
            {hasEvaluations ? "Évaluation réalisée par votre conseiller sportif" : "En attente de votre première évaluation"}
          </div>
        </div>

        {isLoading && <Loading />}

        {!isLoading && !hasEvaluations && (
          <EmptyState
            icon="✨"
            title="Évaluation en attente"
            subtitle="Votre conseiller sportif évaluera vos groupes musculaires lors de votre séance d'évaluation. L'avatar se colorera ensuite automatiquement."
          />
        )}

        {hasEvaluations && (
          <Card>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="mb-2 text-center text-xs font-medium uppercase text-slate-400">Avant</div>
                <MiniBody side="AVANT" evaluations={data} />
              </div>
              <div>
                <div className="mb-2 text-center text-xs font-medium uppercase text-slate-400">Arrière</div>
                <MiniBody side="ARRIERE" evaluations={data} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-slate-100 pt-4 text-xs">
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLORS[key] }} />
                  {label}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
