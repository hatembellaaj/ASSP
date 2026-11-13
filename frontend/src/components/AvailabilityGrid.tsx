export type Availability = Record<string, string[]>;

export const DAYS: Array<{ key: string; short: string; long: string }> = [
  { key: "lun", short: "Lun", long: "Lundi" },
  { key: "mar", short: "Mar", long: "Mardi" },
  { key: "mer", short: "Mer", long: "Mercredi" },
  { key: "jeu", short: "Jeu", long: "Jeudi" },
  { key: "ven", short: "Ven", long: "Vendredi" },
  { key: "sam", short: "Sam", long: "Samedi" },
  { key: "dim", short: "Dim", long: "Dimanche" },
];

export const SLOTS: Array<{ key: string; label: string; hours: string }> = [
  { key: "matin", label: "Matin", hours: "8h-12h" },
  { key: "aprem", label: "Après-midi", hours: "12h-18h" },
  { key: "soir", label: "Soir", hours: "18h-21h" },
];

/**
 * Grille jours × créneaux. Modifiable (inscription) ou en lecture seule (espace conseiller).
 * Sur téléphone, une ligne par jour reste lisible : 3 cases par ligne.
 */
export default function AvailabilityGrid({
  value,
  onChange,
  readOnly = false,
}: {
  value: Availability;
  onChange?: (v: Availability) => void;
  readOnly?: boolean;
}) {
  const has = (d: string, s: string) => !!value[d]?.includes(s);
  const toggle = (d: string, s: string) => {
    if (readOnly || !onChange) return;
    const cur = value[d] || [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    const out = { ...value };
    if (next.length) out[d] = SLOTS.map((x) => x.key).filter((k) => next.includes(k));
    else delete out[d];
    onChange(out);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-[3.5rem_repeat(3,1fr)] bg-slate-50 text-center text-[11px] font-medium text-slate-500">
        <div />
        {SLOTS.map((s) => (
          <div key={s.key} className="px-1 py-1.5">
            {s.label}
            <div className="font-normal text-slate-400">{s.hours}</div>
          </div>
        ))}
      </div>
      {DAYS.map((d) => (
        <div key={d.key} className="grid grid-cols-[3.5rem_repeat(3,1fr)] border-t border-slate-100">
          <div className="flex items-center px-2 text-xs font-medium text-slate-600">{d.short}</div>
          {SLOTS.map((s) => {
            const on = has(d.key, s.key);
            return readOnly ? (
              <div key={s.key} className="flex items-center justify-center p-1">
                <span
                  className={`h-5 w-full rounded ${on ? "bg-emerald-400" : "bg-slate-100"}`}
                  aria-label={`${d.long} ${s.label} : ${on ? "disponible" : "non disponible"}`}
                />
              </div>
            ) : (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(d.key, s.key)}
                aria-pressed={on}
                aria-label={`${d.long} ${s.label}`}
                className="p-1"
              >
                <span
                  className={`flex h-9 w-full items-center justify-center rounded-md border text-sm transition ${
                    on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-300 hover:border-emerald-300"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Résumé texte : « Lun matin, soir · Mer après-midi ». */
export function availabilitySummary(v: Availability | null | undefined): string {
  if (!v) return "";
  return DAYS.filter((d) => v[d.key]?.length)
    .map((d) => `${d.short} ${v[d.key].map((k) => SLOTS.find((s) => s.key === k)?.label.toLowerCase()).join(", ")}`)
    .join(" · ");
}
