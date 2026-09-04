import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill, ProgressBar, Loading, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Programmateur",
  ENTRAINEUR: "Entraîneur",
  CONSEILLER: "Conseiller",
};

function RoleCircleDiagram() {
  const roles = [
    { key: "ADMIN", label: "Programmateur", icon: "🗓️", angle: -90 },
    { key: "ENTRAINEUR", label: "Entraîneur", icon: "🏋️", angle: 30 },
    { key: "CONSEILLER", label: "Conseiller", icon: "🩺", angle: 150 },
  ];
  const radius = 90;
  return (
    <div className="relative mx-auto mb-8 h-64 w-64">
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-center text-xs font-semibold text-white shadow-lg">
        MouvPlus
      </div>
      {roles.map((r) => {
        const rad = (r.angle * Math.PI) / 180;
        const x = 128 + radius * Math.cos(rad);
        const y = 128 + radius * Math.sin(rad);
        return (
          <div
            key={r.key}
            className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-brand-100 bg-white text-center shadow"
            style={{ left: x, top: y }}
          >
            <span className="text-lg">{r.icon}</span>
            <span className="text-[10px] font-medium text-slate-600">{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Certification() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => (await api.get("/certifications")).data,
  });

  return (
    <div>
      <PageHeader title="Certification / Formation des intervenants" />
      <div className="mx-auto max-w-3xl p-8">
        <p className="mb-4 text-sm text-slate-500">
          Trois rôles autour d'un cercle central : Programmateur, Entraîneur, Conseiller — chacun avec son propre
          parcours de certification MouvPlus.
        </p>
        <RoleCircleDiagram />

        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Mes modules — {ROLE_LABEL[user?.role || ""] || user?.role}
        </h2>
        {isLoading && <Loading />}
        {!isLoading && data?.length === 0 && <EmptyState title="Aucun module de formation assigné" />}
        <div className="space-y-3">
          {data?.map((cert: any) => (
            <Card key={cert.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{cert.moduleName}</span>
                <StatusPill status={cert.status} />
              </div>
              <ProgressBar value={cert.progressPct} max={100} color={cert.status === "VALIDEE" ? "#16a34a" : "#f59e0b"} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
