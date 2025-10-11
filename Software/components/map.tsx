"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2, Navigation } from "lucide-react"

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyC8YGRQfeV9Sq_xDmwUzMd1asfbj9BgeDc"

type TankerLocation = {
  lat: number
  lon: number
  id: string
  percent: number
}

type MapProps = {
  lat?: number
  lon?: number
  path: Array<{ lat: number; lon: number }>
  tankers?: TankerLocation[]
  trackingMode?: boolean // For individual tanker tracking in detail view
}

function getMarkerColor(waterLevel: number): string {
  if (waterLevel >= 75) return "#22c55e" // green - full
  if (waterLevel >= 50) return "#3b82f6" // blue - good
  if (waterLevel >= 25) return "#f59e0b" // orange - warning
  return "#ef4444" // red - critical
}

// Generate unique color for each tanker based on ID
function getTankerColor(tankerId: string): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // orange
    "#10b981", // green
    "#06b6d4", // cyan
    "#f43f5e", // rose
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f97316", // orange-2
  ]
  
  // Use tanker ID to consistently pick a color
  const hash = tankerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Create compact, professional marker with tanker ID
function createTankerMarkerIcon(tankerId: string, color: string, percent: number): string {
  const statusColor = getMarkerColor(percent)
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
        </filter>
      </defs>
      
      <!-- Outer circle with status color ring -->
      <circle cx="30" cy="30" r="28" fill="white" stroke="${statusColor}" stroke-width="3" filter="url(#shadow)"/>
      
      <!-- Inner circle with tanker color -->
      <circle cx="30" cy="30" r="24" fill="${color}"/>
      
      <!-- Truck icon -->
      <g transform="translate(15, 18)">
        <!-- Truck body -->
        <rect x="0" y="4" width="12" height="8" rx="1" fill="white" opacity="0.9"/>
        <!-- Truck cabin -->
        <rect x="12" y="2" width="8" height="10" rx="1" fill="white"/>
        <!-- Tank -->
        <ellipse cx="6" cy="8" rx="5" ry="3" fill="white" opacity="0.7"/>
        <!-- Wheels -->
        <circle cx="4" cy="12" r="2" fill="white"/>
        <circle cx="16" cy="12" r="2" fill="white"/>
      </g>
      
      <!-- Tanker ID badge at bottom -->
      <rect x="10" y="48" width="40" height="10" rx="5" fill="white" filter="url(#shadow)"/>
      <text x="30" y="56" font-family="Arial, sans-serif" font-size="8" font-weight="bold" 
            text-anchor="middle" fill="${color}">${tankerId}</text>
    </svg>
  `)}`
}

export function TankerMap({ lat, lon, path, tankers, trackingMode = false }: MapProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: MAPS_API_KEY,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [userInteracted, setUserInteracted] = useState(false)
  const [routePath, setRoutePath] = useState<google.maps.LatLng[]>([])
  const lastBoundsUpdate = useRef<number>(0)
  const hasInitialized = useRef(false)
  const lastPathLength = useRef<number>(0)

  // Calculate bounds for all tankers
  const calculateBounds = useCallback(() => {
    if (!tankers || tankers.length === 0) {
      if (lat != null && lon != null) {
        return { center: { lat, lng: lon }, zoom: 13 }
      }
      return { center: { lat: 12.9716, lng: 77.5946 }, zoom: 5 }
    }

    // For single tanker, use fixed zoom instead of bounds
    if (tankers.length === 1) {
      return { 
        center: { lat: tankers[0].lat, lng: tankers[0].lon }, 
        zoom: 13 // Reasonable zoom level for single tanker
      }
    }

    // For multiple tankers, calculate bounds
    const bounds = new google.maps.LatLngBounds()
    tankers.forEach(tanker => {
      bounds.extend({ lat: tanker.lat, lng: tanker.lon })
    })

    return { bounds }
  }, [tankers, lat, lon])

  // Auto-fit bounds when tankers change (industry standard behavior)
  useEffect(() => {
    if (!map || !isLoaded) return

    const now = Date.now()
    const timeSinceLastUpdate = now - lastBoundsUpdate.current

    // Tracking mode: Always follow the tanker (for detail view)
    if (trackingMode && lat != null && lon != null) {
      const currentBounds = map.getBounds()
      const tankerPos = { lat, lng: lon }
      
      // Check if tanker is out of view or first load
      if (!hasInitialized.current || !currentBounds?.contains(tankerPos)) {
        map.setCenter(tankerPos)
        if (!hasInitialized.current) {
          map.setZoom(13)
        }
        lastBoundsUpdate.current = now
        hasInitialized.current = true
      }
      return
    }

    // Fleet mode: Industry standard behavior
    // Auto-fit if:
    // 1. First load (not initialized)
    // 2. User hasn't interacted in last 30 seconds
    // 3. A tanker goes out of view
    const shouldAutoFit = !hasInitialized.current || 
                          (!userInteracted && timeSinceLastUpdate > 30000)

    if (shouldAutoFit && tankers && tankers.length > 0) {
      const { bounds, center, zoom } = calculateBounds()
      
      if (bounds) {
        // Check if any tanker is out of current view
        const currentBounds = map.getBounds()
        const anyOutOfView = tankers.some(tanker => 
          !currentBounds?.contains({ lat: tanker.lat, lng: tanker.lon })
        )

        if (!hasInitialized.current || anyOutOfView) {
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
          lastBoundsUpdate.current = now
          hasInitialized.current = true
        }
      } else if (center && zoom) {
        // Single tanker - use center and zoom
        if (!hasInitialized.current) {
          map.setCenter(center)
          map.setZoom(zoom)
          lastBoundsUpdate.current = now
          hasInitialized.current = true
        }
      }
    }
  }, [map, tankers, calculateBounds, userInteracted, isLoaded, trackingMode, lat, lon])

  // Track user interaction (industry standard)
  useEffect(() => {
    if (!map) return

    const listeners = [
      google.maps.event.addListener(map, 'dragstart', () => setUserInteracted(true)),
      google.maps.event.addListener(map, 'zoom_changed', () => setUserInteracted(true)),
    ]

    // Reset user interaction after 2 minutes of inactivity
    const resetTimer = setTimeout(() => setUserInteracted(false), 120000)

    return () => {
      listeners.forEach(listener => google.maps.event.removeListener(listener))
      clearTimeout(resetTimer)
    }
  }, [map])

  // Recenter to fit all tankers
  const handleRecenter = useCallback(() => {
    if (!map) return
    const { bounds, center, zoom } = calculateBounds()
    if (bounds) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    } else if (center && zoom) {
      map.setCenter(center)
      map.setZoom(zoom)
    }
    setUserInteracted(false)
    lastBoundsUpdate.current = Date.now()
  }, [map, calculateBounds])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Build road-snapped route from GPS points (Industry Standard)
  useEffect(() => {
    if (!isLoaded || path.length < 2) {
      setRoutePath([])
      return
    }

    // Industry Standard: Snap to Roads API for accurate path
    // This is what Uber, Lyft, and fleet tracking apps use
    const snapToRoads = async () => {
      try {
        // Group points into chunks (max 100 points per request for Snap to Roads API)
        const chunkSize = 100
        const allSnappedPoints: google.maps.LatLng[] = []

        for (let i = 0; i < path.length; i += chunkSize) {
          const chunk = path.slice(i, Math.min(i + chunkSize, path.length))
          
          // Build path string for API
          const pathString = chunk.map(p => `${p.lat},${p.lon}`).join('|')
          
          // Call Snap to Roads API
          const response = await fetch(
            `https://roads.googleapis.com/v1/snapToRoads?path=${pathString}&interpolate=true&key=${MAPS_API_KEY}`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data.snappedPoints) {
              const snapped = data.snappedPoints.map((point: any) => 
                new google.maps.LatLng(point.location.latitude, point.location.longitude)
              )
              allSnappedPoints.push(...snapped)
            }
          } else {
            console.warn('[Map] Snap to Roads API failed for chunk, using original points')
            allSnappedPoints.push(...chunk.map(p => new google.maps.LatLng(p.lat, p.lon)))
          }
        }

        if (allSnappedPoints.length > 0) {
          setRoutePath(allSnappedPoints)
        } else {
          // Fallback to original path
          setRoutePath(path.map(p => new google.maps.LatLng(p.lat, p.lon)))
        }
      } catch (error) {
        console.warn('[Map] Road snapping failed, using original path:', error)
        setRoutePath(path.map(p => new google.maps.LatLng(p.lat, p.lon)))
      }
    }

    snapToRoads()
  }, [path, isLoaded])

  const poly = path.map((p) => ({ lat: p.lat, lng: p.lon }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-balance">Water Tanker Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                gestureHandling: 'greedy', // Industry standard for fleet tracking
                // Hide POI (points of interest) labels and business markers
                styles: [
                  {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                  },
                  {
                    featureType: "poi.business",
                    stylers: [{ visibility: "off" }]
                  },
                  {
                    featureType: "transit",
                    elementType: "labels.icon",
                    stylers: [{ visibility: "off" }]
                  }
                ]
              }}
            >
              {/* Multiple tankers - force re-render with position in key */}
              {tankers && tankers.map((tanker) => {
                const tankerColor = getTankerColor(tanker.id)
                // Include position and percent in key to force re-render on changes
                const markerKey = `${tanker.id}-${tanker.lat.toFixed(6)}-${tanker.lon.toFixed(6)}-${tanker.percent}`
                return (
                  <Marker
                    key={markerKey}
                    position={{ lat: tanker.lat, lng: tanker.lon }}
                    title={`${tanker.id} - ${tanker.percent}%`}
                    icon={{
                      url: createTankerMarkerIcon(tanker.id, tankerColor, tanker.percent),
                      scaledSize: new google.maps.Size(60, 60),
                      anchor: new google.maps.Point(30, 30),
                    }}
                  />
                )
              })}

              {/* Single tanker with path - force re-render with key */}
              {!tankers && lat != null && lon != null && (
                <Marker 
                  key={`${lat}-${lon}`}
                  position={{ lat, lng: lon }} 
                  title="Water Tanker"
                  icon={{
                    url: createTankerMarkerIcon("TK-001", "#3b82f6", 50),
                    scaledSize: new google.maps.Size(60, 60),
                    anchor: new google.maps.Point(30, 30),
                  }}
                />
              )}
              {/* Show road-snapped route - force re-render with key */}
              {routePath.length >= 2 && (
                <Polyline 
                  key={`route-${routePath.length}`}
                  path={routePath} 
                  options={{ 
                    strokeColor: "#0ea5e9", 
                    strokeOpacity: 0.8, 
                    strokeWeight: 4,
                    geodesic: true
                  }} 
                />
              )}
              
              {/* Show waypoint markers for path */}
              {path.length > 0 && trackingMode && (
                <>
                  {/* Start marker */}
                  <Marker
                    key="start-marker"
                    position={{ lat: path[0].lat, lng: path[0].lon }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: "#22c55e",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                    }}
                    title="Start"
                  />
                  {/* Intermediate waypoints every 10 points */}
                  {path.filter((_, i) => i > 0 && i < path.length - 1 && i % 10 === 0).map((point, idx) => (
                    <Marker
                      key={`waypoint-${idx}`}
                      position={{ lat: point.lat, lng: point.lon }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: "#0ea5e9",
                        fillOpacity: 0.7,
                        strokeColor: "#ffffff",
                        strokeWeight: 1,
                      }}
                      title={`Waypoint ${idx + 1}`}
                    />
                  ))}
                  {/* End marker (current position) is already shown as main marker */}
                </>
              )}
            </GoogleMap>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">{"Loading map..."}</div>
          )}

          {/* Map Controls */}
          {!trackingMode && (
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                onClick={handleRecenter}
                size="sm"
                variant="secondary"
                className="bg-card/95 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
                title="Recenter map to show all tankers"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fit All
              </Button>
            </div>
          )}
          
          {/* Tracking mode indicator */}
          {trackingMode && lat != null && lon != null && (
            <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm border border-primary rounded-lg px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <Navigation className="h-4 w-4 animate-pulse" />
                Tracking Mode
              </div>
            </div>
          )}

          {/* Legend */}
          {tankers && tankers.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-h-[400px] overflow-y-auto">
              <p className="text-xs font-semibold mb-2">Active Tankers ({tankers.length})</p>
              <div className="space-y-2">
                {tankers.map((tanker) => (
                  <div key={tanker.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border-2 border-white" 
                      style={{ backgroundColor: getTankerColor(tanker.id) }}
                    ></div>
                    <span className="text-xs font-medium">{tanker.id}</span>
                    <span className={`text-xs ml-auto font-semibold ${
                      tanker.percent >= 75 ? "text-status-full" :
                      tanker.percent >= 50 ? "text-status-good" :
                      tanker.percent >= 25 ? "text-status-warning" :
                      "text-status-critical"
                    }`}>
                      {tanker.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
