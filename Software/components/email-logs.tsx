"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Mail, CheckCircle, XCircle } from "lucide-react"

interface EmailLog {
  id: string
  timestamp: number
  to: string
  subject: string
  status: 'sent' | 'failed'
  alert?: any
}

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/email-logs')
      if (!response.ok) {
        // Silently fail if API is not available
        setLoading(false)
        return
      }
      const data = await response.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      // Silently fail - API might not be available yet
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Alert Log</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="border-border"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No email alerts sent yet
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
              >
                {log.status === 'sent' ? (
                  <CheckCircle className="h-5 w-5 text-status-good mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-status-critical mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    Alert to {log.to}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-semibold ${log.status === 'sent' ? 'text-status-good' : 'text-status-critical'
                    }`}>
                    {log.status === 'sent' ? 'Delivered' : 'Failed'}
                  </span>
                  {log.alert && (
                    <span className="text-xs text-muted-foreground">
                      Offline: {Math.floor(log.alert.offlineDuration / 60000)}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}