import { sendTamperAlert, resetEmailLock } from './email-service'

const TAMPER_TIMEOUT = Number(process.env.TAMPER_TIMEOUT_MS || 60000) // 1 minute for demo

interface TankerTamperState {
  tankerId: string
  lastDataTime: number
  lastLat?: number
  lastLon?: number
  alertSent: boolean
  isOnline: boolean
}

class MultiTankerDetector {
  private tankers = new Map<string, TankerTamperState>()
  private checkInterval: NodeJS.Timeout | null = null
  private listeners = new Set<(tankerId: string, status: { isOnline: boolean; offlineDuration: number }) => void>()
  private instanceId: string

  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 9)
    console.log(`[Tamper:${this.instanceId}] 🚀 Multi-tanker detector started`)
    this.startMonitoring()
  }

  updateData(tankerId: string, lat?: number, lon?: number) {
    const now = Date.now()
    
    // Get or create tanker state
    if (!this.tankers.has(tankerId)) {
      console.log(`[Tamper:${this.instanceId}] 📍 Tracking new tanker: ${tankerId}`)
      this.tankers.set(tankerId, {
        tankerId,
        lastDataTime: now,
        alertSent: false,
        isOnline: true
      })
    }

    const state = this.tankers.get(tankerId)!
    const wasOffline = !state.isOnline

    state.lastDataTime = now
    if (lat !== undefined) state.lastLat = lat
    if (lon !== undefined) state.lastLon = lon
    state.isOnline = true

    // Reset alert flag when data resumes
    if (wasOffline) {
      console.log(`[Tamper:${this.instanceId}] 🟢 ${tankerId} CONNECTION RESTORED`)
      state.alertSent = false
      this.notifyListeners(tankerId)
    }
  }

  private startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.checkAllTankers()
    }, 5000) // Check every 5 seconds
  }

  private async checkAllTankers() {
    const now = Date.now()

    for (const [tankerId, state] of this.tankers.entries()) {
      const timeSinceLastData = now - state.lastDataTime
      const wasOnline = state.isOnline

      if (timeSinceLastData > TAMPER_TIMEOUT) {
        // Only change to offline if we were online
        if (state.isOnline) {
          console.log(`[Tamper:${this.instanceId}] 🔴 ${tankerId} OFFLINE - No data for ${Math.floor(timeSinceLastData / 1000)}s`)
          state.isOnline = false
          this.notifyListeners(tankerId)
        }

        // Send email only if we haven't sent one AND we were previously online
        if (!state.alertSent && wasOnline) {
          console.log(`[Tamper:${this.instanceId}] 🚨 ${tankerId} SENDING ALERT: Offline for ${Math.floor(timeSinceLastData / 1000)} seconds`)

          // Set flag IMMEDIATELY to prevent duplicate sends
          state.alertSent = true

          // Send email alert with tanker ID
          sendTamperAlert({
            tankerId,
            timestamp: now,
            lastKnownLat: state.lastLat,
            lastKnownLon: state.lastLon,
            lastDataReceived: state.lastDataTime,
            offlineDuration: timeSinceLastData
          })

          this.notifyListeners(tankerId)
        }
      } else {
        // Data is recent - should be online
        if (!state.isOnline) {
          console.log(`[Tamper:${this.instanceId}] 🟢 ${tankerId} ONLINE - Recent data (${Math.floor(timeSinceLastData / 1000)}s ago)`)
          state.isOnline = true
          this.notifyListeners(tankerId)
        }
      }
    }
  }

  subscribe(callback: (tankerId: string, status: { isOnline: boolean; offlineDuration: number }) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(tankerId: string) {
    const state = this.tankers.get(tankerId)
    if (!state) return

    const status = {
      isOnline: state.isOnline,
      offlineDuration: Date.now() - state.lastDataTime
    }

    this.listeners.forEach(callback => {
      try {
        callback(tankerId, status)
      } catch (e) {
        console.error(`[Tamper] Listener error for ${tankerId}:`, e)
      }
    })
  }

  getStatus(tankerId?: string) {
    if (tankerId) {
      const state = this.tankers.get(tankerId)
      if (!state) {
        return {
          isOnline: true,
          lastDataTime: Date.now(),
          offlineDuration: 0,
          alertSent: false
        }
      }
      return {
        isOnline: state.isOnline,
        lastDataTime: state.lastDataTime,
        offlineDuration: Date.now() - state.lastDataTime,
        alertSent: state.alertSent
      }
    }

    // Return overall status (any tanker offline = system offline)
    const allStates = Array.from(this.tankers.values())
    if (allStates.length === 0) {
      return {
        isOnline: true,
        lastDataTime: Date.now(),
        offlineDuration: 0,
        alertSent: false
      }
    }

    const anyOffline = allStates.some(s => !s.isOnline)
    const maxOfflineDuration = Math.max(...allStates.map(s => Date.now() - s.lastDataTime))
    const anyAlertSent = allStates.some(s => s.alertSent)

    return {
      isOnline: !anyOffline,
      lastDataTime: Math.max(...allStates.map(s => s.lastDataTime)),
      offlineDuration: maxOfflineDuration,
      alertSent: anyAlertSent
    }
  }

  getAllTankerStatuses() {
    const statuses: Record<string, any> = {}
    for (const [tankerId, state] of this.tankers.entries()) {
      statuses[tankerId] = {
        isOnline: state.isOnline,
        lastDataTime: state.lastDataTime,
        offlineDuration: Date.now() - state.lastDataTime,
        alertSent: state.alertSent
      }
    }
    return statuses
  }

  destroy() {
    console.log(`[Tamper:${this.instanceId}] 💀 Destroying detector instance`)
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.listeners.clear()
    this.tankers.clear()
  }
}

// Singleton instance with global tracking
let tamperDetector: MultiTankerDetector | null = null

// Use global to ensure true singleton across hot reloads
if (typeof global !== 'undefined') {
  if (!(global as any).__tamperDetector) {
    (global as any).__tamperDetector = null
  }
}

export function getTamperDetector() {
  // Use global singleton in development (handles hot reload)
  if (typeof global !== 'undefined' && (global as any).__tamperDetector) {
    return (global as any).__tamperDetector
  }

  // Create only if doesn't exist - TRUE SINGLETON
  if (!tamperDetector) {
    console.log(`[Tamper] 🚀 Creating NEW multi-tanker detector`)
    tamperDetector = new MultiTankerDetector()
    
    // Store in global for hot reload persistence
    if (typeof global !== 'undefined') {
      (global as any).__tamperDetector = tamperDetector
    }
  }
  return tamperDetector
}

// Export function to manually reset detector (for debugging)
export function resetTamperDetector() {
  if (tamperDetector) {
    tamperDetector.destroy()
    tamperDetector = null
  }
  
  // Clear global reference
  if (typeof global !== 'undefined') {
    (global as any).__tamperDetector = null
  }
  
  console.log('[Tamper] 🔄 Detector reset')
}

export type { TankerTamperState }