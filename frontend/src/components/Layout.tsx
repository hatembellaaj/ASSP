import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  // Menu latéral : toujours visible sur grand écran, tiroir sur mobile/tablette.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (loading) {
    return <div className="flex h-dvh items-center justify-center text-slate-500">Chargement…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100">
      {/* Fond assombri derrière le tiroir (mobile) */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-brand-900 text-slate-200 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu principal"
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span>🏃</span> MOUVPLUS
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
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
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition lg:py-2 ${
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
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm lg:py-2 ${
                isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <span>👤</span> Mon profil
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white lg:py-2"
          >
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut (mobile/tablette) */}
        <header className="flex shrink-0 items-center gap-3 bg-brand-900 px-3 py-2.5 text-white lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-white/10"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-base font-bold">
            <span>🏃</span> MOUVPLUS
          </div>
          <NavLink
            to="/profil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: user.avatarColor }}
            aria-label="Mon profil"
          >
            {initials(user.firstName, user.lastName)}
          </NavLink>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
      <h1 className="min-w-0 text-lg font-semibold text-slate-900">{title}</h1>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
