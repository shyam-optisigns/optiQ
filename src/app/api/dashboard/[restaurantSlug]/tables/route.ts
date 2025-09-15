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

    const tables = await db.table.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true
      },
      orderBy: { tableNumber: 'asc' },
      select: {
        id: true,
        tableNumber: true,
        seatCount: true,
        tableType: true,
        status: true,
        occupiedAt: true,
        currentPartySize: true,
        currentCustomerName: true
      }
    })

    return NextResponse.json(tables)

  } catch (error) {
    console.error('Dashboard tables error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}