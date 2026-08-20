import { desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { db } from "@/server/db";
import { clients, documents } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { storageStatus } from "@/services/storage/storage";
import { Badge, Card, EmptyState, Panel, PageHeader, TableShell, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  await requireUser();
  const storage = storageStatus();

  const rows = await db
    .select({ document: documents, clientName: clients.name, clientId: clients.id })
    .from(documents)
    .leftJoin(clients, eq(documents.clientId, clients.id))
    .orderBy(desc(documents.date))
    .limit(200);

  return (
    <div className="space-y-5">
      <PageHeader title="Documents" description={`${rows.length} document${rows.length === 1 ? "" : "s"} across the book`} />

      <Card className={`p-4 ${storage.configured ? "border-success/40 bg-success-muted" : "border-warning/40 bg-warning-muted"}`}>
        <p className={`text-sm font-semibold ${storage.configured ? "text-success" : "text-warning"}`}>
          Storage backend: {storage.backend === "s3" ? "Amazon S3" : "Metadata only"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{storage.note}</p>
      </Card>

      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={<FileText className="size-5" />} title="No documents" description="Nothing filed yet." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Client</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Size</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.document.id} className="hover:bg-muted/60">
                  <Td className="text-sm text-foreground">{r.document.name}</Td>
                  <Td className="text-sm text-muted-foreground">{r.clientName ?? "—"}</Td>
                  <Td className="text-sm capitalize text-muted-foreground">{r.document.type}</Td>
                  <Td className="text-sm text-muted-foreground">{formatDate(r.document.date)}</Td>
                  <Td className="tabular text-sm text-muted-foreground">{humanSize(r.document.sizeBytes)}</Td>
                  <Td>
                    <Badge variant={r.document.status === "available" ? "muted" : "warning"}>
                      {r.document.status}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
