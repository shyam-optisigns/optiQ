'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock, Users, CheckCircle, XCircle, AlertTriangle, Utensils, Mail, Phone } from 'lucide-react'

interface QueueEntry {
  id: string
  customerName: string
  customerEmail: string
  partySize: number
  estimatedWaitMinutes: number
  status: string
  createdAt: string
  position?: number
}

interface Table {
  id: string
  tableNumber: string
  seatCount: number
  tableType: string
  status: string
  occupiedAt?: string
  currentPartySize?: number
  currentCustomerName?: string
}

interface Restaurant {
  id: string
  name: string
  phone?: string
  address?: string
}

export default function RestaurantDashboard() {
  const params = useParams()
  const restaurantSlug = params.restaurantSlug as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    if (restaurantSlug) {
      fetchData()

      // Real-time updates every 30 seconds (much more reasonable)
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [restaurantSlug])

  const fetchData = async () => {
    try {
      const [restaurantRes, queueRes, tablesRes] = await Promise.all([
        fetch(`/api/restaurants/${restaurantSlug}`),
        fetch(`/api/dashboard/${restaurantSlug}/queue`),
        fetch(`/api/dashboard/${restaurantSlug}/tables`)
      ])

      if (restaurantRes.ok) {
        const restaurantData = await restaurantRes.json()
        setRestaurant(restaurantData)
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setQueue(queueData)
      }

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json()
        setTables(tablesData)
      }

      setError('')
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const seatCustomer = async (queueId: string, tableId?: string) => {
    if (!restaurant) return

    setActionInProgress(`seat-${queueId}`)

    try {
      const response = await fetch(`/api/restaurants/by-id/${restaurant.id}/queue/${queueId}/seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId })
      })

      const data = await response.json()

      if (response.ok) {
        await fetchData() // Refresh data
      } else {
        alert(`❌ Error: ${data.error || 'Failed to seat customer'}`)
      }
    } catch (err) {
      alert('❌ Network error')
    } finally {
      setActionInProgress(null)
    }
  }

  const updateTableStatus = async (tableId: string, status: string) => {
    if (!restaurant) return

    setActionInProgress(`table-${tableId}`)

    try {
      const response = await fetch(`/api/dashboard/${restaurantSlug}/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await fetchData() // Refresh data

        // Show appropriate message based on action
        if (status === 'cleaning') {
          // Success message already handled
        } else if (status === 'available') {
          // Table is now ready for new guests
        }
      } else {
        alert('❌ Failed to update table status')
      }
    } catch (err) {
      alert('❌ Network error')
    } finally {
      setActionInProgress(null)
    }
  }

  const getSuggestedTables = (partySize: number): Table[] => {
    return tables
      .filter(table => table.status === 'available' && table.seatCount >= partySize)
      .sort((a, b) => {
        const wasteA = a.seatCount - partySize
        const wasteB = b.seatCount - partySize
        return wasteA - wasteB
      })
      .slice(0, 3)
  }

  const getTableStats = () => {
    const available = tables.filter(t => t.status === 'available').length
    const occupied = tables.filter(t => t.status === 'occupied').length
    const cleaning = tables.filter(t => t.status === 'cleaning').length
    const maintenance = tables.filter(t => t.status === 'maintenance').length

    return { available, occupied, cleaning, maintenance, total: tables.length }
  }

  const getTableTypeIcon = (tableType: string) => {
    switch (tableType) {
      case 'booth': return '🛋️'
      case 'bar': return '🍺'
      case 'patio': return '🌞'
      case 'regular':
      default: return '🍽️'
    }
  }


  const formatDuration = (timestamp: string | undefined) => {
    if (!timestamp) return ''
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60))
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const waitingQueue = queue.filter(entry => entry.status === 'waiting')
  const stats = getTableStats()

  return (
    <div className="h-screen bg-gray-50 overflow-hidden relative">
      {/* Clean Material Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-medium text-gray-900">
                {restaurant?.name || 'Restaurant Dashboard'}
              </h1>
              <div className="flex gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{stats.available} Available</span>
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">{stats.occupied} Occupied</span>
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="font-medium">{stats.cleaning} Cleaning</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Restaurant Floor Layout */}
      <div className="absolute inset-0 pt-20 bg-gray-50" style={{ right: '416px' }}>
        <div className="h-full w-full p-8 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {tables.map((table, index) => {
              const isUpdating = actionInProgress === `table-${table.id}`

              return (
                <div
                  key={table.id}
                  className={`relative bg-white rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                    table.status === 'available'
                      ? 'border-green-200 hover:border-green-300' :
                    table.status === 'occupied'
                      ? 'border-red-200 hover:border-red-300' :
                    table.status === 'cleaning'
                      ? 'border-amber-200 hover:border-amber-300' :
                    'border-gray-200 hover:border-gray-300'
                  } ${isUpdating ? 'opacity-60' : ''}`}
                  style={{
                    minHeight: '200px',
                    height: '200px'
                  }}
                >
                  {/* Status Dot */}
                  <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                    table.status === 'available' ? 'bg-green-500' :
                    table.status === 'occupied' ? 'bg-red-500' :
                    table.status === 'cleaning' ? 'bg-amber-500' :
                    'bg-gray-400'
                  }`}></div>

                  {/* Floating Action Button */}
                  {(table.status === 'occupied' || table.status === 'cleaning') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateTableStatus(table.id, 'available')
                      }}
                      disabled={isUpdating}
                      className={`absolute bottom-3 right-3 w-8 h-8 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                        table.status === 'occupied'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title={table.status === 'occupied' ? 'Customer Left' : 'Ready'}
                    >
                      <div className="text-white text-sm">
                        {isUpdating ? '...' : table.status === 'occupied' ? '✓' : '✨'}
                      </div>
                    </button>
                  )}

                  <div className="p-4 text-center h-full flex flex-col">
                    {/* Table Icon */}
                    <div className="mb-3">
                      <div className="text-3xl mb-2">
                        {getTableTypeIcon(table.tableType)}
                      </div>
                      <div className="font-semibold text-xl text-gray-900">
                        {table.tableNumber}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {table.seatCount} seats • {table.tableType}
                      </div>
                    </div>

                    {/* Customer Info Pills */}
                    {table.status === 'occupied' && table.currentCustomerName && (
                      <div className="mb-3 space-y-2">
                        <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          👤 {table.currentCustomerName}
                        </div>
                        <div className="flex justify-center gap-2">
                          <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            👥 {table.currentPartySize}
                          </div>
                          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            ⏱️ {formatDuration(table.occupiedAt)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="mt-auto">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        table.status === 'available'
                          ? 'bg-green-100 text-green-800' :
                        table.status === 'occupied'
                          ? 'bg-red-100 text-red-800' :
                        table.status === 'cleaning'
                          ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {table.status === 'available' ? 'Available' :
                         table.status === 'occupied' ? 'Occupied' :
                         table.status === 'cleaning' ? 'Cleaning' :
                         'Maintenance'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Material Design Queue Panel */}
      <div className="absolute top-24 right-6 bottom-6 w-96 bg-white rounded-2xl shadow-lg border z-40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Queue</h2>
              <p className="text-sm text-gray-500">Waiting customers</p>
            </div>
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              {waitingQueue.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {waitingQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <Users className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600 mb-1">No queue</p>
              <p className="text-sm text-gray-500">All customers seated</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-3">
              {waitingQueue.map((entry, index) => {
                const isSeating = actionInProgress === `seat-${entry.id}`
                const suggestedTables = getSuggestedTables(entry.partySize)
                const waitTime = Math.round((Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60))

                return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-xl p-4 transition-all ${
                      index === 0
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          index === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{entry.customerName}</div>
                          <div className="text-sm text-gray-500">Party of {entry.partySize}</div>
                        </div>
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded ${
                        waitTime > 30 ? 'bg-red-100 text-red-700' :
                        waitTime > 15 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {waitTime}m
                      </div>
                    </div>

                    {/* Suggested Tables */}
                    {suggestedTables.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-2">Suggested tables:</div>
                        <div className="flex gap-1 flex-wrap">
                          {suggestedTables.slice(0, 3).map((table) => (
                            <button
                              key={table.id}
                              onClick={() => seatCustomer(entry.id, table.id)}
                              disabled={isSeating}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                            >
                              {table.tableNumber}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => seatCustomer(entry.id)}
                      disabled={isSeating}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        index === 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {isSeating ? 'Seating...' : 'Seat Now'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}