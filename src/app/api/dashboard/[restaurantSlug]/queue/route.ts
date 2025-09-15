import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params

    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const queueEntries = await db.queueEntry.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { in: ['waiting', 'called'] }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        partySize: true,
        estimatedWaitMinutes: true,
        status: true,
        createdAt: true
      }
    })

    return NextResponse.json(queueEntries)

  } catch (error) {
    console.error('Dashboard queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}