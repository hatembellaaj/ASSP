import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: Array<"ADMIN" | "ENTRAINEUR" | "CONSEILLER" | "MEMBRE">;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/communaute", label: "Communauté", icon: "💬" },
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: "🏠", roles: ["MEMBRE"] },
  { to: "/calendrier", label: "Mon calendrier", icon: "📅" },
  { to: "/seances", label: "Mes séances", icon: "🎥" },
  { to: "/programme", label: "Mon programme", icon: "🗂️", roles: ["MEMBRE"] },
  { to: "/progression", label: "Ma progression", icon: "📈", roles: ["MEMBRE"] },
  { to: "/sante", label: "Ma santé", icon: "❤️", roles: ["MEMBRE"] },
  { to: "/inbody", label: "Mon InBody", icon: "⚖️", roles: ["MEMBRE"] },
  { to: "/coachs", label: "Mes coachs", icon: "🧑‍🏫", roles: ["MEMBRE"] },
  { to: "/clubs", label: "Clubs partenaires", icon: "🏛️" },
  { to: "/reunions", label: "Réunions", icon: "🖥️" },
  { to: "/espace-conseiller", label: "Espace Conseiller sportif", icon: "🩺", roles: ["CONSEILLER", "ADMIN"] },
  { to: "/espace-coach", label: "Espace Coach sportif", icon: "🏋️", roles: ["ENTRAINEUR", "ADMIN"] },
  { to: "/certification", label: "Certification / Formation", icon: "🎓", roles: ["ADMIN", "ENTRAINEUR", "CONSEILLER"] },
  { to: "/roadmap", label: "Road Map MouvPlus", icon: "🗺️", roles: ["ADMIN", "ENTRAINEUR", "CONSEILLER"] },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥", roles: ["ADMIN"] },
];

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Programmateur",
  ENTRAINEUR: "Entraîneur",
  CONSEILLER: "Conseiller sportif",
  MEMBRE: "Adhérent",
};

export default function Layout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Chargement…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="flex w-64 shrink-0 flex-col bg-brand-900 text-slate-200">
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-white">
          <span>🏃</span> MOUVPLUS
        </div>
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {initials(user.firstName, user.lastName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {user.firstName} {user.lastName}
            </div>
            <div className="truncate text-xs text-brand-200">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <NavLink
            to="/profil"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <span>👤</span> Mon profil
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {action}
    </div>
  );
}
