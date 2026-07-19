import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { openDatasetRequest, listMyDatasets } from "@/lib/datasets.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/datasets/request")({
  head: () => ({ meta: [{ title: "Request dataset · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const submit = useServerFn(openDatasetRequest);
  const fetchDatasets = useServerFn(listMyDatasets);
  const { data: datasets } = useSuspenseQuery({ queryKey: ["datasets", "mine"], queryFn: () => fetchDatasets() });

  const [kind, setKind] = useState<"new_dataset" | "access_request">("new_dataset");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [dua, setDua] = useState("");
  const [notes, setNotes] = useState("");
  const [studyId, setStudyId] = useState<string>("");

  const m = useMutation({
    mutationFn: async () => submit({
      data: {
        kind,
        title,
        source: source || undefined,
        dua_reference: dua || undefined,
        notes: notes || undefined,
        study_id: kind === "access_request" ? studyId : undefined,
      },
    }),
    onSuccess: () => {
      toast.success("Ticket submitted — an admin will review");
      navigate({ to: "/datasets" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const valid = title.length >= 2 && (kind === "new_dataset" || !!studyId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Request an external dataset</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New ticket</CardTitle>
          <CardDescription>
            After you complete the data-use agreement with the source (e.g. PhysioNet mcPHASES), file a
            ticket. An admin approves and provisions the dataset study.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label>Ticket type</Label>
            <Select value={kind} onValueChange={(v: any) => setKind(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_dataset">Ingest a new dataset</SelectItem>
                <SelectItem value="access_request">Request access to an existing dataset</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mcPHASES longitudinal (2024)" />
          </div>
          {kind === "new_dataset" && (
            <>
              <div>
                <Label>Source</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="PhysioNet — mcPHASES" />
              </div>
              <div>
                <Label>Data-use agreement reference</Label>
                <Input value={dua} onChange={(e) => setDua(e.target.value)} placeholder="DUA identifier / URL / date signed" />
              </div>
            </>
          )}
          {kind === "access_request" && (
            <div>
              <Label>Dataset</Label>
              <Select value={studyId} onValueChange={setStudyId}>
                <SelectTrigger><SelectValue placeholder="Choose an existing dataset…" /></SelectTrigger>
                <SelectContent>
                  {datasets.length === 0 && <div className="p-2 text-sm text-muted-foreground">No datasets visible to you yet.</div>}
                  {datasets.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Ask a colleague or admin for the dataset name if you can't see it.</p>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Intended use, study protocol, timeline…" />
          </div>
          <Button disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Submitting…" : "Submit ticket"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
