"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { dueLabel, formatDate } from "@/lib/format";

export function TaskRow({
  id,
  title,
  description,
  priority,
  status,
  dueDate,
  clientId,
  clientName,
  ownerName,
}: {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  clientId: string | null;
  clientName: string | null;
  ownerName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const due = dueLabel(dueDate);
  const done = localStatus === "done";

  const toggle = async () => {
    setBusy(true);
    const next = done ? "open" : "done";
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) {
      setLocalStatus(next);
      router.refresh();
    }
  };

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={done ? "Reopen task" : "Mark task complete"}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          done ? "border-brand bg-brand text-brand-foreground" : "border-border-strong hover:border-brand"
        }`}
      >
        {done ? <Check className="size-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {title}
        </p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {clientId && clientName && (
            <Link href={`/clients/${clientId}`} className="font-medium text-brand hover:underline">
              {clientName}
            </Link>
          )}
          {ownerName && <span>{ownerName}</span>}
          <span>{formatDate(dueDate)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant={priority === "high" ? "danger" : priority === "medium" ? "warning" : "muted"}>
          {priority}
        </Badge>
        {!done && (
          <span
            className={`text-[11px] ${
              due.tone === "danger" ? "text-danger" : due.tone === "warning" ? "text-warning" : "text-subtle-foreground"
            }`}
          >
            {due.label}
          </span>
        )}
        {done && (
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Reopen task">
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}
