// Simple in-memory email log for demo purposes
interface EmailLog {
  id: string
  timestamp: number
  to: string
  subject: string
  status: 'sent' | 'failed'
  alert?: any
}

const emailLogs: EmailLog[] = []

export function logEmail(log: Omit<EmailLog, 'id' | 'timestamp'>) {
  const emailLog: EmailLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    ...log
  }
  
  emailLogs.push(emailLog)
  
  // Keep only last 50 logs
  if (emailLogs.length > 50) {
    emailLogs.splice(0, emailLogs.length - 50)
  }
  
  console.log('[Email Log]', emailLog)
  return emailLog
}

export function getEmailLogs() {
  return [...emailLogs].reverse() // Most recent first
}

export function clearEmailLogs() {
  emailLogs.length = 0
}