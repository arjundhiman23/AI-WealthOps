/** Indian-market formatting helpers. All amounts are INR. */

export function formatINR(value: number | string, opts?: { compact?: boolean }): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  if (opts?.compact) return `₹${compactINR(n)}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Lakh / crore shorthand, the way Indian wealth desks actually write figures. */
export function compactINR(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return n.toFixed(0);
}

export function formatNumber(value: number | string, decimals = 0): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPct(value: number | string | null, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function daysSince(date: Date | string | null): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function relativeDays(date: Date | string | null): string {
  const d = daysSince(date);
  if (d === null) return "never";
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} mo ago`;
  return `${Math.floor(d / 365)} yr ago`;
}

export function dueLabel(date: Date | string | null): { label: string; tone: "danger" | "warning" | "muted" } {
  if (!date) return { label: "No due date", tone: "muted" };
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, tone: "danger" };
  if (diff === 0) return { label: "Due today", tone: "warning" };
  if (diff <= 3) return { label: `Due in ${diff}d`, tone: "warning" };
  return { label: `Due ${formatDate(d)}`, tone: "muted" };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
