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
    <div className="flex min-h-screen items-start justify-center bg-brand-900 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="hidden max-h-[calc(100vh-4rem)] flex-col gap-6 overflow-y-auto bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white md:flex">
          <div className="flex items-center gap-2 text-xl font-bold">🏃 MOUVPLUS</div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold italic">Bougez, progressez, restez vous-même</h2>
            <p className="text-brand-100">
              <span className="font-semibold text-white">Séances sportives pour seniors à partir de 50 ans.</span> Un
              cycle de <span className="font-semibold text-white">12 séances personnalisées de 45 minutes</span>, en
              ligne et en direct avec votre coach, pour progresser à votre rythme, où que vous soyez.
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-sm text-brand-50">
            🏅🏅 Un coaching de haut niveau : notre coach a amené la Pauillacaise{" "}
            <span className="font-semibold text-white">Annette Monnier</span> à la médaille d'argent aux
            Championnats de France de Karaté Vétéran (mai 2026) et à la médaille d'or à la compétition de
            Nouvelle-Aquitaine (février 2026).
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white/10 p-4">
              <h3 className="text-sm font-semibold text-white">Niveau 1 : Réveil du Corps</h3>
              <p className="mt-1 text-xs italic text-brand-100">
                Pour les séniors avec problèmes d'autonomie, articulations ou manque d'énergie
              </p>
              <p className="mt-2 text-xs text-brand-100">
                Cours de sport adapté aux séniors : problèmes d'autonomie, articulations, manque d'énergie. Des
                séances douces et progressives pour retrouver mouvement et bien-être.
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-brand-200">
                Les bienfaits pour votre santé
              </p>
              <ul className="mt-1 space-y-1 text-xs text-brand-100">
                <li>✓ Amélioration de la mobilité et de la souplesse</li>
                <li>✓ Renforcement musculaire en douceur</li>
                <li>✓ Soulagement des douleurs articulaires</li>
                <li>✓ Retour à l'autonomie dans les gestes simples</li>
                <li>✓ Prévention des chutes</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <h3 className="text-sm font-semibold text-white">Niveau 2 : Reprise du Sport Séniors</h3>
              <p className="mt-1 text-xs italic text-brand-100">
                Pour les séniors actifs qui souhaitent reprendre le sport en toute sécurité
              </p>
              <p className="mt-2 text-xs text-brand-100">
                Programme de remise en condition physique pour séniors actifs souhaitant reprendre le sport en toute
                sécurité. Renforcement, gainage et équilibre pour progresser à son rythme.
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-brand-200">
                Les bienfaits pour votre santé
              </p>
              <ul className="mt-1 space-y-1 text-xs text-brand-100">
                <li>✓ Renforcement musculaire global</li>
                <li>✓ Meilleur gainage, stabilité et équilibre</li>
                <li>✓ Amélioration de l'équilibre et prévention des chutes</li>
                <li>✓ Devenir plus fort et plus rapide dans les mouvements du quotidien</li>
                <li>✓ Regain de confiance dans ses capacités physiques</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4 text-center text-xs text-brand-100">
            <p className="font-semibold text-white">Renseignements et inscriptions</p>
            <p className="mt-1">Association des Sportifs Séniors de Pauillac — ASSP</p>
            <p>Pauillac, Nouvelle-Aquitaine</p>
            <p>Contact : Anne Fourgeaud</p>
            <p className="mt-1 font-medium text-white">Tél. 07 83 74 66 56 · assp33@gmx.fr</p>
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
