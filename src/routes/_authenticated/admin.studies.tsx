import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudies } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/studies")({
  head: () => ({ meta: [{ title: "Studies · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(listStudies);
  const { data } = useSuspenseQuery({ queryKey: ["studies"], queryFn: () => fetch() });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
      <div className="grid gap-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No studies yet. Coordinators create studies from the database.</p>}
        {data.map((s: any) => (
          <Card key={s.id}>
            <CardHeader><CardTitle className="text-base">{s.name}</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>{s.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {s.start_date ?? "?"} → {s.end_date ?? "ongoing"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
