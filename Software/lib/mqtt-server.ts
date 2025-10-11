import mqtt from "mqtt"
import { getTamperDetector } from './tamper-detection'

// Environment configuration (do NOT expose secrets on the client)
const HIVEMQ_HOST = process.env.HIVEMQ_HOST || "0b270ee4185f47c3a7cc53583d65d2a7.s1.eu.hivemq.cloud"
const HIVEMQ_PORT = Number(process.env.HIVEMQ_PORT || 8883)
const HIVEMQ_USERNAME = process.env.HIVEMQ_USERNAME || "admin"
const HIVEMQ_PASSWORD = process.env.HIVEMQ_PASSWORD || "Admin1234"

// Support for multiple tankers with pattern: T001/gps, T001/distance, etc.
const TANKER_TOPIC_PATTERN = "+/gps" // Wildcard for all tankers
const DISTANCE_TOPIC_PATTERN = "+/distance"

// In-memory pub-sub for SSE clients
type Listener = (msg: any) => void
const listeners = new Set<Listener>()

let client: mqtt.MqttClient | null = null
let connected = false

// Store state for each tanker
type TankerState = {
  id: string
  ts: number
  lat?: number
  lon?: number
  distanceCm?: number
}

const tankerStates = new Map<string, TankerState>()

function connectClient() {
  if (client) return

  const url = `mqtts://${HIVEMQ_HOST}:${HIVEMQ_PORT}`

  client = mqtt.connect(url, {
    username: HIVEMQ_USERNAME,
    password: HIVEMQ_PASSWORD,
    protocol: "mqtts",
    port: HIVEMQ_PORT,
    rejectUnauthorized: true,
    keepalive: 30,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  })

  client.on("connect", () => {
    connected = true
    client?.subscribe([TANKER_TOPIC_PATTERN, DISTANCE_TOPIC_PATTERN], (err) => {
      if (err) console.error("[MQTT] subscribe error:", err)
    })
    console.log("[MQTT] connected and subscribed to multi-tanker topics")
  })

  client.on("reconnect", () => {
    console.log("[MQTT] reconnecting...")
  })

  client.on("error", (err) => {
    console.error("[MQTT] error:", err.message)
  })

  client.on("close", () => {
    connected = false
    console.log("[MQTT] connection closed")
  })

  client.on("message", (topic, payload) => {
    try {
      const ts = Date.now()
      console.log(`[MQTT] Received on ${topic}:`, payload.toString())
      
      // Parse tanker ID from topic (e.g., "T001/gps" -> "T001")
      const parts = topic.split('/')
      if (parts.length !== 2) {
        console.warn(`[MQTT] Invalid topic format: ${topic}`)
        return
      }
      
      const tankerId = parts[0]
      const topicType = parts[1]
      
      // Get or create tanker state
      if (!tankerStates.has(tankerId)) {
        tankerStates.set(tankerId, { id: tankerId, ts })
      }
      const state = tankerStates.get(tankerId)!
      
      if (topicType === 'gps') {
        const obj = JSON.parse(payload.toString())
        state.lat = Number(obj.lat)
        state.lon = Number(obj.lon)
        state.ts = ts
        console.log(`[MQTT] ${tankerId} GPS updated: lat=${state.lat}, lon=${state.lon}`)
        
        // Update tamper detector for this specific tanker
        getTamperDetector().updateData(tankerId, state.lat, state.lon)
        
        broadcast({ ts, topic, tankerId, lat: state.lat, lon: state.lon })
      } else if (topicType === 'distance') {
        const dist = Number(payload.toString())
        state.distanceCm = dist
        state.ts = ts
        console.log(`[MQTT] ${tankerId} Distance updated: ${dist} cm`)
        
        // Update tamper detector for this specific tanker
        getTamperDetector().updateData(tankerId, state.lat, state.lon)
        
        broadcast({ ts, topic, tankerId, distanceCm: dist })
      }
    } catch (e) {
      console.error("[MQTT] message parse error:", e, "payload:", payload.toString())
    }
  })
}

function broadcast(msg: any) {
  for (const l of listeners) {
    try {
      l(msg)
    } catch {}
  }
}

export function getMqttSingleton() {
  connectClient()

  return {
    isConnected: () => connected,
    getSnapshot: () => {
      // Return all tanker states as an array
      return Array.from(tankerStates.values())
    },
    getTankerState: (tankerId: string) => tankerStates.get(tankerId),
    getAllTankers: () => Array.from(tankerStates.values()),
    subscribe: (fn: Listener) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}
