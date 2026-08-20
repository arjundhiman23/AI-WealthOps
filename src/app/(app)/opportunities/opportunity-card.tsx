"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { SegmentBadge } from "@/components/ui/priority-badge";
import { compactINR } from "@/lib/format";
import type { OpportunityType } from "@/services/priority/engine";

export function OpportunityCard({
  id,
  clientId,
  clientName,
  clientSegment,
  rmName,
  portfolioValue,
  type,
  score,
  status,
  action,
}: {
  id: string;
  clientId: string;
  clientName: string;
  clientSegment: string;
  rmName: string | null;
  portfolioValue: number | null;
  type: OpportunityType;
  score: number;
  status: string;
  action: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);

  const update = async (next: "actioned" | "dismissed") => {
    setBusy(true);
    const res = await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setBusy(false);
    if (res.ok) {
      setLocalStatus(next);
      router.refresh();
    }
  };

  return (
    <Card className="animate-fade-up flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/clients/${clientId}`} className="truncate text-sm font-medium text-foreground hover:text-brand">
            {clientName}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SegmentBadge segment={clientSegment} />
            {rmName && <span className="text-[11px] text-muted-foreground">{rmName}</span>}
          </div>
        </div>
        <Badge variant="warning">{score}</Badge>
      </div>

      <div>
        <p className="text-xs font-semibold text-brand">
          {type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{action}</p>
      </div>

      {portfolioValue !== null && (
        <p className="tabular text-xs text-muted-foreground">Portfolio ₹{compactINR(portfolioValue)}</p>
      )}

      {localStatus === "open" ? (
        <div className="mt-auto flex gap-2 pt-1">
          <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => update("actioned")}>
            <Check className="size-3.5" />
            Mark actioned
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => update("dismissed")}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Badge variant={localStatus === "actioned" ? "success" : "muted"} className="mt-auto w-fit">
          {localStatus}
        </Badge>
      )}
    </Card>
  );
}
