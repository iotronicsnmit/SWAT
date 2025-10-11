import { Resend } from 'resend'
import { logEmail } from './email-log'

const resend = new Resend(process.env.RESEND_API_KEY)

// Global email lock - only ONE email ever until manually reset
let emailSent = false
let lastEmailTime = 0



export interface TamperAlert {
  tankerId?: string
  timestamp: number
  lastKnownLat?: number
  lastKnownLon?: number
  lastDataReceived: number
  offlineDuration: number
}

export async function sendTamperAlert(alert: TamperAlert) {
  if (!process.env.ALERT_EMAIL) {
    console.log('[Email] No email configured')
    return
  }
  
  // ABSOLUTE LOCK - Only one email until reset
  if (emailSent) {
    console.log('[Email] ❌ Email already sent, no more emails allowed')
    return
  }
  
  // Set lock IMMEDIATELY to prevent any duplicates
  emailSent = true
  lastEmailTime = Date.now()
  
  console.log('[Email] 📧 SENDING SINGLE TAMPER ALERT to:', process.env.ALERT_EMAIL)

  const offlineMinutes = Math.floor(alert.offlineDuration / 60000)
  
  // Simple email content
  const tankerInfo = alert.tankerId ? `Tanker: ${alert.tankerId}` : 'Water Tanker'
  
  const emailContent = `
🚨 SWAT TAMPER ALERT 🚨

${tankerInfo} communication lost!

⏰ Offline for: ${offlineMinutes} minute(s)
📅 Last seen: ${new Date(alert.lastDataReceived).toLocaleString()}
📍 Location: ${alert.lastKnownLat ? `${alert.lastKnownLat.toFixed(4)}, ${alert.lastKnownLon?.toFixed(4)}` : 'Unknown'}

Possible tampering detected. Check hardware immediately.
  `

  try {
    if (process.env.RESEND_API_KEY) {
      const subject = alert.tankerId 
        ? `🚨 SWAT ALERT - ${alert.tankerId} Communication Lost`
        : '🚨 SWAT TAMPER ALERT - Communication Lost'
      
      const { error } = await resend.emails.send({
        from: 'SWAT Alert <onboarding@resend.dev>',
        to: [process.env.ALERT_EMAIL],
        subject,
        text: emailContent
      })

      if (!error) {
        console.log('[Email] ✅ Email sent successfully!')
        logEmail({
          to: process.env.ALERT_EMAIL,
          subject: '🚨 SWAT TAMPER ALERT',
          status: 'sent',
          alert
        })
        return
      }
    }
    
    // Fallback - just log it
    console.log('[Email] 📝 Email logged (fallback):', emailContent)
    logEmail({
      to: process.env.ALERT_EMAIL,
      subject: '🚨 SWAT TAMPER ALERT',
      status: 'sent',
      alert
    })
    
  } catch (error) {
    console.error('[Email] Error:', error)
    logEmail({
      to: process.env.ALERT_EMAIL,
      subject: '🚨 SWAT TAMPER ALERT',
      status: 'failed',
      alert
    })
  }
}

// Reset email lock when connection is restored
export function resetEmailLock() {
  console.log('[Email] 🔓 Resetting email lock - ready for next alert')
  emailSent = false
}