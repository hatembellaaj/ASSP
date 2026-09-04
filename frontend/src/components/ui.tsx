import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: ReactNode; sub?: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-lg">{icon}</div>
      <div>
        <div className="text-xl font-semibold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </Card>
  );
}

export function ProgressBar({ value, max, color = "#16a34a" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  LIBRE: "bg-emerald-50 text-emerald-700",
  PLANIFIEE: "bg-amber-50 text-amber-700",
  IMMINENTE: "bg-purple-50 text-purple-700",
  EFFECTUEE: "bg-blue-50 text-blue-700",
  A_CONFIRMER: "bg-amber-50 text-amber-700",
  EN_RETARD: "bg-rose-50 text-rose-700",
  ANNULEE: "bg-slate-100 text-slate-500",
  VALIDEE: "bg-emerald-50 text-emerald-700",
  EN_COURS: "bg-amber-50 text-amber-700",
  NON_COMMENCEE: "bg-slate-100 text-slate-500",
  LIVRE: "bg-emerald-50 text-emerald-700",
  IDEE: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  LIBRE: "Libre",
  PLANIFIEE: "Planifiée",
  IMMINENTE: "Imminente",
  EFFECTUEE: "Terminée",
  A_CONFIRMER: "À confirmer",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
  VALIDEE: "Validée",
  EN_COURS: "En cours",
  NON_COMMENCEE: "Non commencée",
  LIVRE: "Livré",
  IDEE: "Idée",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function EmptyState({ icon = "📭", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="font-medium text-slate-700">{title}</div>
      {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
    </div>
  );
}

export function Loading() {
  return <div className="p-8 text-sm text-slate-400">Chargement…</div>;
}

export function Avatar({ firstName, lastName, color, size = 36 }: { firstName?: string; lastName?: string; color?: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ backgroundColor: color || "#2563eb", width: size, height: size, fontSize: size * 0.4 }}
    >
      {(firstName?.[0] || "") + (lastName?.[0] || "")}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    ghost: "text-brand-600 hover:bg-brand-50",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
