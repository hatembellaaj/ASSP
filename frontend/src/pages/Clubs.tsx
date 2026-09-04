import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Button, Loading } from "../components/ui";

export default function Clubs() {
  const { data, isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => (await api.get("/clubs")).data,
  });

  return (
    <div>
      <PageHeader title="Clubs partenaires" />
      <div className="p-8">
        <p className="mb-4 text-sm text-slate-500">Nos clubs partenaires vous accueillent pour vos séances en présentiel.</p>
        {isLoading && <Loading />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((club: any) => (
            <Card key={club.id}>
              <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white">
                🏛️
              </div>
              <div className="font-semibold text-slate-900">{club.name}</div>
              <div className="mb-2 text-xs text-slate-400">📍 {club.city} {club.postalCode}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {club.amenities?.map((a: string) => (
                  <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                    {a}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">📞 {club.phone}</span>
                <Button variant="secondary">Voir le club</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
