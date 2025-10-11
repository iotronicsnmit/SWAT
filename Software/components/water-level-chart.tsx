"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

export type LevelPoint = { t: number; levelCm: number }

export function WaterLevelChart({ data }: { data: LevelPoint[] }) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-balance">Water Level History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => new Date(v).toLocaleTimeString()}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                dataKey="levelCm"
                tickFormatter={(v) => `${v} cm`}
                width={80}
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'cm', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(v) => new Date(v).toLocaleString()}
                formatter={(value: number) => [`${value.toFixed(2)} cm`, 'Level']}
              />
              <Line
                type="monotone"
                dataKey="levelCm"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
