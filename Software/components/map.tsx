"use client"

import { useEffect, useState } from "react"
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

const mapContainerStyle = {
  width: '100%',
  height: '400px'
}

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
}

export function Map() {
  const [position, setPosition] = useState(defaultCenter)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Live Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={position}
            zoom={13}
          >
            <Marker position={position} />
          </GoogleMap>
        </LoadScript>
      </CardContent>
    </Card>
  )
}
