import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyDatasets, listMyDatasetRequests } from "@/lib/datasets.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/datasets/")({
  head: () => ({ meta: [{ title: "External datasets · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchList = useServerFn(listMyDatasets);
  const fetchReqs = useServerFn(listMyDatasetRequests);
  const { data: datasets } = useSuspenseQuery({ queryKey: ["datasets", "mine"], queryFn: () => fetchList() });
  const { data: reqs } = useSuspenseQuery({ queryKey: ["datasets", "requests", "mine"], queryFn: () => fetchReqs() });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">External datasets</h1>
          <p className="text-sm text-muted-foreground">Public cohorts (e.g. mcPHASES from PhysioNet) ingested into your studies.</p>
        </div>
        <Button asChild><Link to="/datasets/request">Request dataset</Link></Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Datasets you can access</h2>
        {datasets.length === 0 && <p className="text-sm text-muted-foreground">None yet. File a request to have one provisioned.</p>}
        <div className="grid gap-2">
          {datasets.map((d: any) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  {d.source && <Badge variant="secondary">{d.source}</Badge>}
                </div>
                {d.description && <CardDescription>{d.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="text-xs text-muted-foreground">Registered {new Date(d.created_at).toLocaleDateString()}</span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/datasets/$studyId" params={{ studyId: d.id }}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Your tickets</h2>
        {reqs.length === 0 && <p className="text-sm text-muted-foreground">No open requests.</p>}
        <div className="grid gap-2">
          {reqs.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </div>
                <CardDescription>
                  {r.kind === "new_dataset" ? "New dataset" : "Access request"}
                  {r.source ? ` · ${r.source}` : ""}
                </CardDescription>
              </CardHeader>
              {r.decision_notes && <CardContent className="text-sm">{r.decision_notes}</CardContent>}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
