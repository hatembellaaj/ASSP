import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

const DEMO_ACCOUNTS = [
  { role: "Programmateur", email: "admin@mouvplus.fr", password: "admin123" },
  { role: "Entraîneur", email: "slim.abderrahim@mouvplus.fr", password: "coach123" },
  { role: "Conseiller sportif", email: "conseiller@mouvplus.fr", password: "conseiller123" },
  { role: "Adhérent", email: "hsan.soussou@mouvplus.fr", password: "membre123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white md:flex">
          <div className="flex items-center gap-2 text-xl font-bold">🏃 MOUVPLUS</div>
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Bougez, progressez, restez vous-même.</h2>
            <p className="text-brand-100">
              La plateforme de visioconférence et d'entraînement sportif dédiée aux séniors : coaching en direct,
              suivi santé, communauté et clubs partenaires.
            </p>
          </div>
          <div className="text-xs text-brand-200">© {new Date().getFullYear()} MouvPlus</div>
        </div>
        <div className="p-8">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">Connexion</h1>
          <p className="mb-6 text-sm text-slate-500">Accédez à votre espace MouvPlus.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="vous@exemple.fr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Comptes de démonstration</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-left text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="font-medium text-slate-800">{acc.role}</div>
                  <div className="truncate text-slate-400">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
