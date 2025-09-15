import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface SMSMessage {
  to: string
  message: string
}

export async function sendSMS({ to, message }: SMSMessage): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio credentials not configured, SMS not sent')
    return false
  }

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    console.log(`SMS sent to ${to}`)
    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // If it doesn't start with 1 and is 10 digits, assume US number
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // If it starts with 1 and is 11 digits, it's already US format
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Otherwise, return as-is with + prefix
  return digits.startsWith('+') ? digits : `+${digits}`
}

// SMS Templates
export const smsTemplates = {
  queueJoined: (restaurantName: string, position: number, estimatedWait: number) =>
    `Welcome to ${restaurantName}! You're #${position} in queue. Estimated wait: ${estimatedWait} min. We'll text you when your table is ready!`,

  positionUpdate: (restaurantName: string, position: number, estimatedWait: number) =>
    `${restaurantName}: You're now #${position} in queue. Estimated wait: ${estimatedWait} min.`,

  tableReady: (restaurantName: string, tableNumber?: string) =>
    `${restaurantName}: Your table is ready! ${tableNumber ? `Table ${tableNumber}` : 'Please head to the host stand.'}`,

  almostReady: (restaurantName: string) =>
    `${restaurantName}: You're next! Your table will be ready in just a few minutes.`,

  queueCancelled: (restaurantName: string, reason?: string) =>
    `${restaurantName}: ${reason || 'Your queue entry has been cancelled.'}`,
}