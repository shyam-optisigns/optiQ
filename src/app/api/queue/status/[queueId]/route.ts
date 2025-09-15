import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params

    const queueEntry = await db.queueEntry.findUnique({
      where: { id: queueId },
      include: {
        restaurant: {
          select: {
            name: true,
            phone: true,
            address: true
          }
        },
        table: {
          select: {
            tableNumber: true,
            seatCount: true
          }
        }
      }
    })

    if (!queueEntry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    if (queueEntry.status === 'cancelled' || queueEntry.status === 'completed') {
      return NextResponse.json({
        status: queueEntry.status,
        message: queueEntry.status === 'cancelled' ? 'You have left the queue' : 'Your visit is complete'
      })
    }

    const position = await getQueuePosition(queueEntry.id, queueEntry.restaurantId, queueEntry.createdAt)

    // Recalculate wait time based on current position
    const updatedWaitTime = Math.max(position * 15, 5) // Rough estimate: 15 min per party ahead

    let statusMessage = ''
    switch (queueEntry.status) {
      case 'waiting':
        statusMessage = position === 1 ? 'You are next!' : `${position - 1} parties ahead of you`
        break
      case 'called':
        statusMessage = `Your table is ready! Table ${queueEntry.table?.tableNumber || 'TBD'}`
        break
      case 'seated':
        statusMessage = 'You have been seated. Enjoy your meal!'
        break
      default:
        statusMessage = 'Status unknown'
    }

    return NextResponse.json({
      queueId: queueEntry.id,
      status: queueEntry.status,
      position,
      estimatedWaitMinutes: queueEntry.status === 'waiting' ? updatedWaitTime : 0,
      customerName: queueEntry.customerName,
      partySize: queueEntry.partySize,
      restaurant: queueEntry.restaurant,
      table: queueEntry.table,
      statusMessage,
      createdAt: queueEntry.createdAt
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getQueuePosition(queueId: string, restaurantId: string, createdAt: Date): Promise<number> {
  const position = await db.queueEntry.count({
    where: {
      restaurantId,
      status: 'waiting',
      createdAt: { lte: createdAt }
    }
  })

  return position
}