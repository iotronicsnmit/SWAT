import { NextResponse } from 'next/server'
import { sendTamperAlert } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Send a test tamper alert
    const testAlert = {
      timestamp: Date.now(),
      lastKnownLat: 19.077,
      lastKnownLon: 72.8787,
      lastDataReceived: Date.now() - 120000, // 2 minutes ago
      offlineDuration: 120000 // 2 minutes
    }

    const success = await sendTamperAlert(testAlert)
    
    return NextResponse.json({
      success,
      message: success ? 'Test alert sent successfully' : 'Failed to send test alert'
    })
  } catch (error) {
    console.error('[API] Test alert error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send test alert' },
      { status: 500 }
    )
  }
}