"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GastoItem } from "@/lib/analytics";
import { ChartTooltip } from "./ChartTooltip";

/** Barra horizontal ≤24px, extremo redondeado — ver skill dataviz, marks-and-anatomy.md. */
const GROSOR_BARRA = 24;

export function SpendBarChart({
  data,
  emptyLabel,
}: {
  data: GastoItem[];
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>;
  }

  const alto = Math.max(72, data.length * 40);

  return (
    <div className="w-full" style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--viz-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => `Q ${Math.round(value).toLocaleString("es-GT")}`}
            tick={{ fontSize: 11, fill: "var(--viz-text-muted)" }}
            stroke="var(--viz-axis)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fontSize: 11, fill: "var(--viz-text-secondary)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--viz-grid)" }} />
          <Bar
            dataKey="total"
            name="Gasto"
            radius={[0, 4, 4, 0]}
            maxBarSize={GROSOR_BARRA}
            isAnimationActive={false}
          >
            {data.map((item) => (
              <Cell key={item.label} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
