import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConsentTemplates } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/consents")({
  head: () => ({ meta: [{ title: "Consent templates · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(listConsentTemplates);
  const { data } = useSuspenseQuery({ queryKey: ["consent-templates"], queryFn: () => fetch() });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Consent templates</h1>
      <div className="grid gap-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
        {data.map((c: any) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="text-base">{c.title} · v{c.version}</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{c.body}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
