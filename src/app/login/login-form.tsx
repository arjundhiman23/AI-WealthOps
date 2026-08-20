"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Shield, Sparkles, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, Divider } from "@/components/ui/primitives";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type Persona = { id: string; name: string; email: string; role: string; team: string | null };

const ROLE_ORDER: Role[] = ["rm", "manager", "operations", "admin", "executive"];

export function LoginForm({ personas, dbError }: { personas: Persona[]; dbError: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(personas[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not sign in.");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check that the app is running.");
      setBusy(false);
    }
  };

  const byRole = ROLE_ORDER.map((role) => ({
    role,
    people: personas.filter((p) => p.role === role),
  })).filter((g) => g.people.length);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — dark chrome, matching the app's sidebar signature */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-active-bg text-sidebar-active-bar">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">ACC WealthOps AI</p>
              <p className="text-[11px] text-sidebar-muted">Vijay WealthDesk — powered by ACC</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-[26px] font-semibold leading-tight tracking-tight text-white">
            Stop building dashboards. Build an action layer.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground">
            A dashboard tells a relationship manager what is happening. WealthOps tells them what deserves
            attention, why it matters, what supports that conclusion, and what to do next.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/15 text-sidebar-foreground">
              Explainable prioritization
            </Badge>
            <Badge variant="outline" className="border-white/15 text-sidebar-foreground">
              Review briefs
            </Badge>
            <Badge variant="outline" className="border-white/15 text-sidebar-foreground">
              Grounded assistant
            </Badge>
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-[11px] text-sidebar-muted">
          <Shield className="size-3.5" />
          Demonstration environment. Synthetic data only — no real client information.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <Sparkles className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">ACC WealthOps AI</p>
                <p className="text-[11px] text-muted-foreground">Vijay WealthDesk</p>
              </div>
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">Choose a demo persona</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no passwords in this prototype. Pick the role you want to demonstrate — each one sees a
            different slice of the workspace.
          </p>

          {dbError && (
            <Card className="mt-5 border-warning/40 bg-warning-muted p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <TriangleAlert className="size-4" />
                The database is not ready yet
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-warning-foreground">
                Run <code className="font-mono">npm run db:push</code> then{" "}
                <code className="font-mono">npm run db:seed</code> to create the tables and load the demo
                dataset. On Render, this runs automatically on first deploy.
              </p>
            </Card>
          )}

          {!dbError && !personas.length && (
            <Card className="mt-5 border-warning/40 bg-warning-muted p-4">
              <p className="text-sm font-semibold text-warning">No demo users found</p>
              <p className="mt-1.5 text-xs text-warning-foreground">
                The tables exist but are empty. Run <code className="font-mono">npm run db:seed</code>.
              </p>
            </Card>
          )}

          {byRole.length > 0 && (
            <div className="mt-5 space-y-4">
              {byRole.map((group) => (
                <div key={group.role}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {ROLE_LABEL[group.role]}
                  </p>
                  <div className="space-y-1.5">
                    {group.people.slice(0, group.role === "rm" ? 3 : 2).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelected(p.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          selected === p.id
                            ? "border-brand bg-brand-muted"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            selected === p.id
                              ? "bg-brand text-brand-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {initials(p.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                        </span>
                        {p.team && (
                          <Badge variant="muted" className="hidden sm:inline-flex">
                            <Building2 className="size-3" />
                            {p.team}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full justify-center"
            disabled={!selected || busy}
            onClick={signIn}
          >
            {busy ? "Signing in…" : "Enter the workspace"}
            {!busy && <ArrowRight className="size-4" />}
          </Button>

          <Divider className="my-6" />

          <p className="text-[11px] leading-relaxed text-subtle-foreground">
            Production replaces this screen with SSO/OIDC, MFA and role-based access control. The session
            shape here is deliberately the same, so swapping the identity provider does not change any
            calling code.
          </p>
        </div>
      </div>
    </div>
  );
}
