"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui/primitives";

/** Filters are held in the URL so a demo can be reloaded or shared mid-flow. */
export function ClientFilters({ rms }: { rms: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");

  useEffect(() => {
    setSearch(params.get("search") ?? "");
  }, [params]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/clients?${next.toString()}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update("search", search.trim());
  };

  const hasFilters = ["search", "segment", "rmId", "band"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={submitSearch} className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city"
          className="pl-9"
          aria-label="Search clients"
        />
      </form>

      <Select
        value={params.get("segment") ?? "all"}
        onChange={(e) => update("segment", e.target.value)}
        aria-label="Filter by segment"
      >
        <option value="all">All segments</option>
        <option value="Platinum">Platinum</option>
        <option value="Gold">Gold</option>
        <option value="Silver">Silver</option>
        <option value="Emerging">Emerging</option>
      </Select>

      <Select
        value={params.get("band") ?? "all"}
        onChange={(e) => update("band", e.target.value)}
        aria-label="Filter by priority"
      >
        <option value="all">Any priority</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>

      <Select
        value={params.get("rmId") ?? "all"}
        onChange={(e) => update("rmId", e.target.value)}
        aria-label="Filter by relationship manager"
      >
        <option value="all">All managers</option>
        {rms.map((rm) => (
          <option key={rm.id} value={rm.id}>
            {rm.name}
          </option>
        ))}
      </Select>

      <Select
        value={params.get("sort") ?? "priority"}
        onChange={(e) => update("sort", e.target.value)}
        aria-label="Sort clients"
      >
        <option value="priority">Sort: priority</option>
        <option value="value">Sort: portfolio value</option>
        <option value="lastContact">Sort: longest since contact</option>
        <option value="name">Sort: name</option>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
