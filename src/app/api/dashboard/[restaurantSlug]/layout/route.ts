import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, updateDocument, COLLECTIONS } from '@/lib/firestore'
import { z } from 'zod'

const saveLayoutSchema = z.object({
  tablePositions: z.record(z.string(), z.object({
    x: z.number(),
    y: z.number()
  }))
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params
    const body = await request.json()

    const validation = saveLayoutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { tablePositions } = validation.data

    // Get restaurant
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
    const currentSettings = restaurant.settings || {}

    // Save layout to restaurant settings
    const newSettings = {
      ...currentSettings,
      tableLayout: tablePositions
    }

    await updateDocument(COLLECTIONS.RESTAURANTS, restaurant.id, {
      settings: newSettings
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Save layout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params

    // Get restaurant layout
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
    const settings = restaurant.settings
    const tableLayout = settings?.tableLayout || {}

    return NextResponse.json({ tablePositions: tableLayout })

  } catch (error) {
    console.error('Get layout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}