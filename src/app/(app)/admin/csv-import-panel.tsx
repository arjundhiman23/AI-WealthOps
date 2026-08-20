"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";

type ValidateResult = {
  mode: "validate";
  totalRows: number;
  validRows: number;
  issues: { row: number; field: string; message: string }[];
  issueCount: number;
};

type CommitResult = {
  mode: "commit";
  imported: number;
  skipped: number;
  issues: { row: number; field: string; message: string }[];
};

export function CsvImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidateResult | CommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (commit: boolean) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("commit", String(commit));

    try {
      const res = await fetch("/api/import/csv", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not process that file.");
        return;
      }
      setResult(body);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-2.5 text-sm text-muted-foreground hover:border-brand hover:text-brand">
          <Upload className="size-4" />
          {file ? file.name : "Choose a CSV file"}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
          />
        </label>
        <Button variant="secondary" size="sm" disabled={!file || busy} onClick={() => run(false)}>
          Validate
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!file || busy || !result || result.mode !== "validate" || result.validRows === 0}
          onClick={() => run(true)}
        >
          {busy ? "Working…" : "Import valid rows"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Required columns: <code className="font-mono">name, segment, city, portfolio_value</code>. Optional:{" "}
        <code className="font-mono">email, rm_id</code>. Segment must be Platinum, Gold, Silver or Emerging.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-muted p-3 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <Card className="p-4">
          {result.mode === "validate" ? (
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              {result.validRows} of {result.totalRows} rows are valid
              {result.issueCount > 0 && ` — ${result.issueCount} issue${result.issueCount === 1 ? "" : "s"} found`}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Imported {result.imported} client{result.imported === 1 ? "" : "s"}
              {result.skipped > 0 && ` · skipped ${result.skipped} row${result.skipped === 1 ? "" : "s"}`}
            </p>
          )}

          {result.issues.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
              {result.issues.map((issue, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-danger">Row {issue.row}</span> · {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
