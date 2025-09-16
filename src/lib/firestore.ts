import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Collection names
export const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  RESTAURANT_USERS: 'restaurantUsers',
  TABLES: 'tables',
  QUEUE_ENTRIES: 'queueEntries',
  QUEUE_HISTORY: 'queueHistory',
} as const;

// Type definitions
export interface Restaurant {
  id?: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  operatingHours?: Record<string, { open: string; close: string }>;
  avgServiceTimeMinutes: number;
  qrCodeUrl?: string;
  settings?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RestaurantUser {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  restaurantId: string;
  createdAt: Timestamp;
}

export interface Table {
  id?: string;
  restaurantId: string;
  tableNumber: string;
  seatCount: number;
  tableType: 'regular' | 'booth' | 'bar' | 'outdoor';
  positionX?: number;
  positionY?: number;
  isActive: boolean;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  occupiedAt?: Timestamp;
  currentPartySize?: number;
  currentCustomerName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QueueEntry {
  id?: string;
  restaurantId: string;
  tableId?: string;
  customerName: string;
  customerEmail: string;
  partySize: number;
  estimatedWaitMinutes: number;
  actualWaitMinutes?: number;
  status: 'waiting' | 'called' | 'seated' | 'no_show' | 'cancelled';
  priorityScore: number;
  notificationPreference: 'email' | 'none';
  lastNotificationSent?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  seatedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface QueueHistory {
  id?: string;
  restaurantId: string;
  customerName: string;
  customerEmail: string;
  partySize: number;
  estimatedWaitMinutes: number;
  actualWaitMinutes: number;
  tableId?: string;
  status: string;
  priorityScore: number;
  createdAt: Timestamp;
  seatedAt?: Timestamp;
  completedAt: Timestamp;
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  isPeakTime: boolean;
}

// Helper functions
export const createDocument = async (collectionName: string, data: any) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const getCollectionWhere = async (
  collectionName: string,
  field: string,
  operator: any,
  value: any,
  orderByField?: string,
  limitCount?: number
) => {
  let q = query(collection(db, collectionName), where(field, operator, value));

  if (orderByField) {
    q = query(q, orderBy(orderByField));
  }

  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  constraints: any[] = []
) => {
  let q = collection(db, collectionName);

  if (constraints.length > 0) {
    q = query(q, ...constraints) as any;
  }

  return onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};