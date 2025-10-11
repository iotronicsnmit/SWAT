"use client"

import { useState } from "react"
import { MapPin, Gauge, ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { WaterLevelGauge } from "./water-level-gauge"

interface TankerCardProps {
  id: string
  name: string
  waterLevel: number
  latitude?: number
  longitude?: number
  capacity: number
  lastUpdate: string
  isActive: boolean
  onClick?: () => void
}

export function TankerCard({
  id,
  name,
  waterLevel,
  latitude,
  longitude,
  capacity,
  lastUpdate,
  isActive,
  onClick,
}: TankerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card 
      className="relative overflow-hidden bg-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(189,94%,43%,0.2)] cursor-pointer animate-scale-in group"
      onClick={onClick}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{name}</h3>
            <p className="text-sm text-muted-foreground">ID: {id}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-primary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-primary" />
            )}
          </button>
        </div>

        {/* Water Level Gauge */}
        <div className="flex justify-center my-6">
          <WaterLevelGauge percent={waterLevel} depthCm={200} />
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Gauge className="h-4 w-4" />
              <span className="text-xs">Capacity</span>
            </div>
            <p className="text-lg font-semibold">{capacity}L</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Status</span>
            </div>
            <p className={`text-lg font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {isActive ? "Active" : "Offline"}
            </p>
          </div>
        </div>

        {/* Expandable Section */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pt-4 border-t border-border space-y-3">
            {/* Coordinates */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS Coordinates
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Latitude:</span>
                  <p className="font-mono text-foreground font-medium">
                    {latitude != null ? latitude.toFixed(6) : "—"}°
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude:</span>
                  <p className="font-mono text-foreground font-medium">
                    {longitude != null ? longitude.toFixed(6) : "—"}°
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Volume:</span>
                <span className="font-semibold text-primary">
                  {Math.round((waterLevel / 100) * capacity)}L / {capacity}L
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium text-foreground">{lastUpdate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
