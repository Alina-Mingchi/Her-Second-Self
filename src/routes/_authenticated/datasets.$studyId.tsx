import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  getDataset,
  createDatasetUploadUrl,
  ingestDatasetFile,
  getDatasetFileUrl,
} from "@/lib/datasets.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";
import { toast } from "sonner";

const CORE = new Set([
  "subject-info","subject_info","demographic","demographics","height_and_weight",
  "hormones_and_selfreport","hormones","sleep","sleep_score",
  "heart_rate","resting_heart_rate","heart_rate_variability_details","hrv_details","hrv",
  "stress_score","respiratory_rate_summary","respiratory_rate",
  "wrist_temperature","computed_temperature","steps",
]);
function classifyName(name: string): "mapped_source" | "raw_archive" {
  const n = name.toLowerCase().replace(/\.(csv|txt|tsv)$/i, "").replace(/[\s-]+/g, "_");
  return CORE.has(n) ? "mapped_source" : "raw_archive";
}

export const Route = createFileRoute("/_authenticated/datasets/$studyId")({
  head: () => ({ meta: [{ title: "Dataset · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const { studyId } = Route.useParams();
  const qc = useQueryClient();
  const fetchDs = useServerFn(getDataset);
  const upl = useServerFn(createDatasetUploadUrl);
  const ing = useServerFn(ingestDatasetFile);
  const link = useServerFn(getDatasetFileUrl);

  const { data } = useSuspenseQuery({
    queryKey: ["dataset", studyId],
    queryFn: () => fetchDs({ data: { study_id: studyId } }),
  });

  const [queued, setQueued] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const ingestOne = useMutation({
    mutationFn: async (file: File) => {
      setProgress((p) => ({ ...p, [file.name]: "uploading" }));
      const { path, signedUrl } = await upl({ data: { study_id: studyId, filename: file.name } });
      const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "text/csv" } });
      if (!put.ok) throw new Error(`Upload failed ${put.status}`);
      setProgress((p) => ({ ...p, [file.name]: "parsing" }));
      const res = await ing({ data: { study_id: studyId, storage_path: path, filename: file.name, bytes: file.size } });
      setProgress((p) => ({ ...p, [file.name]: `${res.kind === "mapped_source" ? `${res.rows_ingested} rows` : "archived"}` }));
      return res;
    },
    onError: (e: any, file) => {
      setProgress((p) => ({ ...p, [file.name]: `error: ${e.message}` }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["dataset", studyId] }),
  });

  async function ingestAll() {
    for (const f of queued) await ingestOne.mutateAsync(f).catch(() => {});
    setQueued([]);
  }

  async function openFile(path: string) {
    const { url } = await link({ data: { study_id: studyId, storage_path: path } });
    window.open(url, "_blank", "noopener");
  }

  if (!data.study) return <p className="p-6 text-sm">Dataset not found.</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.study.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.study.source ?? "External cohort"} · {data.subjects.length} subjects · {data.files.length} files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload mcPHASES files</CardTitle>
          <CardDescription>
            Drop CSV/TXT files. Recognized files are parsed into subjects, wearable samples, hormones,
            and symptoms. Everything else is archived and downloadable for later mapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => setQueued(Array.from(e.target.files ?? []))}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>Choose files</Button>
            <Button disabled={queued.length === 0 || ingestOne.isPending} onClick={ingestAll}>
              {ingestOne.isPending ? "Ingesting…" : `Ingest ${queued.length || ""}`.trim()}
            </Button>
          </div>
          {queued.length > 0 && (
            <ul className="text-sm space-y-1">
              {queued.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <span className="truncate">
                    {f.name} · {(f.size / 1024).toFixed(1)} KB
                    <Badge className="ml-2" variant={classifyName(f.name) === "mapped_source" ? "default" : "secondary"}>
                      {classifyName(f.name) === "mapped_source" ? "will parse" : "will archive"}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">{progress[f.name] ?? "queued"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
        <CardContent>
          {data.files.length === 0 && <p className="text-sm text-muted-foreground">No files ingested yet.</p>}
          <ul className="divide-y">
            {data.files.map((f: any) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{f.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.kind === "mapped_source" ? `${f.rows_ingested ?? 0} rows parsed` : "raw archive"} ·
                    {" "}{new Date(f.created_at).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openFile(f.storage_path)}>Download</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Subjects</CardTitle></CardHeader>
        <CardContent>
          {data.subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
          <ul className="flex flex-wrap gap-2 text-xs">
            {data.subjects.map((s: any) => (
              <li key={s.id}><Badge variant="outline">{s.external_id}</Badge></li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {data.members.map((m: any) => (
              <li key={m.user_id} className="flex items-center justify-between">
                <span>{m.profiles?.pseudonym ?? m.profiles?.display_name ?? m.user_id.slice(0, 8)}</span>
                <Badge variant="secondary">{m.role_in_study}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
