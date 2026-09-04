import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Button, EmptyState, Loading } from "../components/ui";

export default function InBody() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weightKg: "", heightCm: "", muscleMassKg: "", fatMassPct: "", visceralFat: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["inbody-mine"],
    queryFn: async () => (await api.get("/inbody")).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post("/inbody", {
          weightKg: Number(form.weightKg),
          heightCm: Number(form.heightCm),
          muscleMassKg: Number(form.muscleMassKg),
          fatMassPct: Number(form.fatMassPct),
          visceralFat: form.visceralFat ? Number(form.visceralFat) : undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbody-mine"] });
      setShowForm(false);
      setForm({ weightKg: "", heightCm: "", muscleMassKg: "", fatMassPct: "", visceralFat: "" });
    },
  });

  const latest = data?.[0];

  return (
    <div>
      <PageHeader
        title="Mon analyse InBody"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Annuler" : "＋ Nouvelle analyse"}</Button>}
      />
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        {showForm && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Déposer mes résultats InBody</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["weightKg", "Poids (kg)"],
                ["heightCm", "Taille (cm)"],
                ["muscleMassKg", "Masse musculaire (kg)"],
                ["fatMassPct", "Masse grasse (%)"],
                ["visceralFat", "Graisse viscérale"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-500">{label}</label>
                  <input
                    type="number"
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <Button className="mt-3" disabled={create.isPending} onClick={() => create.mutate()}>
              Analyser
            </Button>
          </Card>
        )}

        {isLoading && <Loading />}
        {!isLoading && !latest && !showForm && (
          <EmptyState icon="📊" title="Aucune analyse" subtitle="Faites une analyse InBody dans votre club partenaire ou pharmacie, puis déposez les résultats ici." />
        )}

        {latest && (
          <>
            <Card>
              <div className="mb-3 text-sm font-semibold text-slate-700">
                Dernière analyse — {format(new Date(latest.uploadedAt), "d MMMM yyyy", { locale: fr })}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Poids" value={`${latest.weightKg} kg`} />
                <Metric label="IMC" value={latest.imc.toFixed(1)} />
                <Metric label="Masse musculaire" value={`${latest.muscleMassKg} kg`} />
                <Metric label="Masse grasse" value={`${latest.fatMassPct} %`} />
              </div>
            </Card>
            {latest.aiRecommendation && (
              <Card>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  🤖 Recommandations IA
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{latest.aiRecommendation}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
