import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, createDocument, getDocument, updateDocument, COLLECTIONS } from '@/lib/firestore'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'

const joinQueueSchema = z.object({
  restaurantSlug: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  partySize: z.number().min(1).max(20),
})

async function estimateWaitTime(restaurantId: string, partySize: number): Promise<number> {
  const [waitingEntries, restaurant] = await Promise.all([
    getCollectionWhere(COLLECTIONS.QUEUE_ENTRIES, 'restaurantId', '==', restaurantId),
    getDocument(COLLECTIONS.RESTAURANTS, restaurantId)
  ])

  // Filter for waiting status
  const queueCount = waitingEntries.filter((entry: any) => entry.status === 'waiting').length

  // Get historical data (simplified for Firebase - could be enhanced with queries)
  const historicalEntries = await getCollectionWhere(
    COLLECTIONS.QUEUE_HISTORY,
    'restaurantId',
    '==',
    restaurantId
  )

  const recentHistoricalEntries = historicalEntries.filter((entry: any) =>
    entry.partySize === partySize &&
    entry.createdAt &&
    entry.createdAt.seconds > (Date.now() / 1000 - 30 * 24 * 60 * 60) // Last 30 days
  )

  const historicalAvg = recentHistoricalEntries.length > 0
    ? recentHistoricalEntries.reduce((sum: number, entry: any) => sum + entry.actualWaitMinutes, 0) / recentHistoricalEntries.length
    : 0

  const baseTime = queueCount * ((restaurant as any)?.avgServiceTimeMinutes || 45)
  const estimatedWait = historicalAvg > 0
    ? Math.round((baseTime * 0.4) + (historicalAvg * 0.6))
    : baseTime

  return Math.max(estimatedWait, 5) // Minimum 5 minutes
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantSlug, customerName, customerEmail, partySize } = joinQueueSchema.parse(body)

    // Find restaurant
    const restaurants = await getCollectionWhere(
      COLLECTIONS.RESTAURANTS,
      'slug',
      '==',
      restaurantSlug
    )

    if (restaurants.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = restaurants[0] as any

    const settings = restaurant.settings || {}
    if (partySize > (settings.maxPartySize || 12)) {
      return NextResponse.json({
        error: `Party size too large. Maximum: ${settings.maxPartySize || 12}`
      }, { status: 400 })
    }

    // Check for duplicate recent entry
    const existingEntries = await getCollectionWhere(
      COLLECTIONS.QUEUE_ENTRIES,
      'restaurantId',
      '==',
      restaurant.id
    )

    const recentEntry = existingEntries.find((entry: any) =>
      entry.customerEmail === customerEmail &&
      ['waiting', 'called'].includes(entry.status) &&
      entry.createdAt &&
      entry.createdAt.seconds > (Date.now() / 1000 - 2 * 60 * 60) // Last 2 hours
    )

    if (recentEntry) {
      const position = await getQueuePosition(recentEntry.id)
      return NextResponse.json({
        queueId: recentEntry.id,
        position,
        estimatedWaitMinutes: recentEntry.estimatedWaitMinutes,
        message: 'You are already in the queue'
      })
    }

    // Estimate wait time
    const estimatedWaitMinutes = await estimateWaitTime(restaurant.id, partySize)

    // Create queue entry
    const queueEntryId = await createDocument(COLLECTIONS.QUEUE_ENTRIES, {
      restaurantId: restaurant.id,
      customerName,
      customerEmail,
      partySize,
      estimatedWaitMinutes,
      status: 'waiting',
      priorityScore: 0,
      notificationPreference: 'email'
    })

    const position = await getQueuePosition(queueEntryId)

    // Send welcome email
    const emailContent = emailTemplates.queueJoined(restaurant.name, customerName, position, estimatedWaitMinutes, queueEntryId)
    await sendEmail({
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    // Update last notification sent time
    await updateDocument(COLLECTIONS.QUEUE_ENTRIES, queueEntryId, {
      lastNotificationSent: new Date()
    })

    return NextResponse.json({
      queueId: queueEntryId,
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
  const entry = await getDocument(COLLECTIONS.QUEUE_ENTRIES, queueId)

  if (!entry) return 0

  const queueEntries = await getCollectionWhere(
    COLLECTIONS.QUEUE_ENTRIES,
    'restaurantId',
    '==',
    (entry as any).restaurantId
  )

  // Filter and sort waiting entries created before or at the same time as this entry
  const waitingEntries = queueEntries
    .filter((qEntry: any) =>
      qEntry.status === 'waiting' &&
      qEntry.createdAt &&
      qEntry.createdAt.seconds <= (entry as any).createdAt.seconds
    )
    .sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds)

  const position = waitingEntries.findIndex((qEntry: any) => qEntry.id === queueId) + 1

  return Math.max(position, 1)
}