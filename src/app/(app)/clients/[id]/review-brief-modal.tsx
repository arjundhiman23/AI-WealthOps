"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Sparkles, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { ReviewBrief } from "@/services/ai/ai-service";

export function ReviewBriefModal({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState<ReviewBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/review-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not generate the review brief.");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setBrief(data.brief);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <Card className="shadow-pop relative flex max-h-[85vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Review brief — {clientName}</h2>
              {brief && <p className="text-xs text-muted-foreground">{brief.headline}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-shimmer rounded bg-muted" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-muted p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          {brief && (
            <div className="space-y-5">
              {brief.sections.map((section, i) => (
                <div key={i}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.heading}
                  </p>
                  {section.kind === "keyvalue" && section.pairs && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {section.pairs.map((p, j) => (
                        <div key={j} className="contents">
                          <dt className="text-xs text-muted-foreground">{p.label}</dt>
                          <dd className="tabular text-xs font-medium text-foreground">{p.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {section.kind === "list" && section.items && (
                    <ul className="space-y-1.5">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex gap-2 text-sm text-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.kind === "text" && section.body && (
                    <p className="text-sm text-foreground">{section.body}</p>
                  )}
                </div>
              ))}

              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">{brief.disclaimer}</p>
              </div>
            </div>
          )}
        </div>

        {brief && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <Badge variant="muted">Generated {new Date(brief.generatedAt).toLocaleString("en-IN")}</Badge>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print / save as PDF
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
