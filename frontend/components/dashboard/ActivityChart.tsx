"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { MonthlyActivity } from "@/lib/auth-api";
import { formatIDR } from "@/lib/formatCurrency";

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-1-green)",
  },
  expense: {
    label: "Expense",
    color: "var(--chart-4-red)",
  },
} satisfies ChartConfig;

export function ActivityChart({ data }: { data: MonthlyActivity[] }) {
  // Filter out empty data if preferred, or keep it to show months with 0 activity
  // For now, we display whatever the backend sends.

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dashed"
              valueFormatter={(value) => formatIDR(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
