import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(listAuditLog);
  const { data } = useSuspenseQuery({ queryKey: ["audit"], queryFn: () => fetch() });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent access</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.actor_user_id?.slice(0, 8)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.subject_user_id?.slice(0, 8) ?? "—"}</td>
                    <td className="py-2 pr-3">{r.action}</td>
                    <td className="py-2 pr-3">{r.resource ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No entries yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
