import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { listAllDatasetRequests, decideDatasetRequest } from "@/lib/datasets.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dataset-requests")({
  head: () => ({ meta: [{ title: "Dataset requests · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const fetchList = useServerFn(listAllDatasetRequests);
  const decide = useServerFn(decideDatasetRequest);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["dataset-requests", "all"], queryFn: () => fetchList() });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dataset requests</h1>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No tickets.</p>}
      <div className="grid gap-3">
        {data.map((r: any) => (
          <Ticket key={r.id} ticket={r} onDecide={async (payload) => {
            await decide({ data: payload });
            toast.success("Decision recorded");
            qc.invalidateQueries({ queryKey: ["dataset-requests", "all"] });
          }} />
        ))}
      </div>
    </div>
  );
}

function Ticket({ ticket, onDecide }: { ticket: any; onDecide: (p: any) => Promise<void> }) {
  const [studyName, setStudyName] = useState(ticket.title ?? "");
  const [studyDesc, setStudyDesc] = useState(ticket.notes ?? "");
  const [notes, setNotes] = useState("");
  const m = useMutation({
    mutationFn: async (decision: "approved" | "rejected") =>
      onDecide({
        request_id: ticket.id,
        decision,
        decision_notes: notes || undefined,
        study_name: decision === "approved" ? studyName : undefined,
        study_description: decision === "approved" ? studyDesc : undefined,
      }),
  });
  const pending = ticket.status === "pending";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{ticket.title}</CardTitle>
          <Badge variant={ticket.status === "approved" ? "default" : ticket.status === "rejected" ? "destructive" : "secondary"}>
            {ticket.status}
          </Badge>
        </div>
        <CardDescription>
          {ticket.kind === "new_dataset" ? "New dataset" : "Access request"}
          {ticket.source ? ` · ${ticket.source}` : ""}
          {ticket.dua_reference ? ` · DUA: ${ticket.dua_reference}` : ""}
          {" · from "}{ticket.profiles?.pseudonym ?? ticket.profiles?.display_name ?? "?"}
          {ticket.studies?.name ? ` · target: ${ticket.studies.name}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {ticket.notes && <p className="text-sm whitespace-pre-wrap">{ticket.notes}</p>}
        {pending && ticket.kind === "new_dataset" && (
          <div className="grid gap-2 rounded-md border p-3">
            <div>
              <Label>Study name (on approval)</Label>
              <Input value={studyName} onChange={(e) => setStudyName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={studyDesc} onChange={(e) => setStudyDesc(e.target.value)} />
            </div>
          </div>
        )}
        {pending && (
          <>
            <div>
              <Label>Decision notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button disabled={m.isPending} onClick={() => m.mutate("approved")}>Approve</Button>
              <Button disabled={m.isPending} variant="outline" onClick={() => m.mutate("rejected")}>Reject</Button>
            </div>
          </>
        )}
        {!pending && ticket.decision_notes && (
          <p className="text-sm text-muted-foreground">Decision notes: {ticket.decision_notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
