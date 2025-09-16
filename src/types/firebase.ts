import { Timestamp } from 'firebase/firestore'

export interface FirebaseDocument {
  id: string
  [key: string]: unknown
}

export interface RestaurantData extends FirebaseDocument {
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
  operatingHours?: Record<string, { open: string; close: string }>
  avgServiceTimeMinutes: number
  qrCodeUrl?: string
  settings?: Record<string, unknown>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TableData extends FirebaseDocument {
  restaurantId: string
  tableNumber: string
  seatCount: number
  tableType: 'regular' | 'booth' | 'bar' | 'outdoor'
  positionX?: number
  positionY?: number
  isActive: boolean
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
  occupiedAt?: Timestamp
  currentPartySize?: number
  currentCustomerName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface QueueEntryData extends FirebaseDocument {
  restaurantId: string
  tableId?: string
  customerName: string
  customerEmail: string
  partySize: number
  estimatedWaitMinutes: number
  actualWaitMinutes?: number
  status: 'waiting' | 'called' | 'seated' | 'no_show' | 'cancelled'
  priorityScore: number
  notificationPreference: 'email' | 'none'
  lastNotificationSent?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  seatedAt?: Timestamp
  completedAt?: Timestamp
}

export interface HistoricalEntryData extends FirebaseDocument {
  restaurantId: string
  customerName: string
  customerEmail: string
  partySize: number
  estimatedWaitMinutes: number
  actualWaitMinutes: number
  tableId?: string
  status: string
  priorityScore: number
  createdAt: Timestamp
  seatedAt?: Timestamp
  completedAt: Timestamp
  dayOfWeek: number
  hourOfDay: number
  isWeekend: boolean
  isPeakTime: boolean
}