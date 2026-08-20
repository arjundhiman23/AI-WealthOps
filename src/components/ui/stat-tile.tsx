"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./primitives";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  format,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: (n: number) => string;
}) {
  const animated = useCountUp(value);
  const text = format ? format(animated) : animated.toFixed(decimals);
  return (
    <span className="tabular">
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

export function Sparkline({
  data,
  color = "var(--brand)",
  width = 76,
  height = 26,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Delta({ value, invert }: { value: number; invert?: boolean }) {
  const positive = value >= 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-success" : "text-danger")}>
      <Icon className="size-3.5" />
      <span className="tabular">{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  displayValue,
  icon,
  iconColor = "var(--brand)",
  delta,
  deltaInvert,
  spark,
  sparkColor,
  footnote,
  prefix,
  suffix,
  decimals = 0,
  format,
  accent,
  className,
}: {
  label: string;
  value: number;
  displayValue?: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
  delta?: number;
  deltaInvert?: boolean;
  spark?: number[];
  sparkColor?: string;
  footnote?: ReactNode;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: (n: number) => string;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      {accent && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-foreground">
            {displayValue ?? (
              <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} format={format} />
            )}
          </div>
        </div>
        {icon && (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
              color: iconColor,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {delta !== undefined && <Delta value={delta} invert={deltaInvert} />}
          {footnote && <span className="truncate">{footnote}</span>}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} color={sparkColor ?? iconColor} width={76} height={26} />
        )}
      </div>
    </Card>
  );
}
