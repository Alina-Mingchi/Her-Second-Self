import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listParticipants } from "@/lib/researcher.functions";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/participants")({
  head: () => ({ meta: [{ title: "Participants · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetch = useServerFn(listParticipants);
  const { data } = useSuspenseQuery({ queryKey: ["participants"], queryFn: () => fetch() });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
      <p className="mt-1 text-sm text-muted-foreground">You see participants from studies you're assigned to.</p>
      <div className="mt-5 grid gap-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No participants visible.</p>}
        {data.map((p: any) => (
          <Link key={p.id} to="/participants/$id" params={{ id: p.id }} className="block">
            <Card className="transition hover:border-primary/60">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="font-mono text-sm">{p.pseudonym}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.birth_year ? `Born ${p.birth_year} · ` : ""}Joined {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${p.onboarded ? "bg-secondary" : "bg-muted"}`}>
                  {p.onboarded ? "active" : "pending"}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
