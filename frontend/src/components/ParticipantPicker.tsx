import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const MAX_PARTICIPANTS = 20;

export interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Liste à cocher des adhérents, avec recherche. Utilisée pour planifier une séance et modifier ses participants. */
export default function ParticipantPicker({
  value,
  onChange,
  max = MAX_PARTICIPANTS,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Nombre maximum d'adhérents cochables (places du cours) */
  max?: number;
}) {
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await api.get("/users/members")).data as MemberOption[],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...(members || [])].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr")
    );
    if (!q) return list;
    return list.filter((m) => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q));
  }, [members, search]);

  const full = value.length >= max;
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : full ? value : [...value, id]);

  if (isLoading) return <p className="text-sm text-slate-400">Chargement des adhérents…</p>;
  if (!members?.length) {
    return <p className="text-xs text-slate-500">Aucun adhérent inscrit sur le site pour le moment.</p>;
  }

  return (
    <div className="rounded-lg border border-slate-300">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un adhérent…"
          className="w-full text-sm focus:outline-none"
        />
        <span className={`whitespace-nowrap text-xs ${full ? "font-semibold text-amber-600" : "text-slate-500"}`}>
          {value.length} / {max}
        </span>
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {filtered.map((m) => {
          const checked = value.includes(m.id);
          return (
            <li key={m.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-slate-50 ${
                  !checked && full ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="text-slate-800">
                  {m.firstName} {m.lastName}
                </span>
                <span className="truncate text-xs text-slate-400">{m.email}</span>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Aucun résultat</li>}
      </ul>
    </div>
  );
}
