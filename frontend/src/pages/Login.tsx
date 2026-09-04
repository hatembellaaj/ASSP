import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";
import asspLogo from "../assets/assp-logo.png";

const DEMO_ACCOUNTS = [
  { role: "Programmateur", email: "admin@mouvplus.fr", password: "admin123" },
  { role: "Entraîneur", email: "slim.abderrahim@mouvplus.fr", password: "coach123" },
  { role: "Conseiller sportif", email: "conseiller@mouvplus.fr", password: "conseiller123" },
  { role: "Adhérent", email: "hsan.soussou@mouvplus.fr", password: "membre123" },
];

// Palette reprise du flyer ASSP (couleurs échantillonnées directement sur le document d'origine)
const NAVY = "#1a2530";
const TEAL = "#3f5452";
const BODY = "#5b6462";
const CARD_BG = "#f2f6f5";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"home" | "login">("home");
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
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <img src={asspLogo} alt="ASSP — Association des Sportifs Séniors de Pauillac" className="h-16 w-auto" />
        {view === "home" ? (
          <button
            type="button"
            onClick={() => setView("login")}
            className="rounded-full border px-4 py-1.5 text-sm font-medium transition hover:bg-slate-50"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            Connexion
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setView("home")}
            className="text-sm font-medium hover:underline"
            style={{ color: TEAL }}
          >
            ← Retour à l'accueil
          </button>
        )}
      </header>

      {view === "home" ? (
        <main className="mx-auto max-w-4xl px-6 pb-16">
          <div className="border-t border-slate-100 pt-8 text-center">
            <h1 className="mb-3 text-2xl font-semibold italic" style={{ color: TEAL }}>
              Bougez, progressez, restez vous-même
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed" style={{ color: BODY }}>
              <span className="font-semibold" style={{ color: NAVY }}>
                Séances sportives pour seniors à partir de 50 ans.
              </span>{" "}
              Un cycle de <span className="font-semibold" style={{ color: NAVY }}>12 séances personnalisées de 45
              minutes</span>, en ligne et en direct avec votre coach, pour progresser à votre rythme, où que vous
              soyez.
            </p>
          </div>

          <div
            className="mx-auto mt-8 max-w-3xl rounded-md border-l-4 px-5 py-4 text-sm"
            style={{ backgroundColor: CARD_BG, borderColor: TEAL, color: BODY }}
          >
            🏅🏅 Un coaching de haut niveau : notre coach a amené la Pauillacaise{" "}
            <span className="font-semibold" style={{ color: NAVY }}>
              Annette Monnier
            </span>{" "}
            à la médaille d'argent aux Championnats de France de Karaté Vétéran (mai 2026) et à la médaille d'or à
            la compétition de Nouvelle-Aquitaine (février 2026).
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl p-6" style={{ backgroundColor: CARD_BG }}>
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>
                Niveau 1 : Réveil du Corps
              </h2>
              <p className="mt-1 text-sm italic" style={{ color: BODY }}>
                Pour les séniors avec problèmes d'autonomie, articulations ou manque d'énergie
              </p>
              <p className="mt-3 text-sm" style={{ color: BODY }}>
                Cours de sport adapté aux séniors : problèmes d'autonomie, articulations, manque d'énergie. Des
                séances douces et progressives pour retrouver mouvement et bien-être.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: TEAL }}>
                Les bienfaits pour votre santé
              </p>
              <ul className="mt-2 space-y-1.5 text-sm" style={{ color: BODY }}>
                {[
                  "Amélioration de la mobilité et de la souplesse",
                  "Renforcement musculaire en douceur",
                  "Soulagement des douleurs articulaires",
                  "Retour à l'autonomie dans les gestes simples",
                  "Prévention des chutes",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span style={{ color: TEAL }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl p-6" style={{ backgroundColor: CARD_BG }}>
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>
                Niveau 2 : Reprise du Sport Séniors
              </h2>
              <p className="mt-1 text-sm italic" style={{ color: BODY }}>
                Pour les séniors actifs qui souhaitent reprendre le sport en toute sécurité
              </p>
              <p className="mt-3 text-sm" style={{ color: BODY }}>
                Programme de remise en condition physique pour séniors actifs souhaitant reprendre le sport en
                toute sécurité. Renforcement, gainage et équilibre pour progresser à son rythme.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: TEAL }}>
                Les bienfaits pour votre santé
              </p>
              <ul className="mt-2 space-y-1.5 text-sm" style={{ color: BODY }}>
                {[
                  "Renforcement musculaire global",
                  "Meilleur gainage, stabilité et équilibre",
                  "Amélioration de l'équilibre et prévention des chutes",
                  "Devenir plus fort et plus rapide dans les mouvements du quotidien",
                  "Regain de confiance dans ses capacités physiques",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span style={{ color: TEAL }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-6 text-center text-sm" style={{ color: BODY }}>
            <p className="font-semibold" style={{ color: NAVY }}>
              Renseignements et inscriptions
            </p>
            <p className="mt-1">Association des Sportifs Séniors de Pauillac — ASSP</p>
            <p>Pauillac, Nouvelle-Aquitaine</p>
            <p>Contact : Anne Fourgeaud</p>
            <p className="mt-1 font-semibold" style={{ color: TEAL }}>
              Tél. 07 83 74 66 56 · assp33@gmx.fr
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <Button onClick={() => setView("login")}>Accéder à mon espace →</Button>
          </div>
        </main>
      ) : (
        <main className="flex justify-center px-6 pb-16">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 p-8 shadow-sm">
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
        </main>
      )}
    </div>
  );
}
