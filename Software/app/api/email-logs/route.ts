import { NextResponse } from 'next/server'
import { getEmailLogs } from '@/lib/email-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const logs = getEmailLogs()
    return NextResponse.json(
      {
        success: true,
        logs
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    )
  } catch (error) {
    console.error('[API] Email logs error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get email logs', logs: [] },
      { status: 200 } // Return 200 with empty logs instead of 500
    )
  }
}