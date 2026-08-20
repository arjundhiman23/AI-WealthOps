"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/primitives";

export function TaskFilters({ rms, defaultOwner }: { rms: { id: string; name: string }[]; defaultOwner: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/tasks?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={params.get("status") ?? "open"} onChange={(e) => update("status", e.target.value)}>
        <option value="open">Open</option>
        <option value="done">Done</option>
        <option value="all">All statuses</option>
      </Select>
      <Select value={params.get("owner") ?? defaultOwner} onChange={(e) => update("owner", e.target.value)}>
        <option value="mine">My tasks</option>
        <option value="all">Everyone</option>
        {rms.map((rm) => (
          <option key={rm.id} value={rm.id}>{rm.name}</option>
        ))}
      </Select>
      <Select value={params.get("priority") ?? "all"} onChange={(e) => update("priority", e.target.value)}>
        <option value="all">Any priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
    </div>
  );
}
