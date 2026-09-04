import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill } from "../components/ui";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  const { data: sessions } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: async () => (await api.get("/sessions/calendar", { params: { year, month } })).data,
  });

  const days = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const byDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (sessions || []).forEach((s: any) => {
      const d = new Date(s.scheduledAt).getDate();
      map[d] = map[d] || [];
      map[d].push(s);
    });
    return map;
  }, [sessions]);

  const selectedDaySessions = selected ? byDay[Number(selected)] || [] : [];

  return (
    <div>
      <PageHeader title="Mon calendrier" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setCursor(new Date(year, month - 2, 1))} className="text-slate-400 hover:text-slate-700">←</button>
            <div className="font-semibold text-slate-800">{format(cursor, "MMMM yyyy", { locale: fr })}</div>
            <button onClick={() => setCursor(new Date(year, month, 1))} className="text-slate-400 hover:text-slate-700">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              const daySessions = d ? byDay[d] || [] : [];
              const hasSession = daySessions.length > 0;
              return (
                <button
                  key={idx}
                  disabled={!d}
                  onClick={() => d && setSelected(String(d))}
                  className={`h-16 rounded-lg border p-1 text-left text-xs transition ${
                    !d
                      ? "border-transparent"
                      : selected === String(d)
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-100 hover:border-brand-200"
                  }`}
                >
                  {d && <div className="font-medium text-slate-700">{d}</div>}
                  {hasSession && (
                    <div className="mt-1 truncate rounded bg-brand-100 px-1 py-0.5 text-[10px] text-brand-700">
                      {format(new Date(daySessions[0].scheduledAt), "HH:mm")} · {daySessions[0].coach?.firstName}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            {selected ? `${selected} ${format(cursor, "MMMM", { locale: fr })}` : "Sélectionnez un jour"}
          </div>
          {selectedDaySessions.length === 0 && <p className="text-sm text-slate-400">Aucune séance ce jour-là.</p>}
          <div className="space-y-2">
            {selectedDaySessions.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{format(new Date(s.scheduledAt), "HH:mm")}</span>
                  <StatusPill status={s.status} />
                </div>
                <div className="text-xs text-slate-500">
                  {s.coach?.firstName} {s.coach?.lastName}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
