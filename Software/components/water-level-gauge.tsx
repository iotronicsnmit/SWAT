"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets } from "lucide-react"

interface WaterLevelGaugeProps {
  level: number
  capacity: number
}

export function WaterLevelGauge({ level, capacity }: WaterLevelGaugeProps) {
  const currentVolume = Math.round((level / 100) * capacity)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-600" />
          Water Level
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
            <div 
              className="absolute bottom-0 w-full bg-blue-500 transition-all duration-500"
              style={{ height: `${level}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600 to-blue-400" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-700 mix-blend-difference">
                {level}%
              </span>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current: {currentVolume}L</span>
            <span className="text-gray-600">Capacity: {capacity}L</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
