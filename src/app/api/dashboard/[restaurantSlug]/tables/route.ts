import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, createDocument, COLLECTIONS } from '@/lib/firestore'
import { z } from 'zod'

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

const addTableSchema = z.object({
  restaurantId: z.string().min(1),
  tableNumber: z.string().min(1),
  seatCount: z.number().min(1).max(20),
  tableType: z.enum(['regular', 'booth', 'bar', 'outdoor']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params
    const body = await request.json()
    const { restaurantId, tableNumber, seatCount, tableType } = addTableSchema.parse(body)

    // Verify restaurant exists and matches slug
    const restaurants = await getCollectionWhere(
      COLLECTIONS.RESTAURANTS,
      'slug',
      '==',
      restaurantSlug
    )

    if (restaurants.length === 0 || restaurants[0].id !== restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Check if table number already exists for this restaurant
    const existingTables = await getCollectionWhere(
      COLLECTIONS.TABLES,
      'restaurantId',
      '==',
      restaurantId
    )

    const tableExists = existingTables.some((table: any) =>
      table.tableNumber === tableNumber && table.isActive
    )

    if (tableExists) {
      return NextResponse.json({ error: 'Table number already exists' }, { status: 400 })
    }

    // Create new table
    const tableId = await createDocument(COLLECTIONS.TABLES, {
      restaurantId,
      tableNumber,
      seatCount,
      tableType,
      isActive: true,
      status: 'available',
      positionX: 0,
      positionY: 0
    })

    return NextResponse.json({
      success: true,
      tableId,
      message: 'Table added successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }

    console.error('Add table error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}