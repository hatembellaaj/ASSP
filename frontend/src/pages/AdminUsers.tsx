import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Avatar, Loading } from "../components/ui";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Programmateur",
  ENTRAINEUR: "Entraîneur",
  CONSEILLER: "Conseiller",
  MEMBRE: "Adhérent",
};

export default function AdminUsers() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => (await api.get("/users")).data,
  });

  return (
    <div>
      <PageHeader title="Utilisateurs" />
      <div className="p-8">
        {isLoading && <Loading />}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((u: any) => (
                <tr key={u.id}>
                  <td className="flex items-center gap-2 px-4 py-3">
                    <Avatar firstName={u.firstName} lastName={u.lastName} color={u.avatarColor} size={28} />
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3">{u.plan}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
