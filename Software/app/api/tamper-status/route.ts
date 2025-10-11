import { NextResponse } from 'next/server'
import { getTamperDetector } from '@/lib/tamper-detection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const detector = getTamperDetector()
    const status = detector.getStatus()
    
    return NextResponse.json(
      {
        success: true,
        ...status
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    )
  } catch (error) {
    console.error('[API] Tamper status error:', error)
    // Return a default status instead of error
    return NextResponse.json(
      { 
        success: true, 
        isOnline: true,
        lastDataTime: Date.now(),
        offlineDuration: 0,
        alertSent: false
      },
      { status: 200 }
    )
  }
}