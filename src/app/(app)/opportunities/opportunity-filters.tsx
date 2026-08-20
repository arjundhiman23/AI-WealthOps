"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/primitives";

export function OpportunityFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/opportunities?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={params.get("status") ?? "open"} onChange={(e) => update("status", e.target.value)}>
        <option value="open">Open</option>
        <option value="actioned">Actioned</option>
        <option value="dismissed">Dismissed</option>
        <option value="all">All statuses</option>
      </Select>
      <Select value={params.get("type") ?? "all"} onChange={(e) => update("type", e.target.value)}>
        <option value="all">All types</option>
        <option value="overdue_review">Overdue review</option>
        <option value="engagement_gap">Engagement gap</option>
        <option value="sip_inactive">SIP stopped</option>
        <option value="service_issue">Open service issue</option>
        <option value="goal_milestone">Goal milestone near</option>
      </Select>
    </div>
  );
}
