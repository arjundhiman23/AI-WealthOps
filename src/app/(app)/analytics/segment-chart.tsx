"use client";

import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactINR } from "@/lib/format";

const COLORS: Record<string, string> = {
  Platinum: "var(--chart-1)",
  Gold: "var(--chart-3)",
  Silver: "var(--chart-2)",
  Emerging: "var(--chart-8)",
};

export function SegmentChart({ data }: { data: { segment: string; count: number; value: number }[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="segment" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `₹${compactINR(v)}`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value: number, name) => [
              name === "value" ? `₹${compactINR(value)}` : value,
              name === "value" ? "AUM" : "Clients",
            ]}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.segment} fill={COLORS[d.segment] ?? "var(--chart-8)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
