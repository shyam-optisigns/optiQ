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

    const allTables = await getCollectionWhere(
      COLLECTIONS.TABLES,
      'restaurantId',
      '==',
      restaurant.id
    )

    // Filter for active tables and sort by table number
    const tables = allTables
      .filter((table: any) => table.isActive)
      .sort((a: any, b: any) => {
        // Sort numerically by table number
        const aNum = parseInt(a.tableNumber) || 0
        const bNum = parseInt(b.tableNumber) || 0
        return aNum - bNum
      })
      .map((table: any) => ({
        id: table.id,
        tableNumber: table.tableNumber,
        seatCount: table.seatCount,
        tableType: table.tableType,
        status: table.status,
        occupiedAt: table.occupiedAt,
        currentPartySize: table.currentPartySize,
        currentCustomerName: table.currentCustomerName
      }))

    return NextResponse.json(tables)

  } catch (error) {
    console.error('Dashboard tables error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}