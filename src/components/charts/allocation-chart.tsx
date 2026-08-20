"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export function AllocationChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (!data.length) return null;

  return (
    <div className="relative">
      <div className="h-[180px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}%`, name]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="tabular font-medium text-foreground">{d.value.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
