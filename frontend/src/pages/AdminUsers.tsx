import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Avatar, Button, Card, Loading } from "../components/ui";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Programmateur",
  ENTRAINEUR: "Entraîneur",
  CONSEILLER: "Conseiller",
  MEMBRE: "Adhérent",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

interface Credentials {
  email: string;
  password: string;
  title: string;
}

function CredentialsCard({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Adresse du site : ${window.location.origin}\nEmail : ${creds.email}\nMot de passe provisoire : ${creds.password}`;
  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <div className="text-sm font-semibold text-emerald-800">{creds.title}</div>
      <p className="mt-1 text-xs text-emerald-700">
        Transmettez ces identifiants à la personne. Le mot de passe ne sera plus affiché ; elle pourra le changer dans
        « Mon profil ».
      </p>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-slate-800">{text}</pre>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copié ✓" : "Copier"}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Card>
  );
}

function CreateUserForm({ onCreated, onCancel }: { onCreated: (c: Credentials) => void; onCancel: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "MEMBRE" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/users", { ...form, phone: form.phone || undefined })).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      onCreated({
        email: data.user.email,
        password: data.password,
        title: `Compte créé : ${data.user.firstName} ${data.user.lastName} (${ROLE_LABEL[data.user.role]})`,
      });
    },
    onError: (e: any) => setError(e?.response?.data?.error || "Création impossible"),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Nouvel utilisateur</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Prénom</label>
            <input value={form.firstName} onChange={set("firstName")} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
            <input value={form.lastName} onChange={set("lastName")} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input type="email" value={form.email} onChange={set("email")} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Téléphone (facultatif)</label>
            <input value={form.phone} onChange={set("phone")} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Rôle</label>
            <select value={form.role} onChange={set("role")} className={inputClass}>
              <option value="MEMBRE">Adhérent (s'entraîne)</option>
              <option value="ENTRAINEUR">Entraîneur / coach</option>
              <option value="CONSEILLER">Conseiller sportif</option>
              <option value="ADMIN">Programmateur (administrateur)</option>
            </select>
          </div>
        </div>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Création…" : "Créer le compte"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AdminUsers() {
  const [showForm, setShowForm] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => (await api.get("/users")).data,
  });

  const reset = useMutation({
    mutationFn: async (u: any) => (await api.post(`/users/${u.id}/reset-password`)).data,
    onSuccess: (res, u: any) =>
      setCreds({ email: res.email, password: res.password, title: `Nouveau mot de passe pour ${u.firstName} ${u.lastName}` }),
  });

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        action={
          !showForm && (
            <Button
              onClick={() => {
                setCreds(null);
                setShowForm(true);
              }}
            >
              + Ajouter un utilisateur
            </Button>
          )
        }
      />
      <div className="space-y-6 p-8">
        {creds && <CredentialsCard creds={creds} onClose={() => setCreds(null)} />}
        {showForm && (
          <CreateUserForm
            onCancel={() => setShowForm(false)}
            onCreated={(c) => {
              setShowForm(false);
              setCreds(c);
            }}
          />
        )}

        {isLoading && <Loading />}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((u: any) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar firstName={u.firstName} lastName={u.lastName} color={u.avatarColor} size={28} />
                      {u.firstName} {u.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      className="whitespace-nowrap"
                      disabled={reset.isPending}
                      onClick={() => {
                        if (confirm(`Générer un nouveau mot de passe pour ${u.firstName} ${u.lastName} ?`)) reset.mutate(u);
                      }}
                    >
                      Réinitialiser le mot de passe
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
