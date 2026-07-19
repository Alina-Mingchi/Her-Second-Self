import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { createFoodUpload, registerFoodPhoto, analyzeFoodPhoto } from "@/lib/food.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log/food")({
  head: () => ({ meta: [{ title: "Food photo · Her Second Self" }] }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upl = useServerFn(createFoodUpload);
  const reg = useServerFn(registerFoodPhoto);
  const analyze = useServerFn(analyzeFoodPhoto);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setItems([]); setTotals(null);
  }

  const m = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a photo");
      const extMap: Record<string, "jpg" | "png" | "webp" | "heic" | "jpeg"> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic",
      };
      const ext = extMap[file.type] ?? "jpg";
      const { path, signedUrl } = await upl({ data: { ext } });
      const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(`Upload failed ${put.status}`);
      const { id } = await reg({ data: { storage_path: path } });
      const r = await analyze({ data: { id } });
      setItems(r.items ?? []);
      setTotals(r.totals ?? null);
    },
    onSuccess: () => toast.success("Analyzed"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Snap a meal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A quick photo is enough. AI will name foods and estimate macros.
      </p>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
          <CardDescription>Use your phone camera for best results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          {preview ? (
            <div className="overflow-hidden rounded-xl border">
              <img src={preview} alt="Meal preview" className="w-full object-cover" />
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed hover:bg-accent/40"
            >
              <div className="text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                <div className="mt-2 text-sm font-medium">Take or upload a photo</div>
              </div>
            </button>
          )}
          <div className="flex gap-2">
            <Button onClick={() => inputRef.current?.click()} variant="outline">
              {preview ? "Retake" : "Choose photo"}
            </Button>
            {preview && (
              <Button onClick={() => m.mutate()} disabled={m.isPending}>
                {m.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : "Save & analyze"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {totals && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Estimate</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="kcal" v={Math.round(totals.kcal)} />
              <Stat label="protein g" v={Math.round(totals.protein)} />
              <Stat label="carbs g" v={Math.round(totals.carbs)} />
              <Stat label="fat g" v={Math.round(totals.fat)} />
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {items.map((it, i) => (
                <li key={i}>{it.name} <span className="text-muted-foreground">· {it.portion} · {it.kcal} kcal</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{v}</div>
    </div>
  );
}
