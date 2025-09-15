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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{restaurant?.name}</h1>
                <p className="mt-1 text-sm text-gray-500">Restaurant Queue Management</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{waitingQueue.length}</p>
                <p className="text-sm font-medium text-gray-500">In Queue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
                <p className="text-sm font-medium text-gray-500">Available</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.occupied}</p>
                <p className="text-sm font-medium text-gray-500">Occupied</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.cleaning}</p>
                <p className="text-sm font-medium text-gray-500">Cleaning</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <Utensils className="h-8 w-8 text-gray-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm font-medium text-gray-500">Total Tables</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Queue Management */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Current Queue</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {waitingQueue.length} waiting
                </span>
              </div>
            </div>

            <div className="p-6">
              {waitingQueue.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers in queue</h3>
                  <p className="text-gray-500">All caught up! Ready for new customers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {waitingQueue.map((entry, index) => {
                    const suggestedTables = getSuggestedTables(entry.partySize)
                    const waitTime = Math.round((Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60))
                    const isSeating = actionInProgress === `seat-${entry.id}`

                    return (
                      <div key={entry.id} className={`rounded-lg border-2 p-6 transition-all ${
                        index === 0 ? 'border-indigo-200 bg-indigo-50' :
                        isSeating ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                                index === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                              }`}>
                                #{index + 1}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{entry.customerName}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Party of {entry.partySize}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    Waiting {waitTime} min
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                              <Mail className="h-4 w-4" />
                              <span>{entry.customerEmail}</span>
                            </div>

                            {suggestedTables.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Suggested tables:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {suggestedTables.map((table) => (
                                    <button
                                      key={table.id}
                                      onClick={() => seatCustomer(entry.id, table.id)}
                                      disabled={isSeating}
                                      className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                                    >
                                      Table {table.tableNumber} ({table.seatCount} seats)
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="ml-6">
                            <button
                              onClick={() => seatCustomer(entry.id)}
                              disabled={isSeating}
                              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                            >
                              {isSeating ? 'Seating...' : 'Seat Now'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Table Management */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Table Layout</h2>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  Available ({getTableStats().available})
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  Occupied ({getTableStats().occupied})
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  Cleaning ({getTableStats().cleaning})
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tables.map((table) => {
                  const isUpdating = actionInProgress === `table-${table.id}`

                  return (
                    <div
                      key={table.id}
                      className={`relative rounded-xl border-2 p-6 text-center transition-all duration-200 min-h-[200px] ${
                        table.status === 'available' ? 'bg-green-50 border-green-200 hover:border-green-300' :
                        table.status === 'occupied' ? 'bg-red-50 border-red-200' :
                        table.status === 'cleaning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      } ${isUpdating ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}`}
                    >
                      {/* Status indicator */}
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                        table.status === 'available' ? 'bg-green-500' :
                        table.status === 'occupied' ? 'bg-red-500' :
                        table.status === 'cleaning' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}></div>

                      {/* Table info */}
                      <div className="mb-3">
                        <div className="text-2xl mb-1">🍽️</div>
                        <div className="font-bold text-xl text-gray-900">#{table.tableNumber}</div>
                        <div className="text-sm text-gray-600">{table.seatCount} seats</div>
                      </div>

                      {/* Customer info for occupied tables */}
                      {table.status === 'occupied' && table.currentCustomerName && (
                        <div className="mb-3 p-2 bg-white rounded-lg border">
                          <div className="font-semibold text-sm text-gray-900">{table.currentCustomerName}</div>
                          <div className="text-xs text-gray-600">Party of {table.currentPartySize}</div>
                          <div className="text-xs text-red-600 font-medium">{formatDuration(table.occupiedAt)} seated</div>
                        </div>
                      )}

                      {/* Status message */}
                      <div className={`text-xs font-semibold mb-3 py-1 px-2 rounded-full ${
                        table.status === 'available' ? 'bg-green-100 text-green-700' :
                        table.status === 'occupied' ? 'bg-red-100 text-red-700' :
                        table.status === 'cleaning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {table.status === 'occupied' ? 'OCCUPIED' :
                         table.status === 'cleaning' ? 'CLEANING' :
                         table.status === 'maintenance' ? 'MAINTENANCE' :
                         'AVAILABLE'}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {table.status === 'occupied' && (
                          <button
                            onClick={() => updateTableStatus(table.id, 'available')}
                            disabled={isUpdating}
                            className="w-full py-2 px-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? 'Clearing...' : '✅ Customer Left'}
                          </button>
                        )}

                        {table.status === 'cleaning' && (
                          <button
                            onClick={() => updateTableStatus(table.id, 'available')}
                            disabled={isUpdating}
                            className="w-full py-2 px-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? 'Setting Ready...' : '✨ Cleaned & Ready'}
                          </button>
                        )}

                        {table.status === 'available' && (
                          <div className="space-y-1">
                            <button
                              onClick={() => updateTableStatus(table.id, 'cleaning')}
                              disabled={isUpdating}
                              className="w-full py-1 px-2 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200 disabled:opacity-50"
                            >
                              🧽 Needs Cleaning
                            </button>
                            <button
                              onClick={() => updateTableStatus(table.id, 'maintenance')}
                              disabled={isUpdating}
                              className="w-full py-1 px-2 bg-gray-100 text-gray-800 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                            >
                              🔧 Maintenance
                            </button>
                          </div>
                        )}

                        {table.status === 'maintenance' && (
                          <button
                            onClick={() => updateTableStatus(table.id, 'available')}
                            disabled={isUpdating}
                            className="w-full py-2 px-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? 'Fixing...' : '✅ Fixed & Ready'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}