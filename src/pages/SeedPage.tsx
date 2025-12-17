import { useState } from 'react';
import { createDocument, COLLECTIONS } from '@/lib/firestore';

export default function SeedPage() {
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const seedData = async () => {
    setSeeding(true);
    setMessage('Seeding data...');

    try {
      // Create sample restaurant
      const restaurantId = await createDocument(COLLECTIONS.RESTAURANTS, {
        name: "Editor Restaurant",
        slug: "editor",
        email: "editor@restaurant.com",
        phone: "(555) 123-4567",
        address: "123 Main St, City, State",
        avgServiceTimeMinutes: 45,
        settings: {
          maxPartySize: 8,
          autoAssignTables: true
        }
      });

      setMessage('Created restaurant, adding tables...');

      // Create sample tables
      const tablePromises = [];
      for (let i = 1; i <= 10; i++) {
        tablePromises.push(
          createDocument(COLLECTIONS.TABLES, {
            restaurantId,
            tableNumber: i.toString(),
            seatCount: i <= 4 ? 2 : i <= 8 ? 4 : 6,
            tableType: i <= 6 ? 'regular' : i <= 8 ? 'booth' : 'bar',
            positionX: (i % 4) * 100,
            positionY: Math.floor(i / 4) * 100,
            isActive: true,
            status: 'available'
          })
        );
      }

      await Promise.all(tablePromises);
      setMessage('Created 10 tables, creating demo restaurant...');

      // Create demo restaurant
      const demoRestaurantId = await createDocument(COLLECTIONS.RESTAURANTS, {
        name: "Demo Restaurant",
        slug: "demo-restaurant",
        email: "demo@restaurant.com",
        phone: "(555) 987-6543",
        address: "456 Demo Ave, Demo City",
        avgServiceTimeMinutes: 30,
        settings: {
          maxPartySize: 12,
          autoAssignTables: false
        }
      });

      // Create tables for demo restaurant
      const demoTablePromises = [];
      for (let i = 1; i <= 6; i++) {
        demoTablePromises.push(
          createDocument(COLLECTIONS.TABLES, {
            restaurantId: demoRestaurantId,
            tableNumber: i.toString(),
            seatCount: 4,
            tableType: 'regular',
            isActive: true,
            status: 'available'
          })
        );
      }

      await Promise.all(demoTablePromises);

      setMessage('✅ Seeding completed successfully! You can now visit /dashboard/editor or /demo-restaurant');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
      console.error('Seeding error:', error);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Seed Firebase Database</h1>

        <p className="text-gray-600 mb-6 text-center">
          This will create sample restaurants and tables in your Firebase database.
        </p>

        <button
          onClick={seedData}
          disabled={seeding}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded"
        >
          {seeding ? 'Seeding...' : 'Seed Database'}
        </button>

        {message && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            {message}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p><strong>After seeding, you can visit:</strong></p>
          <ul className="mt-2 space-y-1">
            <li>• <code>/dashboard/editor</code> - Restaurant dashboard</li>
            <li>• <code>/demo-restaurant</code> - Customer queue page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
