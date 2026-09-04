import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Avatar, Button, Loading, EmptyState } from "../components/ui";

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
      <div className="p-8">
        <p className="mb-4 text-sm text-slate-500">
          Suivi des adhérents : bilan ICOPE, évaluations InBody et programme en cours.
        </p>
        {isLoading && <Loading />}
        {!isLoading && adherents?.length === 0 && <EmptyState title="Aucun adhérent pour le moment" />}
        <div className="space-y-3">
          {adherents?.map((a: any) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar firstName={a.firstName} lastName={a.lastName} color={a.avatarColor} />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{a.plan} · {a.programmeActuel || "Aucun programme assigné"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">{a.dernierIcope !== null ? `${a.dernierIcope}/24` : "—"}</div>
                    <div className="text-xs text-slate-400">ICOPE</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-800">{a.nbEvaluationsMusculaires}</div>
                    <div className="text-xs text-slate-400">Éval. musc.</div>
                  </div>
                  <Button variant="secondary" onClick={() => setEditing(editing === a.id ? null : a.id)}>
                    {editing === a.id ? "Fermer" : "Bilan ICOPE"}
                  </Button>
                </div>
              </div>

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
