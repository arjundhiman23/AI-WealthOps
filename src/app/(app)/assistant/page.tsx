"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Badge, Card, Input, PageHeader, TableShell, Td, Th } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  sources?: { label: string; href?: string }[];
  table?: { columns: string[]; rows: string[][] };
  matched?: boolean;
};

const SUGGESTED = [
  "Which high-value clients have not been contacted recently?",
  "Which clients have overdue portfolio reviews?",
  "Show me clients with recent engagement drops.",
  "What should I follow up on today?",
  "Prepare a review brief for Rajesh Sharma.",
  "Summarize Neha Shah's recent activity.",
];

export default function AssistantPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "I can answer questions about this demo book — contact gaps, overdue reviews, today's priorities, and client summaries. Try one of the suggestions below, or ask your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", content: question }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      if (!res.ok) {
        setTurns((t) => [...t, { role: "assistant", content: body.error ?? "Something went wrong." }]);
        return;
      }
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: body.reply.content,
          sources: body.reply.sources,
          table: body.reply.table,
          matched: body.reply.matched,
        },
      ]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", content: "Could not reach the assistant. Try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      <PageHeader
        title="AI Wealth Assistant"
        description="Deterministic demo responses, grounded in the synthetic dataset — not a live model."
      />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
          {turns.map((turn, i) => (
            <div key={i} className={cn("flex gap-2.5", turn.role === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  turn.role === "user" ? "bg-muted text-muted-foreground" : "bg-brand-muted text-brand-muted-foreground",
                )}
              >
                {turn.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <div className={cn("max-w-[85%] space-y-2", turn.role === "user" && "flex flex-col items-end")}>
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm",
                    turn.role === "user" ? "bg-brand text-brand-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {turn.content}
                </div>

                {turn.table && (
                  <Card className="w-full overflow-hidden">
                    <TableShell>
                      <thead>
                        <tr>
                          {turn.table.columns.map((c) => (
                            <Th key={c}>{c}</Th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {turn.table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <Td key={ci} className="text-sm">
                                {cell}
                              </Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </TableShell>
                  </Card>
                )}

                {turn.sources && turn.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {turn.sources.map((s, si) =>
                      s.href ? (
                        <Link key={si} href={s.href}>
                          <Badge variant="outline" className="hover:bg-muted">
                            {s.label}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge key={si} variant="outline">
                          {s.label}
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand-muted-foreground">
                <Bot className="size-3.5" />
              </span>
              <div className="flex items-center gap-1 rounded-xl bg-muted px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <Sparkles className="size-3" />
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your book of business…"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
