import { NextRequest, NextResponse } from 'next/server'
import { getCollectionWhere, COLLECTIONS } from '@/lib/firestore'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const restaurants = await getCollectionWhere(
      COLLECTIONS.RESTAURANTS,
      'slug',
      '==',
      slug
    )

    if (restaurants.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = restaurants[0]

    // Return only the fields we need
    const restaurantData = {
      id: restaurant.id,
      name: (restaurant as any).name,
      phone: (restaurant as any).phone,
      address: (restaurant as any).address,
      settings: (restaurant as any).settings
    }

    return NextResponse.json(restaurantData)

  } catch (error) {
    console.error('Restaurant lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}