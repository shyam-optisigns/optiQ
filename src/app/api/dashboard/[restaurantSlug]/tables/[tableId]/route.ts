import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Verify table belongs to restaurant
    const existingTable = await db.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurant.id
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Update table status
    const updateData: any = { status }

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

    const updatedTable = await db.table.update({
      where: { id: tableId },
      data: updateData
    })

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