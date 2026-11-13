import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../api/client";
import { Button } from "./ui";
import { availabilitySummary } from "./AvailabilityGrid";
import type { Availability } from "./AvailabilityGrid";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export interface PlanClient {
  id: string;
  firstName: string;
  lastName: string;
  availability?: Availability;
  availabilityNote?: string | null;
}

/**
 * Le conseiller sportif planifie les séances du client avec un coach :
 * une seule séance, ou une série (ex : 12 séances, chaque semaine à la même heure).
 */
export default function PlanSessionsForm({ client, onDone }: { client: PlanClient; onDone: () => void }) {
  const qc = useQueryClient();
  const [coachId, setCoachId] = useState("");
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(45);
  const [count, setCount] = useState(12);
  const [intervalDays, setIntervalDays] = useState<7 | 14>(7);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const { data: coaches, isLoading } = useQuery({
    queryKey: ["conseiller-coachs"],
    queryFn: async () => (await api.get("/conseiller/coachs")).data as Array<{ id: string; firstName: string; lastName: string }>,
  });

  const first = useMemo(() => new Date(`${date}T${time}`), [date, time]);
  const last = addDays(first, (count - 1) * intervalDays);
  const summary =
    Number.isNaN(first.getTime())
      ? ""
      : count === 1
        ? `1 séance le ${format(first, "EEEE d MMMM 'à' HH:mm", { locale: fr })}`
        : `${count} séances, ${intervalDays === 7 ? "chaque" : "un"} ${format(first, "EEEE", { locale: fr })}${
            intervalDays === 14 ? " sur deux" : ""
          } à ${format(first, "HH:mm")}, du ${format(first, "d MMM", { locale: fr })} au ${format(last, "d MMM yyyy", { locale: fr })}`;

  const plan = useMutation({
    mutationFn: async () =>
      (
        await api.post("/sessions/series", {
          memberId: client.id,
          coachId,
          firstAt: first.toISOString(),
          count,
          intervalDays,
          durationMin,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conseiller-nouveaux"] });
      qc.invalidateQueries({ queryKey: ["conseiller-adherents"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      onDone();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.error || "Planification impossible");
      setConflicts(e?.response?.data?.conflicts || []);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConflicts([]);
    if (!coachId) return setError("Choisissez le coach");
    plan.mutate();
  }

  const dispo = availabilitySummary(client.availability);

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-slate-50 p-3 sm:p-4">
      <div className="text-sm font-semibold text-slate-800">
        Planifier les séances de {client.firstName} {client.lastName}
      </div>
      {(dispo || client.availabilityNote) && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="font-medium">Disponibilités :</span> {dispo || "—"}
          {client.availabilityNote && <div className="mt-0.5 italic">« {client.availabilityNote} »</div>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Coach</label>
          <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputClass} required>
            <option value="">{isLoading ? "Chargement…" : "— Choisir un coach —"}</option>
            {coaches?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Intitulé <span className="font-normal text-slate-400">(facultatif)</span>
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputClass} placeholder="Ex : Réveil du Corps" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Première séance</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Heure</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Durée</label>
          <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={inputClass}>
            {[30, 45, 60, 75, 90].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nombre de séances</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 séance (unique)" : `${n} séances`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Rythme</label>
          <select
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value) as 7 | 14)}
            className={inputClass}
            disabled={count === 1}
          >
            <option value={7}>Chaque semaine</option>
            <option value={14}>Toutes les 2 semaines</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Note pour le client et le coach <span className="font-normal text-slate-400">(facultatif)</span>
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Objectifs, précautions, matériel…" />
      </div>

      {summary && <div className="text-xs font-medium text-brand-700">{summary}</div>}

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
          {conflicts.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs">
              {conflicts.slice(0, 6).map((c) => (
                <li key={c}>{format(new Date(c), "EEEE d MMMM 'à' HH:mm", { locale: fr })}</li>
              ))}
              {conflicts.length > 6 && <li>… et {conflicts.length - 6} autre(s)</li>}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone} className="w-full sm:w-auto">
          Fermer
        </Button>
        <Button type="submit" disabled={plan.isPending} className="w-full sm:w-auto">
          {plan.isPending ? "Planification…" : count === 1 ? "Planifier la séance" : `Planifier les ${count} séances`}
        </Button>
      </div>
    </form>
  );
}
