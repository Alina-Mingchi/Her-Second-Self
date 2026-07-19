import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { completeOnboarding, getMe } from "@/lib/profile.functions";
import { DATA_TYPES, DATA_TYPE_LABELS, type DataType } from "@/lib/me";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Her Second Self" }] }),
  component: Onboarding,
});

function Onboarding() {
  const fetchMe = useServerFn(getMe);
  const { data: me } = useSuspenseQuery({ queryKey: ["me"], queryFn: () => fetchMe(), staleTime: 60_000 });
  const [displayName, setDisplayName] = useState(me.display_name ?? "");
  const [birthYear, setBirthYear] = useState<string>("");
  const [consents, setConsents] = useState<DataType[]>([...DATA_TYPES]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const finish = useServerFn(completeOnboarding);

  const m = useMutation({
    mutationFn: () =>
      finish({
        data: {
          display_name: displayName || undefined,
          birth_year: birthYear ? Number(birthYear) : null,
          consents,
        },
      }),
    onSuccess: async () => {
      toast.success("You're all set");
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: "/today" });
    },
    onError: (e: any) => toast.error(e.message ?? "Something went wrong"),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" /> Research-grade privacy
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome to Her Second Self</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set up your account and pick which data types you'd like to contribute. You can change these
          anytime in Settings.
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              Your pseudonymized ID is <span className="font-mono">{me.pseudonym}</span>. Researchers only see this ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="dn">Display name (optional)</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="by">Birth year (optional)</Label>
              <Input id="by" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1994" />
              <p className="mt-1 text-xs text-muted-foreground">Used only for age bucketing in aggregate research.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent to share, per data type</CardTitle>
            <CardDescription>
              Each item is independent. You can pause any of them later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DATA_TYPES.map((t) => (
              <label key={t} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3">
                <Checkbox
                  checked={consents.includes(t)}
                  onCheckedChange={(v) =>
                    setConsents((prev) => (v ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)))
                  }
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{DATA_TYPE_LABELS[t]}</div>
                  <p className="text-xs text-muted-foreground">
                    Encrypted at rest. Only accessible to researchers on studies you join.
                  </p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
