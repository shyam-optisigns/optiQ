import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, getDocument, updateDocument, COLLECTIONS } from '@/lib/firestore'
import { z } from 'zod'

const updateTableSchema = z.object({
  status: z.enum(['available', 'occupied', 'cleaning', 'maintenance'])
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string; tableId: string }> }
) {
  try {
    const { restaurantSlug, tableId } = await params
    const body = await request.json()
    const { status } = updateTableSchema.parse(body)

    // Verify restaurant exists and get ID
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

    // Verify table belongs to restaurant
    const existingTable = await getDocument(COLLECTIONS.TABLES, tableId) as any

    if (!existingTable || existingTable.restaurantId !== restaurant.id) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Update table status
    const updateData: Record<string, any> = { status }

    // Clear occupancy data when table becomes available
    if (status === 'available') {
      updateData.occupiedAt = null
      updateData.currentPartySize = null
      updateData.currentCustomerName = null
    }

    // Set occupancy time for cleaning status
    if (status === 'cleaning' && existingTable.status === 'occupied') {
      // Keep the occupancy data for cleaning
    }

    await updateDocument(COLLECTIONS.TABLES, tableId, updateData)

    // Get updated table data
    const updatedTable = await getDocument(COLLECTIONS.TABLES, tableId)

    return NextResponse.json({
      success: true,
      table: updatedTable
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    console.error('Update table status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}