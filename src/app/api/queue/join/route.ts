import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'

const joinQueueSchema = z.object({
  restaurantSlug: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  partySize: z.number().min(1).max(20),
})

async function estimateWaitTime(restaurantId: string, partySize: number): Promise<number> {
  const [queueCount, restaurant, historicalData] = await Promise.all([
    db.queueEntry.count({
      where: {
        restaurantId,
        status: 'waiting'
      }
    }),
    db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { avgServiceTimeMinutes: true }
    }),
    db.queueHistory.aggregate({
      where: {
        restaurantId,
        partySize,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _avg: {
        actualWaitMinutes: true
      }
    })
  ])

  const baseTime = queueCount * (restaurant?.avgServiceTimeMinutes || 45)
  const historicalAvg = historicalData._avg.actualWaitMinutes || baseTime

  // Simple weighted average - can be enhanced later
  const estimatedWait = Math.round((baseTime * 0.4) + (historicalAvg * 0.6))

  return Math.max(estimatedWait, 5) // Minimum 5 minutes
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantSlug, customerName, customerEmail, partySize } = joinQueueSchema.parse(body)

    // Find restaurant
    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: {
        id: true,
        name: true,
        settings: true
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const settings = restaurant.settings as any || {}
    if (partySize > (settings.maxPartySize || 12)) {
      return NextResponse.json({
        error: `Party size too large. Maximum: ${settings.maxPartySize || 12}`
      }, { status: 400 })
    }

    // Check for duplicate recent entry
    const existingEntry = await db.queueEntry.findFirst({
      where: {
        restaurantId: restaurant.id,
        customerEmail,
        status: { in: ['waiting', 'called'] },
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json({
        queueId: existingEntry.id,
        position: await getQueuePosition(existingEntry.id),
        estimatedWaitMinutes: existingEntry.estimatedWaitMinutes,
        message: 'You are already in the queue'
      })
    }

    // Estimate wait time
    const estimatedWaitMinutes = await estimateWaitTime(restaurant.id, partySize)

    // Create queue entry
    const queueEntry = await db.queueEntry.create({
      data: {
        restaurantId: restaurant.id,
        customerName,
        customerEmail,
        partySize,
        estimatedWaitMinutes,
        status: 'waiting'
      }
    })

    const position = await getQueuePosition(queueEntry.id)

    // Send welcome email
    const emailContent = emailTemplates.queueJoined(restaurant.name, customerName, position, estimatedWaitMinutes, queueEntry.id)
    await sendEmail({
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    // Update last notification sent time
    await db.queueEntry.update({
      where: { id: queueEntry.id },
      data: { lastNotificationSent: new Date() }
    })

    return NextResponse.json({
      queueId: queueEntry.id,
      position,
      estimatedWaitMinutes,
      restaurantName: restaurant.name,
      message: 'Successfully added to queue'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }

    console.error('Queue join error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getQueuePosition(queueId: string): Promise<number> {
  const entry = await db.queueEntry.findUnique({
    where: { id: queueId },
    select: { createdAt: true, restaurantId: true }
  })

  if (!entry) return 0

  const position = await db.queueEntry.count({
    where: {
      restaurantId: entry.restaurantId,
      status: 'waiting',
      createdAt: { lte: entry.createdAt }
    }
  })

  return position
}