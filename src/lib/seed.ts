import { db } from './db'

export async function seedDatabase() {
  // Create a sample restaurant
  const restaurant = await db.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      email: 'demo@restaurant.com',
      phone: '(555) 123-4567',
      address: '123 Main St, City, State 12345',
      avgServiceTimeMinutes: 45,
      settings: {
        maxPartySize: 8,
        autoAssignTables: true
      }
    }
  })

  // Create some sample tables
  const tables = [
    { tableNumber: '1', seatCount: 2, tableType: 'regular' },
    { tableNumber: '2', seatCount: 2, tableType: 'regular' },
    { tableNumber: '3', seatCount: 4, tableType: 'regular' },
    { tableNumber: '4', seatCount: 4, tableType: 'booth' },
    { tableNumber: '5', seatCount: 6, tableType: 'regular' },
    { tableNumber: '6', seatCount: 8, tableType: 'regular' },
  ]

  for (const table of tables) {
    await db.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: table.tableNumber
        }
      },
      update: {},
      create: {
        ...table,
        restaurantId: restaurant.id
      }
    })
  }

  console.log('Database seeded successfully!')
  console.log(`Restaurant: ${restaurant.name} (/${restaurant.slug})`)
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .catch(console.error)
    .finally(() => process.exit())
}