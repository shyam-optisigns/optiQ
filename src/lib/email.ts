import * as nodemailer from 'nodemailer'

export interface EmailMessage {
  to: string
  subject: string
  html: string
}

// Create reusable transporter
const createTransporter = () => {
  // For localhost testing, use Gmail (easier setup) or any SMTP
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App password, not regular password
      }
    })
  }

  // Fallback: Ethereal Email for testing (creates fake inbox)
  return null
}

export async function sendEmail({ to, subject, html }: EmailMessage): Promise<boolean> {
  try {
    let transporter = createTransporter()

    // If no real email configured, use Ethereal for testing
    if (!transporter) {
      const testAccount = await nodemailer.createTestAccount()

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })

      console.log('📧 Using Ethereal Email for testing')
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@restaurant-queue.com',
      to,
      subject,
      html
    })

    console.log(`✅ Email sent to ${to}`)

    // If using Ethereal, show preview link
    if (info.messageId && !process.env.EMAIL_USER) {
      console.log('📧 Preview email: ' + nodemailer.getTestMessageUrl(info))
    }

    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}

// Email Templates
export const emailTemplates = {
  queueJoined: (restaurantName: string, customerName: string, position: number, estimatedWait: number, queueId: string) => ({
    subject: `Welcome to ${restaurantName} - Queue Position #${position}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Queue Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">🎉 You're in the queue!</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">${restaurantName}</h2>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333;">Hi ${customerName}!</h3>
            <p style="color: #666; line-height: 1.5;">Thanks for joining our queue. Here are your details:</p>

            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4f46e5;">
              <p style="margin: 0; font-size: 18px;"><strong>Queue Position: #${position}</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">Estimated wait time: <strong>${estimatedWait} minutes</strong></p>
            </div>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #2d5a2d;"><strong>📧 We'll email you when your table is ready!</strong></p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/queue/${queueId}"
               style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📱 Check Your Status
            </a>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">
            Questions? Contact ${restaurantName} directly.<br>
            <small>Powered by Restaurant Queue System</small>
          </p>
        </body>
      </html>
    `
  }),

  tableReady: (restaurantName: string, customerName: string, queueId: string, tableNumber?: string) => ({
    subject: `🎉 Your table is ready at ${restaurantName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Table Ready!</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px;">🍽️ Table Ready!</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">${restaurantName}</h2>
          </div>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin-top: 0; color: #166534; font-size: 20px;">Hi ${customerName}!</h3>
            <p style="color: #15803d; font-size: 18px; margin: 10px 0;"><strong>Your table is ready! 🎉</strong></p>
            ${tableNumber ? `<p style="color: #166534; font-size: 16px; margin: 10px 0;">Please head to <strong>Table ${tableNumber}</strong></p>` : ''}

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #22c55e;">
              <p style="margin: 0; font-size: 16px; color: #166534;">
                <strong>👨‍💼 Please proceed to the host stand</strong>
              </p>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/queue/${queueId}"
                 style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📱 View Your Status
              </a>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">
            Thank you for your patience!<br>
            <small>Powered by Restaurant Queue System</small>
          </p>
        </body>
      </html>
    `
  }),

  positionUpdate: (restaurantName: string, customerName: string, position: number, estimatedWait: number) => ({
    subject: `Queue Update - Position #${position} at ${restaurantName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Queue Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 22px;">📍 Queue Update</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">${restaurantName}</h2>
          </div>

          <div style="background: #fefbf0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #92400e;">Hi ${customerName}!</h3>
            <p style="color: #a16207; line-height: 1.5;">You're moving up in the queue!</p>

            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 18px;"><strong>New Position: #${position}</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">Updated wait time: <strong>${estimatedWait} minutes</strong></p>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">
            We'll notify you when your table is ready!<br>
            <small>Powered by Restaurant Queue System</small>
          </p>
        </body>
      </html>
    `
  })
}