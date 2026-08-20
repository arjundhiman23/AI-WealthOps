import { Badge, type BadgeVariant } from "./primitives";
import { BAND_LABEL, BAND_VARIANT, type PriorityBand } from "@/services/priority/engine";

export function PriorityBadge({ band, score }: { band: string; score?: number }) {
  const key = (["critical", "high", "medium", "low"].includes(band) ? band : "low") as PriorityBand;
  return (
    <Badge variant={BAND_VARIANT[key] as BadgeVariant}>
      {BAND_LABEL[key]}
      {score !== undefined && <span className="tabular opacity-70">{score}</span>}
    </Badge>
  );
}

export function SegmentBadge({ segment }: { segment: string }) {
  const variant: BadgeVariant =
    segment === "Platinum" ? "brand" : segment === "Gold" ? "warning" : segment === "Silver" ? "info" : "muted";
  return <Badge variant={variant}>{segment}</Badge>;
}
