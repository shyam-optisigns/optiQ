import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'

const seatCustomerSchema = z.object({
  tableId: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; queueId: string }> }
) {
  try {
    const { restaurantId, queueId } = await params
    const body = await request.json()
    const { tableId } = seatCustomerSchema.parse(body)

    // Get queue entry
    const queueEntry = await db.queueEntry.findFirst({
      where: {
        id: queueId,
        restaurantId,
        status: { in: ['waiting', 'called'] }
      },
      include: {
        restaurant: { select: { name: true } }
      }
    })

    if (!queueEntry) {
      return NextResponse.json({ error: 'Queue entry not found or already processed' }, { status: 404 })
    }

    // If tableId provided, verify it exists and is available
    let table = null
    if (tableId) {
      table = await db.table.findFirst({
        where: {
          id: tableId,
          restaurantId,
          isActive: true,
          status: 'available'
        }
      })

      if (!table) {
        return NextResponse.json({ error: 'Table not available' }, { status: 400 })
      }
    }

    // If no specific table provided, auto-select best available table
    if (!tableId) {
      const availableTable = await db.table.findFirst({
        where: {
          restaurantId,
          status: 'available',
          seatCount: { gte: queueEntry.partySize },
          isActive: true
        },
        orderBy: [
          { seatCount: 'asc' } // Get smallest suitable table
        ]
      })

      if (availableTable) {
        table = availableTable
        // Use the auto-selected table
      }
    }

    // Update queue entry and table in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update queue entry
      const updatedEntry = await tx.queueEntry.update({
        where: { id: queueId },
        data: {
          status: 'seated',
          tableId: table?.id || null,
          seatedAt: new Date(),
          actualWaitMinutes: Math.round((Date.now() - queueEntry.createdAt.getTime()) / (1000 * 60))
        }
      })

      // Mark table as occupied if we have a table (specific or auto-selected)
      if (table) {
        await tx.table.update({
          where: { id: table.id },
          data: {
            status: 'occupied',
            occupiedAt: new Date(),
            currentPartySize: queueEntry.partySize,
            currentCustomerName: queueEntry.customerName
          }
        })
      }

      return updatedEntry
    })

    // Send email notification
    const emailContent = emailTemplates.tableReady(
      queueEntry.restaurant.name,
      queueEntry.customerName,
      queueId,
      table?.tableNumber
    )

    await sendEmail({
      to: queueEntry.customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    // Update notification timestamp
    await db.queueEntry.update({
      where: { id: queueId },
      data: { lastNotificationSent: new Date() }
    })

    // Create historical record for analytics
    await db.queueHistory.create({
      data: {
        restaurantId: queueEntry.restaurantId,
        customerName: queueEntry.customerName,
        customerEmail: queueEntry.customerEmail,
        partySize: queueEntry.partySize,
        estimatedWaitMinutes: queueEntry.estimatedWaitMinutes,
        actualWaitMinutes: result.actualWaitMinutes || 0,
        tableId: tableId || null,
        status: 'seated',
        priorityScore: queueEntry.priorityScore,
        createdAt: queueEntry.createdAt,
        seatedAt: result.seatedAt!,
        completedAt: result.seatedAt!,
        dayOfWeek: queueEntry.createdAt.getDay(),
        hourOfDay: queueEntry.createdAt.getHours(),
        isWeekend: [0, 6].includes(queueEntry.createdAt.getDay()),
        isPeakTime: [11, 12, 17, 18, 19, 20].includes(queueEntry.createdAt.getHours())
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Customer seated successfully',
      tableNumber: table?.tableNumber
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }

    console.error('Seat customer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}