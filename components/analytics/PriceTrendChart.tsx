"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/utils";
import type { SerieTienda } from "@/lib/analytics";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Gráfico de línea: precio normal (línea sólida) y precio oferta (línea
 * punteada) en el tiempo, una serie por tienda. Cada `<Line>` recibe su
 * propio `data` (los puntos reales de esa tienda, en su propio orden
 * cronológico) en vez de compartir el `data` del chart — así una tienda con
 * pocas compras no queda "conectada" a través de fechas donde no compró
 * nada. El `data` a nivel del LineChart solo fija el orden del eje X.
 */
export function PriceTrendChart({
  fechas,
  series,
}: {
  fechas: { fecha: string }[];
  series: SerieTienda[];
}) {
  if (series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Todavía no hay compras registradas de este producto.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={fechas} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
          <XAxis
            dataKey="fecha"
            type="category"
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fontSize: 11, fill: "var(--viz-text-muted)" }}
            stroke="var(--viz-axis)"
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            width={60}
            tick={{ fontSize: 11, fill: "var(--viz-text-muted)" }}
            tickFormatter={(value: number) => `$${Math.round(value).toLocaleString("es-AR")}`}
            stroke="var(--viz-axis)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--viz-text-secondary)" }}
            iconType="plainline"
          />
          {series.flatMap((serie) => {
            const lineas = [
              <Line
                key={`${serie.nombre}-normal`}
                data={serie.puntos}
                dataKey="precio_normal"
                name={`${serie.nombre} · normal`}
                stroke={serie.color}
                strokeWidth={2}
                dot={{ r: 4, fill: serie.color, stroke: "var(--background)", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />,
            ];
            if (serie.tieneOferta) {
              lineas.push(
                <Line
                  key={`${serie.nombre}-oferta`}
                  data={serie.puntos}
                  dataKey="precio_oferta"
                  name={`${serie.nombre} · oferta`}
                  stroke={serie.color}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: serie.color, stroke: "var(--background)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            }
            return lineas;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
