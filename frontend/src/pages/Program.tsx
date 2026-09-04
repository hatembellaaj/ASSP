import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Loading, EmptyState, StatusPill } from "../components/ui";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LEVEL_LABEL: Record<string, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
};

export default function Program() {
  const { data, isLoading } = useQuery({
    queryKey: ["programs-mine"],
    queryFn: async () => (await api.get("/programs/mine")).data,
  });

  return (
    <div>
      <PageHeader
        title="Mon programme"
        action={
          data?.[0] && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
              🎯 {LEVEL_LABEL[data[0].program?.level] || data[0].program?.level}
              <span className="rounded-full bg-white px-2 py-0.5">Score {data[0].score}/100</span>
            </div>
          )
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        {isLoading && <Loading />}
        {!isLoading && (!data || data.length === 0) && (
          <EmptyState icon="🗂️" title="Aucun parcours ne vous a encore été affecté." subtitle="Votre conseiller sportif vous attribuera bientôt un programme." />
        )}
        {data?.map((assignment: any) => (
          <Card key={assignment.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{assignment.program?.name}</h3>
              <StatusPill status={assignment.program?.level === "DEBUTANT" ? "IDEE" : "EN_COURS"} />
            </div>
            <p className="mb-3 text-sm text-slate-600">{assignment.program?.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Assigné par {assignment.assignedBy?.firstName} {assignment.assignedBy?.lastName}
              </span>
              <span>{format(new Date(assignment.assignedAt), "d MMMM yyyy", { locale: fr })}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
