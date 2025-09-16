import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, COLLECTIONS } from '@/lib/firestore'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params

    const restaurants = await getCollectionWhere(
      COLLECTIONS.RESTAURANTS,
      'slug',
      '==',
      restaurantSlug
    )

    if (restaurants.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = restaurants[0]

    const allQueueEntries = await getCollectionWhere(
      COLLECTIONS.QUEUE_ENTRIES,
      'restaurantId',
      '==',
      restaurant.id
    )

    // Filter for waiting and called status, sort by createdAt
    const queueEntries = allQueueEntries
      .filter((entry: any) => ['waiting', 'called'].includes(entry.status))
      .sort((a: any, b: any) => {
        if (!a.createdAt || !b.createdAt) return 0
        return a.createdAt.seconds - b.createdAt.seconds
      })
      .map((entry: any) => ({
        id: entry.id,
        customerName: entry.customerName,
        customerEmail: entry.customerEmail,
        partySize: entry.partySize,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        status: entry.status,
        createdAt: entry.createdAt
      }))

    return NextResponse.json(queueEntries)

  } catch (error) {
    console.error('Dashboard queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}