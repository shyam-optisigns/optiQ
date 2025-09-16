import { NextRequest, NextResponse } from 'next/server'
import { getDocument, getCollectionWhere, updateDocument, createDocument, COLLECTIONS } from '@/lib/firestore'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'
import { serverTimestamp } from 'firebase/firestore'

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
    const queueEntry = await getDocument(COLLECTIONS.QUEUE_ENTRIES, queueId) as any

    if (!queueEntry || queueEntry.restaurantId !== restaurantId || !['waiting', 'called'].includes(queueEntry.status)) {
      return NextResponse.json({ error: 'Queue entry not found or already processed' }, { status: 404 })
    }

    // Get restaurant data
    const restaurant = await getDocument(COLLECTIONS.RESTAURANTS, restaurantId) as any

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // If tableId provided, verify it exists and is available
    let table = null
    if (tableId) {
      table = await getDocument(COLLECTIONS.TABLES, tableId) as any

      if (!table || table.restaurantId !== restaurantId || !table.isActive || table.status !== 'available') {
        return NextResponse.json({ error: 'Table not available' }, { status: 400 })
      }
    }

    // If no specific table provided, auto-select best available table
    if (!tableId) {
      const allTables = await getCollectionWhere(
        COLLECTIONS.TABLES,
        'restaurantId',
        '==',
        restaurantId
      )

      const availableTables = allTables
        .filter((t: any) =>
          t.status === 'available' &&
          t.seatCount >= queueEntry.partySize &&
          t.isActive
        )
        .sort((a: any, b: any) => a.seatCount - b.seatCount) // Smallest suitable table first

      if (availableTables.length > 0) {
        table = availableTables[0]
      }
    }

    const now = new Date()
    const actualWaitMinutes = queueEntry.createdAt
      ? Math.round((Date.now() - queueEntry.createdAt.seconds * 1000) / (1000 * 60))
      : 0

    // Update queue entry
    await updateDocument(COLLECTIONS.QUEUE_ENTRIES, queueId, {
      status: 'seated',
      tableId: table?.id || null,
      seatedAt: serverTimestamp(),
      actualWaitMinutes,
      lastNotificationSent: serverTimestamp()
    })

    // Mark table as occupied if we have a table
    if (table) {
      await updateDocument(COLLECTIONS.TABLES, table.id, {
        status: 'occupied',
        occupiedAt: serverTimestamp(),
        currentPartySize: queueEntry.partySize,
        currentCustomerName: queueEntry.customerName
      })
    }

    // Send email notification
    const emailContent = emailTemplates.tableReady(
      restaurant.name,
      queueEntry.customerName,
      queueId,
      table?.tableNumber
    )

    await sendEmail({
      to: queueEntry.customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    // Create historical record for analytics
    const createdDate = queueEntry.createdAt ? new Date(queueEntry.createdAt.seconds * 1000) : now
    await createDocument(COLLECTIONS.QUEUE_HISTORY, {
      restaurantId: queueEntry.restaurantId,
      customerName: queueEntry.customerName,
      customerEmail: queueEntry.customerEmail,
      partySize: queueEntry.partySize,
      estimatedWaitMinutes: queueEntry.estimatedWaitMinutes,
      actualWaitMinutes,
      tableId: table?.id || null,
      status: 'seated',
      priorityScore: queueEntry.priorityScore || 0,
      createdAt: serverTimestamp(),
      seatedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      dayOfWeek: createdDate.getDay(),
      hourOfDay: createdDate.getHours(),
      isWeekend: [0, 6].includes(createdDate.getDay()),
      isPeakTime: [11, 12, 17, 18, 19, 20].includes(createdDate.getHours())
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