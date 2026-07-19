import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listParticipants, getParticipantData } from "@/lib/researcher.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({ meta: [{ title: "Export · Her Second Self" }] }),
  component: Page,
});

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function download(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Page() {
  const list = useServerFn(listParticipants);
  const { data: participants } = useSuspenseQuery({ queryKey: ["participants"], queryFn: () => list() });
  const [subject, setSubject] = useState<string>("");
  const getData = useServerFn(getParticipantData);
  const [busy, setBusy] = useState(false);

  async function doExport(format: "csv" | "json") {
    if (!subject) return toast.error("Pick a participant");
    setBusy(true);
    try {
      const d = await getData({ data: { subject } });
      const ps = d.profile?.pseudonym ?? subject.slice(0, 8);
      if (format === "json") {
        download(`hersignal_${ps}.json`, JSON.stringify(d, null, 2), "application/json");
      } else {
        const parts = [
          ["daily", d.daily],
          ["symptoms", d.symptoms],
          ["hormones", d.hormones],
          ["memos", d.memos],
          ["foods", d.foods],
          ["wearables", d.wearables],
          ["labs", d.labs],
          ["brain", d.brain],
        ] as const;
        for (const [name, rows] of parts) {
          if (rows.length) download(`hersignal_${ps}_${name}.csv`, toCsv(rows));
        }
      }
      toast.success("Export downloaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Export data</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-participant export</CardTitle>
          <CardDescription>Every export is logged in the audit trail against your researcher account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="Choose a participant…" /></SelectTrigger>
            <SelectContent>
              {participants.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.pseudonym}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={() => doExport("csv")} disabled={busy || !subject}><FileDown className="mr-2 h-4 w-4" />Download CSVs</Button>
            <Button variant="outline" onClick={() => doExport("json")} disabled={busy || !subject}>Download JSON</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
