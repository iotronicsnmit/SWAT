"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TankerMap } from "@/components/map"
import { WaterLevelChart, type LevelPoint } from "@/components/water-level-chart"
import { Mail, MapPin, Activity } from "lucide-react"

interface TankerDetailDialogProps {
  tanker: {
    id: string
    name: string
    waterLevel: number
    latitude?: number
    longitude?: number
    capacity: number
    tankDepth: number
    sensorDistance?: number
    levelCm?: number
    path?: Array<{ lat: number; lon: number }>
    points?: LevelPoint[]
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TankerDetailDialog({ tanker, open, onOpenChange }: TankerDetailDialogProps) {
  if (!tanker) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {tanker.name} - Monitoring Dashboard
          </DialogTitle>
          <p className="text-sm text-muted-foreground">ID: {tanker.id}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Map */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Tanker Location</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <TankerMap
                  lat={tanker.latitude}
                  lon={tanker.longitude}
                  path={tanker.path || []}
                  trackingMode={true}
                />
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Water Level History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <WaterLevelChart data={tanker.points || []} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Live Sensor Data */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Live Sensor Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Latitude</p>
                    <p className="text-2xl font-bold">
                      {tanker.latitude != null ? tanker.latitude.toFixed(6) : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Longitude</p>
                    <p className="text-2xl font-bold">
                      {tanker.longitude != null ? tanker.longitude.toFixed(6) : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Distance (sensor → water)</p>
                    <p className="text-2xl font-bold">
                      {tanker.sensorDistance != null ? `${tanker.sensorDistance.toFixed(2)} cm` : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Level (from bottom)</p>
                    <p className="text-2xl font-bold">
                      {tanker.levelCm != null ? `${Math.round(tanker.levelCm)} cm` : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Water Level Details */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Water Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Center Display */}
                  <div className="flex flex-col items-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <p className={`text-xl font-bold mb-6 ${tanker.waterLevel >= 75 ? "text-status-full" :
                      tanker.waterLevel >= 50 ? "text-status-good" :
                        tanker.waterLevel >= 25 ? "text-status-warning" :
                          "text-status-critical"
                      }`}>
                      {tanker.waterLevel >= 75 ? "Full" :
                        tanker.waterLevel >= 50 ? "Good" :
                          tanker.waterLevel >= 25 ? "Low" : "Critical"}
                    </p>

                    <div className="relative">
                      <div className="text-7xl font-bold">{tanker.waterLevel}%</div>
                      <p className="text-sm text-muted-foreground text-center mt-2">of capacity</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tank depth (cm)</span>
                      <span className="font-semibold text-xl">{tanker.tankDepth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sensor distance (cm)</span>
                      <span className="font-semibold text-xl">
                        {tanker.sensorDistance != null ? tanker.sensorDistance.toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Alert Log */}
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Email Alert Log</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No alerts for this tanker yet.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
