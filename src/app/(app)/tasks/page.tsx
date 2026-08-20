import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ListChecks } from "lucide-react";
import { db } from "@/server/db";
import { clients, tasks, users } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { EmptyState, Panel, PageHeader } from "@/components/ui/primitives";
import { TaskFilters } from "./task-filters";
import { TaskRow } from "./task-row";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const p = await searchParams;
  const status = one(p.status) ?? "open";
  const owner = one(p.owner) ?? (user.role === "rm" ? "mine" : "all");
  const priority = one(p.priority);

  const conditions = [];
  if (status !== "all") {
    conditions.push(status === "open" ? inArray(tasks.status, ["open", "in_progress"]) : eq(tasks.status, status));
  }
  if (owner === "mine") conditions.push(eq(tasks.ownerId, user.id));
  else if (owner !== "all") conditions.push(eq(tasks.ownerId, owner));
  if (priority && priority !== "all") conditions.push(eq(tasks.priority, priority));

  const [rows, rmRows] = await Promise.all([
    db
      .select({ task: tasks, clientName: clients.name, ownerName: users.name })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(users, eq(tasks.ownerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt)),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
  ]);

  const rms = rmRows.filter((r) => r.id.startsWith("u-rm"));

  return (
    <div className="space-y-5">
      <PageHeader title="Tasks" description={`${rows.length} task${rows.length === 1 ? "" : "s"} in this view`} />
      <TaskFilters rms={rms} defaultOwner={owner} />

      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-5" />}
            title="Nothing here"
            description="Adjust the filters, or create a follow-up from a client's page."
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <TaskRow
                key={row.task.id}
                id={row.task.id}
                title={row.task.title}
                description={row.task.description}
                priority={row.task.priority}
                status={row.task.status}
                dueDate={row.task.dueDate}
                clientId={row.task.clientId}
                clientName={row.clientName}
                ownerName={row.ownerName}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
