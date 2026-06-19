"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PuntoLinea = { x: string; y: number };

/** Gráfica de línea simple para evolución temporal (peso corporal, 1RM, etc.). */
export default function GraficaLinea({
  datos,
  unidad = "kg",
  color = "#34d399",
}: {
  datos: PuntoLinea[];
  unidad?: string;
  color?: string;
}) {
  if (datos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        Aún no hay datos para graficar.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="x" stroke="#737373" fontSize={12} tickMargin={8} />
          <YAxis
            stroke="#737373"
            fontSize={12}
            domain={["dataMin - 2", "dataMax + 2"]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #404040",
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: "#a3a3a3" }}
            formatter={(v) => [`${v} ${unidad}`, "Valor"]}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
