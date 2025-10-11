"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Wifi, WifiOff, X } from "lucide-react"

interface TamperStatus {
  isOnline: boolean
  offlineDuration: number
  lastDataTime: number
  alertSent: boolean
}

export function TamperNotifications() {
  const [status, setStatus] = useState<TamperStatus>({
    isOnline: true,
    offlineDuration: 0,
    lastDataTime: Date.now(),
    alertSent: false
  })
  const [showAlert, setShowAlert] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // Poll tamper status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/tamper-status')
        if (!response.ok) {
          // Silently fail if API is not available
          return
        }
        const data = await response.json()
        
        if (data.success) {
          const newStatus = {
            isOnline: data.isOnline,
            offlineDuration: data.offlineDuration,
            lastDataTime: data.lastDataTime,
            alertSent: data.alertSent
          }
          
          // Show alert if went offline
          if (status.isOnline && !newStatus.isOnline) {
            setShowAlert(true)
            showBrowserNotification(newStatus)
          }
          
          // Hide alert if came back online
          if (!status.isOnline && newStatus.isOnline) {
            setShowAlert(false)
          }
          
          setStatus(newStatus)
        }
      } catch (error) {
        // Silently fail - API might not be available yet
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000) // Check every 5 seconds
    
    return () => clearInterval(interval)
  }, [status.isOnline])

  const showBrowserNotification = (tamperStatus: TamperStatus) => {
    if (notificationPermission === 'granted') {
      const offlineMinutes = Math.floor(tamperStatus.offlineDuration / 60000)
      
      try {
        new Notification('🚨 SWAT TAMPER ALERT', {
          body: `Water tanker communication lost! Offline for ${offlineMinutes} minute(s). Possible tampering detected.`,
          icon: '/favicon.ico',
          tag: 'tamper-alert'
        })
      } catch (error) {
        console.error('[Notifications] Browser notification failed:', error)
      }
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {status.isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-red-600">
              Offline ({formatDuration(status.offlineDuration)})
            </span>
          </>
        )}
      </div>

      {/* Tamper Alert */}
      {showAlert && !status.isOnline && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="flex-1">
            <AlertTitle className="text-red-800 dark:text-red-200">
              🚨 TAMPER ALERT - Communication Lost
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              No data received for <strong>{formatDuration(status.offlineDuration)}</strong>.
              {status.alertSent && " Email alert sent to administrators."}
              <br />
              <span className="text-sm">
                Last update: {new Date(status.lastDataTime).toLocaleString()}
              </span>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAlert(false)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Notification Permission Request */}
      {notificationPermission === 'default' && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              Enable Notifications
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Allow notifications to receive instant tamper alerts even when the dashboard is minimized.
            </AlertDescription>
          </div>
          <Button
            onClick={() => {
              Notification.requestPermission().then(permission => {
                setNotificationPermission(permission)
              })
            }}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Enable
          </Button>
        </Alert>
      )}
    </>
  )
}