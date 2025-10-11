"use client"
import { Droplets } from "lucide-react"

type GaugeProps = {
  percent: number // 0 - 100
  depthCm: number
  distanceCm?: number
}

export function WaterLevelGauge({ percent, depthCm, distanceCm }: GaugeProps) {
  const p = Math.max(0, Math.min(100, percent))

  const getStatusColor = () => {
    if (p >= 75) return "hsl(142, 76%, 36%)" // status-full
    if (p >= 50) return "hsl(142, 71%, 45%)" // status-good
    if (p >= 25) return "hsl(45, 93%, 47%)" // status-warning
    return "hsl(0, 84%, 60%)" // status-critical
  }

  const getStatusText = () => {
    if (p >= 75) return "Full"
    if (p >= 50) return "Good"
    if (p >= 25) return "Low"
    return "Critical"
  }

  const getStatusClass = () => {
    if (p >= 75) return "text-status-full"
    if (p >= 50) return "text-status-good"
    if (p >= 25) return "text-status-warning"
    return "text-status-critical"
  }

  const getBgClass = () => {
    if (p >= 75) return "bg-status-full/20 border-status-full/30"
    if (p >= 50) return "bg-status-good/20 border-status-good/30"
    if (p >= 25) return "bg-status-warning/20 border-status-warning/30"
    return "bg-status-critical/20 border-status-critical/30"
  }

  const statusColor = getStatusColor()
  const statusText = getStatusText()
  const statusClass = getStatusClass()
  const bgClass = getBgClass()

  const circumference = 2 * Math.PI * 72 // radius of 72 (45% of 160)
  const offset = circumference * (1 - p / 100)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-40 w-40 relative">
        {/* Circular progress background */}
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="72"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="80"
            cy="80"
            r="72"
            stroke={statusColor}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${statusColor})`,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Droplets 
            className={`h-8 w-8 mb-1 animate-pulse-glow ${statusClass}`}
          />
          <span className="text-3xl font-bold">{Math.round(p)}%</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Water</span>
        </div>
      </div>
      
      {/* Status badge */}
      <div className={`px-4 py-1.5 rounded-full border ${bgClass}`}>
        <span className={`text-sm font-semibold ${statusClass}`}>{statusText}</span>
      </div>
    </div>
  )
}
