// Firebase seeding script
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  // You'll need to get these from Firebase Console > Project Settings > Service accounts
  "type": "service_account",
  "project_id": "optiq-ea65f",
  // Add your service account credentials here
};

// Initialize Firebase Admin (you'll need to configure this)
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// For now, let's create a simple web script
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBrrKqtcG6_puqwBxeSQsBwK-yv7q71Xvo",
  authDomain: "optiq-ea65f.firebaseapp.com",
  projectId: "optiq-ea65f",
  storageBucket: "optiq-ea65f.firebasestorage.app",
  messagingSenderId: "547878905947",
  appId: "1:547878905947:web:0cb309501f8b83509c777e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  try {
    // Create sample restaurant
    const restaurantRef = await addDoc(collection(db, 'restaurants'), {
      name: "Editor Restaurant",
      slug: "editor",
      email: "editor@restaurant.com",
      phone: "(555) 123-4567",
      address: "123 Main St, City, State",
      avgServiceTimeMinutes: 45,
      settings: {
        maxPartySize: 8,
        autoAssignTables: true
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Restaurant created with ID:', restaurantRef.id);

    // Create sample tables
    const tablePromises = [];
    for (let i = 1; i <= 10; i++) {
      tablePromises.push(
        addDoc(collection(db, 'tables'), {
          restaurantId: restaurantRef.id,
          tableNumber: i.toString(),
          seatCount: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          tableType: i <= 6 ? 'regular' : i <= 8 ? 'booth' : 'bar',
          positionX: (i % 4) * 100,
          positionY: Math.floor(i / 4) * 100,
          isActive: true,
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
    }

    await Promise.all(tablePromises);
    console.log('Created 10 sample tables');

    // Create demo restaurant
    const demoRestaurantRef = await addDoc(collection(db, 'restaurants'), {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      email: "demo@restaurant.com",
      phone: "(555) 987-6543",
      address: "456 Demo Ave, Demo City",
      avgServiceTimeMinutes: 30,
      settings: {
        maxPartySize: 12,
        autoAssignTables: false
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Demo restaurant created with ID:', demoRestaurantRef.id);

    // Create tables for demo restaurant
    const demoTablePromises = [];
    for (let i = 1; i <= 6; i++) {
      demoTablePromises.push(
        addDoc(collection(db, 'tables'), {
          restaurantId: demoRestaurantRef.id,
          tableNumber: i.toString(),
          seatCount: 4,
          tableType: 'regular',
          isActive: true,
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
    }

    await Promise.all(demoTablePromises);
    console.log('Created 6 demo tables');

    console.log('Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();