import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../api/client";
import { Button, Card } from "./ui";
import ParticipantPicker from "./ParticipantPicker";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

/** Formulaire du coach pour planifier une séance visio avec un ou plusieurs adhérents. */
export default function ScheduleSessionForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(45);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/sessions", {
          memberIds,
          // Heure locale du navigateur du coach → ISO (UTC)
          scheduledAt: new Date(`${date}T${time}`).toISOString(),
          durationMin,
          notes: notes.trim() || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onDone();
    },
    onError: (e: any) => setError(e?.response?.data?.error || "Impossible de planifier la séance"),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (memberIds.length === 0) return setError("Choisissez au moins un adhérent");
    mutation.mutate();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Planifier une séance en visio</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Participants{" "}
            <span className="font-normal text-slate-400">— un adhérent pour une séance individuelle, plusieurs pour un cours collectif</span>
          </label>
          <ParticipantPicker value={memberIds} onChange={setMemberIds} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Heure</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} required />
          </div>
          <div>
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

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Note pour les participants (facultatif)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Ex : prévoir un tapis et une bouteille d'eau"
          />
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onDone}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Enregistrement…"
              : memberIds.length > 1
                ? `Planifier la séance de groupe (${memberIds.length})`
                : "Planifier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
