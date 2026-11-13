import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card } from "./ui";
import JitsiRoom from "./JitsiRoom";

interface Parcours {
  onboarding: "A_CONTACTER" | "ENTRETIEN_PLANIFIE" | "SUIVI";
  conseiller: { firstName: string; lastName: string } | null;
  interview: { id: string; scheduledAt: string; status: string } | null;
}

/**
 * Parcours d'un nouvel adhérent : compte créé → entretien avec le conseiller sportif → séances avec le coach.
 * Affiché sur le tableau de bord tant que l'entretien n'a pas eu lieu.
 */
export default function JourneyCard() {
  const { user, refresh } = useAuth();
  const [joining, setJoining] = useState(false);
  const { data } = useQuery({
    queryKey: ["parcours"],
    queryFn: async () => (await api.get("/users/me/parcours")).data as Parcours,
    refetchInterval: 60000,
  });

  // Le conseiller a validé l'entretien : on met à jour le menu (« Cours disponibles »).
  useEffect(() => {
    if (data?.onboarding === "SUIVI" && user?.onboarding && user.onboarding !== "SUIVI") refresh();
  }, [data?.onboarding, user?.onboarding, refresh]);

  if (!data || data.onboarding === "SUIVI") return null;

  const conseiller = data.conseiller ? `${data.conseiller.firstName} ${data.conseiller.lastName}` : "votre conseiller sportif";
  const interviewAt = data.interview ? new Date(data.interview.scheduledAt) : null;
  // La salle d'entretien ouvre 15 minutes avant l'heure
  const canJoin = interviewAt ? interviewAt.getTime() - Date.now() < 15 * 60000 : false;

  const steps = [
    { title: "Compte créé", text: "Bienvenue chez MouvPlus !", state: "done" as const },
    {
      title: "Entretien avec votre conseiller sportif",
      text: interviewAt
        ? `Avec ${conseiller}, en visio, le ${format(interviewAt, "EEEE d MMMM 'à' HH:mm", { locale: fr })}.`
        : `${conseiller.charAt(0).toUpperCase()}${conseiller.slice(1)} va vous contacter pour fixer un premier entretien en visio, selon vos disponibilités.`,
      state: "current" as const,
    },
    {
      title: "Vos séances avec votre coach",
      text: "Pendant l'entretien, votre conseiller planifie vos séances avec un coach selon vos horaires.",
      state: "todo" as const,
    },
  ];

  return (
    <Card className="border-brand-200">
      <div className="mb-3 text-sm font-semibold text-slate-800">Mon parcours</div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s.state === "done"
                  ? "bg-emerald-500 text-white"
                  : s.state === "current"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.state === "done" ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <div className={`text-sm font-medium ${s.state === "todo" ? "text-slate-400" : "text-slate-800"}`}>{s.title}</div>
              <div className="text-xs text-slate-500">{s.text}</div>
              {s.state === "current" && data.interview && (
                <div className="mt-2">
                  <Button className="w-full sm:w-auto" disabled={!canJoin} onClick={() => setJoining(true)}>
                    {canJoin ? "Rejoindre l'entretien" : "Rejoindre (ouvre 15 min avant)"}
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {joining && data.interview && (
        <JitsiRoom
          joinPath={`/meetings/${data.interview.id}/join`}
          title={`Entretien avec ${conseiller}`}
          displayName={`${user?.firstName} ${user?.lastName}`}
          onClose={() => setJoining(false)}
        />
      )}
    </Card>
  );
}
