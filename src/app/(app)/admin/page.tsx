import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { Database, Shield, Users } from "lucide-react";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { can, requireUser } from "@/server/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { recentAudit } from "@/server/audit";
import { PROVIDER_REGISTRY } from "@/services/data/provider";
import { storageStatus } from "@/services/storage/storage";
import { Badge, Card, Panel, PageHeader, TableShell, Td, Th } from "@/components/ui/primitives";
import { relativeDays } from "@/lib/format";
import { CsvImportPanel } from "./csv-import-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (!can(user, "view:admin")) redirect("/dashboard");

  const [userRows, auditRows] = await Promise.all([
    db.select().from(users).orderBy(asc(users.role), asc(users.name)),
    recentAudit(30),
  ]);
  const storage = storageStatus();

  return (
    <div className="space-y-5">
      <PageHeader title="Admin" description="Demo users, data-provider status and system activity." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Data providers" description="Section 12 of the BRD — the seam future integrations plug into" icon={<Database className="size-4" />} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {PROVIDER_REGISTRY.map((p) => (
              <li key={p.kind} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                </div>
                <Badge variant={p.connected ? "success" : "muted"} className="shrink-0">
                  {p.connected ? "Connected" : "Not connected"}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Document storage" icon={<Database className="size-4" />}>
          <p className="text-sm font-medium text-foreground">
            Backend: {storage.backend === "s3" ? "Amazon S3" : "Metadata only"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{storage.note}</p>
          {storage.bucket && (
            <p className="mt-2 text-xs text-muted-foreground">
              Bucket <span className="font-mono">{storage.bucket}</span> · region{" "}
              <span className="font-mono">{storage.region}</span>
            </p>
          )}
        </Panel>
      </div>

      <Panel title="CSV data import" description="Validate before committing — every bad row is reported" icon={<Database className="size-4" />}>
        <CsvImportPanel />
      </Panel>

      <Panel title="Demo users" icon={<Users className="size-4" />} bodyClassName="p-0">
        <TableShell>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Team</Th>
              <Th>Email</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {userRows.map((u) => (
              <tr key={u.id}>
                <Td className="text-sm text-foreground">{u.name}</Td>
                <Td className="text-sm text-muted-foreground">{ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]}</Td>
                <Td className="text-sm text-muted-foreground">{u.team ?? "—"}</Td>
                <Td className="text-sm text-muted-foreground">{u.email}</Td>
                <Td>
                  <Badge variant={u.status === "active" ? "success" : "muted"}>{u.status}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>

      <Panel title="Activity log" description="FR-014" icon={<Shield className="size-4" />} bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {auditRows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <p className="min-w-0 truncate text-sm text-foreground">
                {row.eventType.replace(/_/g, " ")}
                {row.entityType && <span className="text-muted-foreground"> · {row.entityType}</span>}
              </p>
              <span className="shrink-0 text-[11px] text-subtle-foreground">{relativeDays(row.timestamp)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
