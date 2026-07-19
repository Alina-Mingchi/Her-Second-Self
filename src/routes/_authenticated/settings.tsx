import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, setConsent } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DATA_TYPES, DATA_TYPE_LABELS, type DataType } from "@/lib/me";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchMe = useServerFn(getMe);
  const { data: me } = useSuspenseQuery({ queryKey: ["me"], queryFn: () => fetchMe(), staleTime: 60_000 });
  const qc = useQueryClient();
  const set = useServerFn(setConsent);
  const m = useMutation({
    mutationFn: (v: { data_type: DataType; granted: boolean }) => set({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings & privacy</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your identity</CardTitle>
          <CardDescription>Researchers only see your pseudonym.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div><span className="text-muted-foreground">Pseudonym:</span> <span className="font-mono">{me.pseudonym}</span></div>
          <div><span className="text-muted-foreground">Email:</span> {me.email}</div>
          <div><span className="text-muted-foreground">Roles:</span> {me.roles.join(", ")}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Data sharing consents</CardTitle>
          <CardDescription>Toggle to pause or resume sharing per data type. Existing records remain unless you request deletion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DATA_TYPES.map((t) => (
            <div key={t} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{DATA_TYPE_LABELS[t]}</div>
                <div className="text-xs text-muted-foreground">{me.consents[t] ? "Sharing enabled" : "Paused"}</div>
              </div>
              <Switch
                checked={me.consents[t]}
                onCheckedChange={(v) => m.mutate({ data_type: t, granted: !!v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data export & deletion</CardTitle>
          <CardDescription>Under GDPR/HIPAA-inspired research policies, you can request a full export or account deletion. Contact your study coordinator.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
