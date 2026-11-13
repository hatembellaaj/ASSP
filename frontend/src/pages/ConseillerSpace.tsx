import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Avatar, Button, Loading, EmptyState } from "../components/ui";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import AvailabilityGrid from "../components/AvailabilityGrid";
import PlanSessionsForm from "../components/PlanSessionsForm";
import JitsiRoom from "../components/JitsiRoom";
import { useAuth } from "../context/AuthContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

interface NewClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarColor: string;
  createdAt: string;
  onboarding: "A_CONTACTER" | "ENTRETIEN_PLANIFIE";
  availability: Record<string, string[]>;
  availabilityNote: string | null;
  interview: { id: string; scheduledAt: string; status: string } | null;
}

/** Fixer ou déplacer l'entretien d'accueil en visio. */
function InterviewForm({ client, onDone }: { client: NewClient; onDone: () => void }) {
  const qc = useQueryClient();
  const initial = client.interview ? new Date(client.interview.scheduledAt) : addDays(new Date(), 1);
  const [date, setDate] = useState(format(initial, "yyyy-MM-dd"));
  const [time, setTime] = useState(client.interview ? format(initial, "HH:mm") : "10:00");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () =>
      (await api.post(`/conseiller/clients/${client.id}/entretien`, { scheduledAt: new Date(`${date}T${time}`).toISOString() })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conseiller-nouveaux"] });
      onDone();
    },
    onError: (e: any) => setError(e?.response?.data?.error || "Impossible de planifier l'entretien"),
  });
  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-3 sm:p-4">
      <div className="text-sm font-semibold text-slate-800">
        {client.interview ? "Déplacer l'entretien" : "Planifier l'entretien en visio"}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Heure</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-slate-500">Le client est prévenu et retrouve l'entretien sur son tableau de bord.</p>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone} className="w-full sm:w-auto">
          Fermer
        </Button>
        <Button disabled={save.isPending} onClick={() => save.mutate()} className="w-full sm:w-auto">
          {save.isPending ? "Enregistrement…" : "Enregistrer l'entretien"}
        </Button>
      </div>
    </div>
  );
}

/** Nouveaux clients : contacter, faire l'entretien, puis planifier les séances avec un coach. */
function NewClients() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState<{ id: string; panel: "entretien" | "seances" } | null>(null);
  const [joining, setJoining] = useState<NewClient | null>(null);
  const { data: clients, isLoading } = useQuery({
    queryKey: ["conseiller-nouveaux"],
    queryFn: async () => (await api.get("/conseiller/nouveaux")).data as NewClient[],
    refetchInterval: 60000,
  });
  const followed = useMutation({
    mutationFn: async (id: string) => (await api.post(`/conseiller/clients/${id}/suivi`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conseiller-nouveaux"] });
      qc.invalidateQueries({ queryKey: ["conseiller-adherents"] });
    },
  });

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-sm font-semibold text-slate-700">
        Nouveaux clients {clients?.length ? <span className="text-brand-600">({clients.length})</span> : null}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Parcours : contactez le client, faites l'entretien en visio, puis planifiez ses séances avec un coach selon ses
        disponibilités.
      </p>
      {isLoading && <Loading />}
      {!isLoading && clients?.length === 0 && (
        <Card className="text-sm text-slate-400">Aucun nouveau client en attente.</Card>
      )}
      <div className="space-y-3">
        {clients?.map((c) => {
          const at = c.interview ? new Date(c.interview.scheduledAt) : null;
          const panel = open?.id === c.id ? open.panel : null;
          return (
            <Card key={c.id} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar firstName={c.firstName} lastName={c.lastName} color={c.avatarColor} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-slate-500">
                      Inscrit le {format(new Date(c.createdAt), "d MMMM", { locale: fr })}
                    </div>
                  </div>
                </div>
                <span
                  className={`self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    at ? "bg-purple-50 text-purple-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {at ? `Entretien ${format(at, "EEE d MMM 'à' HH:mm", { locale: fr })}` : "À contacter"}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="font-medium text-brand-600 hover:underline">
                    📞 {c.phone}
                  </a>
                )}
                <a href={`mailto:${c.email}`} className="truncate text-brand-600 hover:underline">
                  ✉️ {c.email}
                </a>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">Disponibilités du client</summary>
                <div className="mt-2 max-w-sm">
                  <AvailabilityGrid value={c.availability} readOnly />
                </div>
                {c.availabilityNote && <p className="mt-2 text-xs italic text-slate-600">« {c.availabilityNote} »</p>}
              </details>

              <div className="flex flex-wrap gap-2">
                {at && (
                  <Button onClick={() => setJoining(c)} className="w-full sm:w-auto">
                    Rejoindre l'entretien
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setOpen(panel === "entretien" ? null : { id: c.id, panel: "entretien" })}
                >
                  {at ? "Déplacer l'entretien" : "Planifier l'entretien"}
                </Button>
                {at && (
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setOpen(panel === "seances" ? null : { id: c.id, panel: "seances" })}
                  >
                    Planifier les séances
                  </Button>
                )}
                {at && (
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto"
                    disabled={followed.isPending}
                    onClick={() => {
                      if (confirm(`Marquer l'entretien de ${c.firstName} comme fait, sans planifier de séance maintenant ?`))
                        followed.mutate(c.id);
                    }}
                  >
                    Entretien fait, séances plus tard
                  </Button>
                )}
              </div>

              {panel === "entretien" && <InterviewForm client={c} onDone={() => setOpen(null)} />}
              {panel === "seances" && <PlanSessionsForm client={c} onDone={() => setOpen(null)} />}
            </Card>
          );
        })}
      </div>
      {joining?.interview && (
        <JitsiRoom
          joinPath={`/meetings/${joining.interview.id}/join`}
          title={`Entretien d'accueil — ${joining.firstName} ${joining.lastName}`}
          displayName={`${user?.firstName} ${user?.lastName}`}
          onClose={() => setJoining(null)}
        />
      )}
    </section>
  );
}

const DOMAINS = ["mobilite", "nutrition", "memoire", "vision", "audition", "bienEtre"];
const DOMAIN_LABELS: Record<string, string> = {
  mobilite: "Mobilité",
  nutrition: "Nutrition",
  memoire: "Mémoire",
  vision: "Vision",
  audition: "Audition",
  bienEtre: "Bien-être",
};

export default function ConseillerSpace() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [planning, setPlanning] = useState<string | null>(null);
  const [icopeForm, setIcopeForm] = useState<Record<string, number>>({
    mobilite: 2,
    nutrition: 2,
    memoire: 2,
    vision: 2,
    audition: 2,
    bienEtre: 2,
  });

  const { data: adherents, isLoading } = useQuery({
    queryKey: ["conseiller-adherents"],
    queryFn: async () => (await api.get("/conseiller/adherents")).data,
  });

  const followedAdherents = (adherents || []).filter((a: any) => !a.onboarding || a.onboarding === "SUIVI");

  const submitIcope = useMutation({
    mutationFn: async (userId: string) => (await api.post("/health/icope", { userId, ...icopeForm })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conseiller-adherents"] });
      setEditing(null);
    },
  });

  return (
    <div>
      <PageHeader title="Espace Conseiller sportif" />
      <div className="p-4 sm:p-6 lg:p-8">
        <NewClients />

        <h2 className="mb-1 text-sm font-semibold text-slate-700">Adhérents suivis</h2>
        <p className="mb-3 text-xs text-slate-500">
          Bilan ICOPE, évaluations, programme en cours, et planification de nouvelles séances avec un coach.
        </p>
        {isLoading && <Loading />}
        {!isLoading && followedAdherents.length === 0 && <EmptyState title="Aucun adhérent suivi pour le moment" />}
        <div className="space-y-3">
          {followedAdherents.map((a: any) => (
            <Card key={a.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar firstName={a.firstName} lastName={a.lastName} color={a.avatarColor} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{a.plan} · {a.programmeActuel || "Aucun programme assigné"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">{a.dernierIcope !== null ? `${a.dernierIcope}/24` : "—"}</div>
                    <div className="text-xs text-slate-400">ICOPE</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">{a.nbEvaluationsMusculaires}</div>
                    <div className="text-xs text-slate-400">Éval. musc.</div>
                  </div>
                  <Button
                    variant="secondary"
                    className="ml-auto sm:ml-0"
                    onClick={() => {
                      setPlanning(null);
                      setEditing(editing === a.id ? null : a.id);
                    }}
                  >
                    {editing === a.id ? "Fermer" : "Bilan ICOPE"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setPlanning(planning === a.id ? null : a.id);
                    }}
                  >
                    Séances
                  </Button>
                </div>
              </div>

              {planning === a.id && (
                <div className="mt-4">
                  <PlanSessionsForm client={a} onDone={() => setPlanning(null)} />
                </div>
              )}
              {editing === a.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {DOMAINS.map((d) => (
                      <div key={d}>
                        <label className="mb-1 block text-xs text-slate-500">{DOMAIN_LABELS[d]} (0-4)</label>
                        <input
                          type="number"
                          min={0}
                          max={4}
                          value={icopeForm[d]}
                          onChange={(e) => setIcopeForm((f) => ({ ...f, [d]: Number(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <Button className="mt-3" onClick={() => submitIcope.mutate(a.id)} disabled={submitIcope.isPending}>
                    Enregistrer le bilan
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
