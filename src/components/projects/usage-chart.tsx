"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DayCount {
  day: string;
  count: number;
}

export function UsageChart({ data }: { data: DayCount[] }) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No searches in the last 30 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v) => [v ?? 0, "Searches"] as [number, string]}
        />
        <Bar dataKey="count" className="fill-primary" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
