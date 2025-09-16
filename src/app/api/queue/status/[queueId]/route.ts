import { NextRequest, NextResponse } from 'next/server'
import { getDocument, getCollectionWhere, COLLECTIONS } from '@/lib/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params

    const queueEntry = await getDocument(COLLECTIONS.QUEUE_ENTRIES, queueId)

    if (!queueEntry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    const queueEntryData = queueEntry as any

    if (queueEntryData.status === 'cancelled' || queueEntryData.status === 'completed') {
      return NextResponse.json({
        status: queueEntryData.status,
        message: queueEntryData.status === 'cancelled' ? 'You have left the queue' : 'Your visit is complete'
      })
    }

    // Get restaurant data
    const restaurant = await getDocument(COLLECTIONS.RESTAURANTS, queueEntryData.restaurantId)

    // Get table data if tableId exists
    let table = null
    if (queueEntryData.tableId) {
      table = await getDocument(COLLECTIONS.TABLES, queueEntryData.tableId)
    }

    const position = await getQueuePosition(queueId, queueEntryData.restaurantId, queueEntryData.createdAt)

    // Recalculate wait time based on current position
    const updatedWaitTime = Math.max(position * 15, 5) // Rough estimate: 15 min per party ahead

    let statusMessage = ''
    switch (queueEntryData.status) {
      case 'waiting':
        statusMessage = position === 1 ? 'You are next!' : `${position - 1} parties ahead of you`
        break
      case 'called':
        statusMessage = `Your table is ready! Table ${table?.tableNumber || 'TBD'}`
        break
      case 'seated':
        statusMessage = 'You have been seated. Enjoy your meal!'
        break
      default:
        statusMessage = 'Status unknown'
    }

    return NextResponse.json({
      queueId: queueEntryData.id,
      status: queueEntryData.status,
      position,
      estimatedWaitMinutes: queueEntryData.status === 'waiting' ? updatedWaitTime : 0,
      customerName: queueEntryData.customerName,
      partySize: queueEntryData.partySize,
      restaurant: restaurant ? {
        name: (restaurant as any).name,
        phone: (restaurant as any).phone,
        address: (restaurant as any).address
      } : null,
      table: table ? {
        tableNumber: (table as any).tableNumber,
        seatCount: (table as any).seatCount
      } : null,
      statusMessage,
      createdAt: queueEntryData.createdAt
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getQueuePosition(queueId: string, restaurantId: string, createdAt: any): Promise<number> {
  const queueEntries = await getCollectionWhere(
    COLLECTIONS.QUEUE_ENTRIES,
    'restaurantId',
    '==',
    restaurantId
  )

  // Filter and count waiting entries created before or at the same time
  const waitingEntries = queueEntries.filter((entry: any) =>
    entry.status === 'waiting' &&
    entry.createdAt &&
    entry.createdAt.seconds <= createdAt.seconds
  )

  const position = waitingEntries.findIndex((entry: any) => entry.id === queueId) + 1

  return Math.max(position, 1)
}