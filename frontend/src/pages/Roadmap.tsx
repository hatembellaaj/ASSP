import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, StatusPill, Loading, EmptyState } from "../components/ui";

export default function Roadmap() {
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: async () => (await api.get("/roadmap")).data,
  });

  const groups = data?.reduce((acc: Record<string, any[]>, item: any) => {
    acc[item.quarter] = acc[item.quarter] || [];
    acc[item.quarter].push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Road Map MouvPlus" />
      <div className="mx-auto max-w-3xl p-8">
        <p className="mb-6 text-sm text-slate-500">Vue d'ensemble des chantiers de la plateforme MouvPlus.</p>
        {isLoading && <Loading />}
        {!isLoading && data?.length === 0 && <EmptyState title="Aucun élément de roadmap" />}
        <div className="space-y-6">
          {groups &&
            Object.entries(groups).map(([quarter, items]: [string, any]) => (
              <div key={quarter}>
                <h2 className="mb-2 text-sm font-semibold text-brand-700">{quarter}</h2>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <Card key={item.id} className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{item.title}</div>
                        {item.description && <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>}
                        {item.author && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            par {item.author.firstName} {item.author.lastName}
                          </div>
                        )}
                      </div>
                      <StatusPill status={item.status} />
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
