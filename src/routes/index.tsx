import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, Heart, Mic, Utensils, ShieldCheck, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Her Second Self — AI research infrastructure for female hormonal health" },
      {
        name: "description",
        content:
          "Long-term, reproducible platform for collecting multimodal hormonal research data — symptoms, voice memos, food photos, wearables, labs, and brain signals.",
      },
    ],
  }),
  component: Landing,
});

const modalities = [
  { icon: Heart, title: "Symptoms & cycle", body: "Migraine, fatigue, brain fog, mood, sleep, cramps — daily severity with cycle context." },
  { icon: Mic, title: "Voice memos", body: "Speak on your phone. AI transcribes and extracts symptoms you mention out loud." },
  { icon: Utensils, title: "Food photos", body: "Snap what you eat. AI names foods and estimates macros for nutrition–hormone links." },
  { icon: Activity, title: "Wearable signals", body: "Sleep, HRV, resting heart rate, and stress imported from Apple Health, Fitbit, Oura, or Garmin." },
  { icon: Brain, title: "Brain signals & labs", body: "Upload EEG recordings and lab panels from the lab laptop — post-hoc sorted by availability." },
  { icon: LineChart, title: "Longitudinal", body: "Designed for 3+ months of continuous, sparse-friendly collection." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-primary" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight">Her Second Self</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-16">
        <section className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Research-grade · pseudonymized · consented
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Research-level infrastructure for female hormonal research.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Hormones shift with sleep, stress, nutrition, and age. Her Second Self collects the multimodal
            data that captures those shifts — on any day, over months — and lets researchers sort
            by availability in post-processing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Join a study
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-input bg-background/60 px-5 py-2.5 text-sm font-medium backdrop-blur hover:bg-accent hover:text-accent-foreground"
            >
              Researcher sign-in
            </Link>
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-3 md:mt-24 md:grid-cols-2 lg:grid-cols-3">
          {modalities.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border bg-card/70 p-5 backdrop-blur-sm transition hover:bg-card"
            >
              <m.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 rounded-3xl border bg-card/60 p-6 backdrop-blur md:p-10">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Built for real research constraints.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Participants log from their phone. Researchers upload lab panels and brain signals
                from a laptop. Nothing is required every day — participants record what they can,
                and the platform organizes it by availability, not schedule.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                Per-data-type consent — participants control what they share, per modality.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                Pseudonymous IDs shown to researchers; identity kept separate.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                Audit log for every researcher access to identifiable data.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                Full participant data download and account deletion, on request.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background/40 py-6 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Her Second Self · Research platform · Not medical advice
        </div>
      </footer>
    </div>
  );
}
