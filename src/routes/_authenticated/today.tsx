import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { todaySummary } from "@/lib/logs.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Utensils, Activity, ClipboardList, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today · Her Second Self" }] }),
  component: Today,
});

const actions = [
  { to: "/log/symptoms", label: "Log symptoms", icon: ClipboardList, hint: "Migraine, fatigue, brain fog…" },
  { to: "/log/voice", label: "Record voice memo", icon: Mic, hint: "Speak — AI extracts symptoms" },
  { to: "/log/food", label: "Snap a meal", icon: Utensils, hint: "Photo → nutrition estimate" },
  { to: "/log/wearable", label: "Import wearable data", icon: Activity, hint: "CSV from Apple Health, Oura, Fitbit…" },
];

function Today() {
  const fetchSummary = useServerFn(todaySummary);
  const { data: s } = useSuspenseQuery({ queryKey: ["today"], queryFn: () => fetchSummary(), staleTime: 30_000 });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{new Date(s.today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log what you can. Nothing is required every day.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Symptoms" value={s.symptomsCount} />
        <Stat label="Voice memos" value={s.memosCount} />
        <Stat label="Meals" value={s.foodsCount} />
        <Stat label="kcal" value={s.kcalToday} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="group">
            <Card className="transition hover:border-primary/60 hover:bg-accent/30">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.hint}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {s.daily?.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Your notes today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{s.daily.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
