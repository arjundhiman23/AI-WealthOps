"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, PhoneCall, Plus, X } from "lucide-react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { ReviewBriefModal } from "./review-brief-modal";

export function ClientActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [briefOpen, setBriefOpen] = useState(params.get("brief") === "1");
  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  useEffect(() => {
    if (params.get("brief") === "1") setBriefOpen(true);
  }, [params]);

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => setBriefOpen(true)}>
          <FileText className="size-4" />
          Generate brief
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setLogOpen(true)}>
          <PhoneCall className="size-4" />
          Log interaction
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
          <Plus className="size-4" />
          Add task
        </Button>
      </div>

      {briefOpen && (
        <ReviewBriefModal
          clientId={clientId}
          clientName={clientName}
          onClose={() => {
            setBriefOpen(false);
            router.replace(`/clients/${clientId}`);
          }}
        />
      )}
      {logOpen && (
        <LogInteractionModal clientId={clientId} onClose={() => setLogOpen(false)} onSaved={() => router.refresh()} />
      )}
      {taskOpen && (
        <AddTaskModal clientId={clientId} onClose={() => setTaskOpen(false)} onSaved={() => router.refresh()} />
      )}
    </>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <Card className="shadow-pop relative w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function LogInteractionModal({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState("call");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clients/${clientId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, notes: notes || undefined, nextAction: nextAction || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save that interaction.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="Log an interaction" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-full">
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
            <option value="review">Review</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed?" />
        </div>
        <div>
          <Label>Next action (optional)</Label>
          <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Send updated statement" />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save interaction"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function AddTaskModal({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Give the task a title.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, clientId, priority, dueDate: dueDate || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create that task.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <ModalShell title="Add a follow-up task" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send revised KYC form" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Create task"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
