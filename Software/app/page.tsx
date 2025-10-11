"use client"

import useSWRSubscription from "swr/subscription"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Droplets, Search, Filter, MapPin, Gauge } from "lucide-react"
import { TankerMap } from "@/components/map"
import { TankerCard } from "@/components/tanker-card"
import { TankerDetailDialog } from "@/components/tanker-detail-dialog"
import { WaterLevelGauge } from "@/components/water-level-gauge"
import { WaterLevelChart, type LevelPoint } from "@/components/water-level-chart"
import { TamperNotifications } from "@/components/tamper-notifications"
import { EmailLogs } from "@/components/email-logs"

type TankerState = {
  id: string
  ts: number
  lat?: number
  lon?: number
  distanceCm?: number
}

type StreamMsg =
  | { type: "ready" }
  | { type: "snapshot"; tankers: TankerState[] }
  | {
      type: "mqtt"
      ts: number
      tankerId: string
      lat?: number
      lon?: number
      distanceCm?: number
      topic?: string
    }

const MAX_POINTS = 200
const TANK_DEPTH_CM = Number(process.env.NEXT_PUBLIC_TANKER_DEPTH_CM || 200)

function computeLevelCm(distanceCm?: number) {
  if (distanceCm == null) return undefined
  const level = Math.max(0, Math.min(TANK_DEPTH_CM, TANK_DEPTH_CM - distanceCm))
  return level
}

type TankerData = {
  id: string
  name: string
  lat?: number
  lon?: number
  distanceCm?: number
  levelCm?: number
  percent: number
  points: LevelPoint[]
  path: Array<{ lat: number; lon: number }>
  lastUpdate: number
}

export default function Page() {
  const [tankers, setTankers] = useState<Map<string, TankerData>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<string>("Connecting...")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTanker, setSelectedTanker] = useState<TankerData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useSWRSubscription<StreamMsg>("/api/stream", (key, { next }) => {
    const es = new EventSource(key)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as StreamMsg
        console.log("[Frontend] Received data:", data)
        
        if (data.type === "ready") {
          setConnectionStatus("Connected")
        } else if (data.type === "snapshot") {
          setConnectionStatus("Receiving data")
          // Initialize all tankers from snapshot
          const newTankers = new Map<string, TankerData>()
          data.tankers.forEach((t) => {
            const levelCm = computeLevelCm(t.distanceCm)
            const percent = levelCm != null ? Math.round((levelCm / TANK_DEPTH_CM) * 100) : 0
            newTankers.set(t.id, {
              id: t.id,
              name: `Tanker ${t.id}`,
              lat: t.lat,
              lon: t.lon,
              distanceCm: t.distanceCm,
              levelCm,
              percent,
              points: [],
              path: t.lat != null && t.lon != null ? [{ lat: t.lat, lon: t.lon }] : [],
              lastUpdate: t.ts,
            })
          })
          setTankers(newTankers)
        } else if (data.type === "mqtt") {
          setConnectionStatus("Receiving data")
          setTankers((prev) => {
            const newTankers = new Map(prev)
            const existing = newTankers.get(data.tankerId) || {
              id: data.tankerId,
              name: `Tanker ${data.tankerId}`,
              percent: 0,
              points: [],
              path: [],
              lastUpdate: data.ts,
            }

            if (data.lat != null && data.lon != null) {
              existing.lat = data.lat
              existing.lon = data.lon
              existing.path = [...existing.path, { lat: data.lat, lon: data.lon }].slice(-500)
            }

            if (data.distanceCm != null) {
              existing.distanceCm = data.distanceCm
              const levelCm = computeLevelCm(data.distanceCm)
              if (levelCm != null) {
                existing.levelCm = levelCm
                existing.percent = Math.round((levelCm / TANK_DEPTH_CM) * 100)
                existing.points = [...existing.points, { t: data.ts, levelCm }].slice(-MAX_POINTS)
              }
            }

            existing.lastUpdate = data.ts
            newTankers.set(data.tankerId, existing)
            return newTankers
          })
        }
        next(null, data)
      } catch (e) {
        console.error("[Frontend] Parse error:", e)
      }
    }
    es.onerror = () => {
      setConnectionStatus("Connection error")
      es.close()
    }
    return () => es.close()
  })

  const tankersArray = Array.from(tankers.values())
  const filteredTankers = tankersArray.filter(
    (tanker) =>
      tanker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tanker.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isActive = connectionStatus === "Receiving data" || connectionStatus === "Connected"
  const activeTankers = tankersArray.filter((t) => Date.now() - t.lastUpdate < 60000).length
  const inactiveTankers = tankersArray.length - activeTankers
  const averageLevel = tankersArray.length > 0
    ? Math.round(tankersArray.reduce((sum, t) => sum + t.percent, 0) / tankersArray.length)
    : 0
  const lowCount = tankersArray.filter((t) => t.percent >= 25 && t.percent < 50).length
  const criticalCount = tankersArray.filter((t) => t.percent < 25).length

  const handleTankerClick = (tankerId: string) => {
    const tanker = tankers.get(tankerId)
    if (tanker) {
      setSelectedTanker({
        ...tanker,
        waterLevel: tanker.percent,
        latitude: tanker.lat,
        longitude: tanker.lon,
        capacity: TANK_DEPTH_CM * 100,
        tankDepth: TANK_DEPTH_CM,
        sensorDistance: tanker.distanceCm,
      } as any)
      setIsDialogOpen(true)
    }
  }

  // Get all tanker locations for the map
  const allTankerLocations = tankersArray
    .filter((t) => t.lat != null && t.lon != null)
    .map((t) => ({ lat: t.lat!, lon: t.lon!, id: t.id, percent: t.percent }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                <Droplets className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  SWAT
                </h1>
                <p className="text-sm text-muted-foreground">Smart Water Asset Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tankers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-secondary/50 border-border"
                />
              </div>
              <Button variant="outline" size="icon" className="border-border">
                <Filter className="h-4 w-4" />
              </Button>
              <TamperNotifications />
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Tankers</p>
              <p className="text-2xl font-bold text-foreground">{tankersArray.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-status-good">{activeTankers}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Inactive</p>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveTankers}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Average Level</p>
              <p className="text-2xl font-bold text-primary">{averageLevel}%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border border-status-warning/30">
              <p className="text-sm text-muted-foreground mb-1">Low</p>
              <p className="text-2xl font-bold text-status-warning">{lowCount}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-card to-secondary/50 border border-border border-status-critical/30">
              <p className="text-sm text-muted-foreground mb-1">Critical</p>
              <p className="text-2xl font-bold text-status-critical">{criticalCount}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Map and Tanker List Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Map - Takes 4 columns */}
          <div className="lg:col-span-4">
            <Card className="border-border overflow-hidden h-full">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Fleet Location Map</h2>
                </div>
                <TankerMap 
                  lat={allTankerLocations[0]?.lat} 
                  lon={allTankerLocations[0]?.lon} 
                  path={[]}
                  tankers={allTankerLocations}
                />
              </div>
            </Card>
          </div>

          {/* Tanker List - Takes 1 column */}
          <div className="lg:col-span-1">
            <Card className="border-border h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Active Tankers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {tankersArray.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tankers connected
                    </div>
                  ) : (
                    tankersArray.map((tanker) => {
                      const isOnline = Date.now() - tanker.lastUpdate < 60000
                      return (
                        <div
                          key={tanker.id}
                          onClick={() => handleTankerClick(tanker.id)}
                          className="p-4 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer group"
                        >
                          {/* Tanker Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: isOnline ? '#22c55e' : '#6b7280',
                                  boxShadow: isOnline ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none'
                                }}
                              />
                              <span className="font-semibold text-foreground">{tanker.id}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isOnline 
                                ? 'bg-status-good/20 text-status-good' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {/* Water Level Bar */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Water Level</span>
                              <span className={`font-semibold ${
                                tanker.percent >= 75 ? 'text-status-full' :
                                tanker.percent >= 50 ? 'text-status-good' :
                                tanker.percent >= 25 ? 'text-status-warning' :
                                'text-status-critical'
                              }`}>
                                {tanker.percent}%
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  width: `${tanker.percent}%`,
                                  backgroundColor: 
                                    tanker.percent >= 75 ? 'hsl(142, 76%, 36%)' :
                                    tanker.percent >= 50 ? 'hsl(142, 71%, 45%)' :
                                    tanker.percent >= 25 ? 'hsl(45, 93%, 47%)' :
                                    'hsl(0, 84%, 60%)'
                                }}
                              />
                            </div>
                          </div>

                          {/* Location Info */}
                          {tanker.lat != null && tanker.lon != null && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">
                                {tanker.lat.toFixed(4)}, {tanker.lon.toFixed(4)}
                              </span>
                            </div>
                          )}

                          {/* Last Update */}
                          <div className="text-xs text-muted-foreground mt-2">
                            Updated: {new Date(tanker.lastUpdate).toLocaleTimeString()}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tanker Grid */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-4">Tanker Fleet Overview</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredTankers.map((tanker, index) => (
            <div 
              key={tanker.id} 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <TankerCard
                id={tanker.id}
                name={tanker.name}
                waterLevel={tanker.percent}
                latitude={tanker.lat}
                longitude={tanker.lon}
                capacity={TANK_DEPTH_CM * 100}
                lastUpdate={new Date(tanker.lastUpdate).toLocaleTimeString()}
                isActive={Date.now() - tanker.lastUpdate < 60000}
                onClick={() => handleTankerClick(tanker.id)}
              />
            </div>
          ))}
        </div>

        {filteredTankers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tankers found matching your search.</p>
          </div>
        )}

        {/* Email Logs */}
        <EmailLogs />
      </main>

      {/* Detail Dialog */}
      <TankerDetailDialog
        tanker={selectedTanker}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
