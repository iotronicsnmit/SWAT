# Multi-Tanker Implementation Guide

## Overview
The SWAT dashboard now supports multiple water tankers with real-time tracking, water level monitoring, and individual tanker detail views.

## MQTT Topic Structure

### Topic Pattern
Each tanker uses two MQTT topics:
- `{TANKER_ID}/gps` - GPS coordinates
- `{TANKER_ID}/distance` - Ultrasonic sensor distance measurement

### Example Topics
- `T001/gps` - GPS data for Tanker T001
- `T001/distance` - Distance sensor data for Tanker T001
- `T002/gps` - GPS data for Tanker T002
- `T002/distance` - Distance sensor data for Tanker T002

### Message Formats

#### GPS Topic (`T001/gps`)
```json
{
  "lat": 12.9716,
  "lon": 77.5946
}
```

#### Distance Topic (`T001/distance`)
```
68.5
```
(Plain number in centimeters)

## Features

### 1. Fleet Overview Dashboard
- **Stats Cards**: Total tankers, active/inactive count, average water level, low/critical alerts
- **Search & Filter**: Search tankers by ID or name
- **Fleet Map**: All tankers displayed on a single map with color-coded markers
- **Tanker Cards**: Grid view of all tankers with expandable details

### 2. Color-Coded Status
Tankers are color-coded based on water level:
- 🟢 **Green (75-100%)**: Full
- 🔵 **Blue (50-75%)**: Good
- 🟠 **Orange (25-50%)**: Low
- 🔴 **Red (0-25%)**: Critical

### 3. Tanker Cards
Each tanker card displays:
- Tanker ID and name
- Water level gauge with percentage
- Capacity and status
- Expandable GPS coordinates
- Current volume and last update time
- Click to open detailed view

### 4. Detailed Tanker View (Dialog)
Clicking a tanker card opens a detailed dialog with:
- **Left Column**:
  - Individual tanker map with location
  - Water level history chart
- **Right Column**:
  - Live sensor data (GPS, distance, level)
  - Water level details (percentage, volume, status)
  - Email alert log (future feature)

### 5. Map Features
- **Multiple Markers**: Each tanker shown with a circular marker
- **Percentage Labels**: Water level displayed on each marker
- **Color Coding**: Marker color matches water level status
- **Legend**: Visual guide for status colors
- **Dark Theme**: Map styled to match dashboard theme

## How It Works

### Backend (MQTT Server)
1. Subscribes to wildcard topics: `+/gps` and `+/distance`
2. Parses tanker ID from topic (e.g., `T001/gps` → `T001`)
3. Maintains separate state for each tanker
4. Broadcasts updates to all connected clients via Server-Sent Events (SSE)

### Frontend (Dashboard)
1. Connects to `/api/stream` endpoint
2. Receives initial snapshot of all tankers
3. Updates tanker state in real-time as MQTT messages arrive
4. Calculates water level percentage from distance sensor
5. Maintains history of water levels for charts
6. Tracks GPS path for each tanker

## Testing with Multiple Tankers

### Using MQTT Client (e.g., MQTT Explorer, mosquitto_pub)

```bash
# Tanker T001 - GPS
mosquitto_pub -h 0b270ee4185f47c3a7cc53583d65d2a7.s1.eu.hivemq.cloud \
  -p 8883 -u admin -P Admin1234 --capath /etc/ssl/certs/ \
  -t "T001/gps" -m '{"lat":12.9716,"lon":77.5946}'

# Tanker T001 - Distance
mosquitto_pub -h 0b270ee4185f47c3a7cc53583d65d2a7.s1.eu.hivemq.cloud \
  -p 8883 -u admin -P Admin1234 --capath /etc/ssl/certs/ \
  -t "T001/distance" -m "68.5"

# Tanker T002 - GPS
mosquitto_pub -h 0b270ee4185f47c3a7cc53583d65d2a7.s1.eu.hivemq.cloud \
  -p 8883 -u admin -P Admin1234 --capath /etc/ssl/certs/ \
  -t "T002/gps" -m '{"lat":13.0827,"lon":80.2707}'

# Tanker T002 - Distance
mosquitto_pub -h 0b270ee4185f47c3a7cc53583d65d2a7.s1.eu.hivemq.cloud \
  -p 8883 -u admin -P Admin1234 --capath /etc/ssl/certs/ \
  -t "T002/distance" -m "120.3"
```

### Using Arduino/ESP32

```cpp
// Tanker T001
const char* TANKER_ID = "T001";
const char* GPS_TOPIC = "T001/gps";
const char* DISTANCE_TOPIC = "T001/distance";

// Publish GPS
String gpsJson = "{\"lat\":" + String(latitude, 6) + ",\"lon\":" + String(longitude, 6) + "}";
client.publish(GPS_TOPIC, gpsJson.c_str());

// Publish Distance
String distanceStr = String(distanceCm);
client.publish(DISTANCE_TOPIC, distanceStr.c_str());
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_TANKER_DEPTH_CM`: Tank depth in centimeters (default: 200)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key for map display

### Tanker Naming
Tankers are automatically named based on their ID:
- `T001` → "Tanker T001"
- `T002` → "Tanker T002"

You can customize names by modifying the `TankerData` initialization in `app/page.tsx`.

## Architecture

```
MQTT Broker (HiveMQ)
    ↓
lib/mqtt-server.ts (subscribes to +/gps, +/distance)
    ↓
app/api/stream/route.ts (SSE endpoint)
    ↓
app/page.tsx (React component with state management)
    ↓
components/tanker-card.tsx (individual tanker cards)
components/tanker-detail-dialog.tsx (detailed view)
components/map.tsx (Google Maps with multiple markers)
```

## Future Enhancements
- [ ] Per-tanker email alerts
- [ ] Tanker route history playback
- [ ] Custom tanker names and metadata
- [ ] Geofencing and alerts
- [ ] Export tanker data to CSV
- [ ] Real-time notifications for critical levels
