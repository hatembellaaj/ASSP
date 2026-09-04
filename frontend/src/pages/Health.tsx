import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, ProgressBar, EmptyState, Loading } from "../components/ui";

const DOMAINS = [
  { key: "mobilite", label: "Mobilité" },
  { key: "nutrition", label: "Nutrition" },
  { key: "memoire", label: "Mémoire" },
  { key: "vision", label: "Vision" },
  { key: "audition", label: "Audition" },
  { key: "bienEtre", label: "Bien-être" },
];

export default function Health() {
  const { data, isLoading } = useQuery({
    queryKey: ["icope-mine"],
    queryFn: async () => (await api.get("/health/icope")).data,
  });

  return (
    <div>
      <PageHeader title="Ma santé" />
      <div className="mx-auto max-w-2xl p-8">
        {isLoading && <Loading />}
        {!isLoading && !data && (
          <EmptyState icon="🤍" title="Bilan ICOPE non effectué" subtitle="Votre bilan de santé ICOPE sera disponible ici après évaluation par votre conseiller sportif." />
        )}
        {data && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Bilan ICOPE</h3>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                {data.score}/24
              </span>
            </div>
            <div className="space-y-4">
              {DOMAINS.map((d) => {
                const value = (data as any)[d.key] as number;
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex justify-between text-sm text-slate-600">
                      <span>{d.label}</span>
                      <span>{value}/4</span>
                    </div>
                    <ProgressBar value={value} max={4} color={value >= 3 ? "#16a34a" : value >= 2 ? "#f59e0b" : "#ef4444"} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
