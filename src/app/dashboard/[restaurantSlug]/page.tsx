'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock, Users, CheckCircle, XCircle, AlertTriangle, Plus } from 'lucide-react'

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
  const [tablePositions, setTablePositions] = useState<{[key: string]: {x: number, y: number}}>({})
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [newTableForm, setNewTableForm] = useState({
    tableNumber: '',
    seatCount: 4,
    tableType: 'regular' as 'regular' | 'booth' | 'bar' | 'outdoor'
  })

  useEffect(() => {
    if (restaurantSlug) {
      fetchData()
      fetchLayout()

      // Real-time updates every 10 seconds for better responsiveness
      const interval = setInterval(fetchData, 10000)
      return () => clearInterval(interval)
    }
  }, [restaurantSlug]) // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch (error) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLayout = async () => {
    try {
      const response = await fetch(`/api/dashboard/${restaurantSlug}/layout`)
      if (response.ok) {
        const data = await response.json()
        setTablePositions(data.tablePositions || {})
      }
    } catch (error) {
      console.error('Failed to load layout:', err)
    }
  }

  const saveLayout = async (positions: {[key: string]: {x: number, y: number}}) => {
    try {
      const response = await fetch(`/api/dashboard/${restaurantSlug}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tablePositions: positions })
      })

      if (!response.ok) {
        console.error('Failed to save layout')
      }
    } catch (error) {
      console.error('Failed to save layout:', err)
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
    } catch (error) {
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
    } catch (error) {
      alert('❌ Network error')
    } finally {
      setActionInProgress(null)
    }
  }

  const addTable = async () => {
    if (!restaurant || !newTableForm.tableNumber.trim()) return

    setActionInProgress('add-table')

    try {
      const response = await fetch(`/api/dashboard/${restaurantSlug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableNumber: newTableForm.tableNumber,
          seatCount: newTableForm.seatCount,
          tableType: newTableForm.tableType
        })
      })

      if (response.ok) {
        await fetchData() // Refresh data
        setShowAddTableModal(false)
        setNewTableForm({
          tableNumber: '',
          seatCount: 4,
          tableType: 'regular'
        })
      } else {
        const data = await response.json()
        alert(`❌ Error: ${data.error || 'Failed to add table'}`)
      }
    } catch (error) {
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



  const formatDuration = (timestamp: any) => {
    if (!timestamp) return ''

    // Handle Firebase Timestamp objects
    let dateTime: number
    if (timestamp.seconds) {
      // Firebase Timestamp object
      dateTime = timestamp.seconds * 1000
    } else if (typeof timestamp === 'string') {
      // String timestamp
      dateTime = new Date(timestamp).getTime()
    } else {
      // Already a number (milliseconds)
      dateTime = timestamp
    }

    if (isNaN(dateTime)) return ''

    const minutes = Math.floor((Date.now() - dateTime) / (1000 * 60))
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
            <div>
              <button
                onClick={() => setShowAddTableModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Restaurant Floor Layout */}
      <div className="absolute inset-0 pt-20 bg-gray-50" style={{ right: '416px' }}>
        <div className="h-full w-full p-4 overflow-auto relative">
          {/* Clean canvas for draggable tables */}
          <div className="relative w-full h-full min-h-[800px]">
            {tables.map((table, index) => {
              const isUpdating = actionInProgress === `table-${table.id}`

              // Get position from state or initialize with grid layout
              const position = tablePositions[table.id] || (() => {
                const row = Math.floor(index / 6)
                const col = index % 6
                const initialPos = {
                  x: 20 + col * 160,
                  y: 20 + row * 140
                }
                // Initialize position in state
                setTablePositions(prev => ({
                  ...prev,
                  [table.id]: initialPos
                }))
                return initialPos
              })()

              const handleMouseDown = (e: React.MouseEvent) => {
                const startX = e.clientX - position.x
                const startY = e.clientY - position.y
                let finalPosition = { x: position.x, y: position.y }

                const handleMouseMove = (e: MouseEvent) => {
                  const newX = Math.max(0, e.clientX - startX)
                  const newY = Math.max(0, e.clientY - startY)
                  finalPosition = { x: newX, y: newY }

                  setTablePositions(prev => ({
                    ...prev,
                    [table.id]: finalPosition
                  }))
                }

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)

                  // Save layout after drag is complete with the final position
                  setTablePositions(prev => {
                    const updatedPositions = {
                      ...prev,
                      [table.id]: finalPosition
                    }
                    saveLayout(updatedPositions)
                    return updatedPositions
                  })
                }

                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }

              return (
                <div
                  key={table.id}
                  onMouseDown={handleMouseDown}
                  className={`absolute bg-white rounded-2xl shadow-sm border hover:shadow-md cursor-move select-none ${
                    table.status === 'available'
                      ? 'border-green-200 hover:border-green-300' :
                    table.status === 'occupied'
                      ? 'border-red-200 hover:border-red-300' :
                    table.status === 'cleaning'
                      ? 'border-amber-200 hover:border-amber-300' :
                    'border-gray-200 hover:border-gray-300'
                  } ${isUpdating ? 'opacity-60' : ''}`}
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '180px',
                    height: '160px'
                  }}
                >

                  {/* Floating Action Buttons */}
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    {table.status === 'occupied' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateTableStatus(table.id, 'cleaning')
                        }}
                        disabled={isUpdating}
                        className="w-8 h-8 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
                        title="Customer Left"
                      >
                        <div className="text-white text-sm">✓</div>
                      </button>
                    )}

                    {table.status === 'cleaning' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateTableStatus(table.id, 'available')
                        }}
                        disabled={isUpdating}
                        className="w-8 h-8 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700"
                        title="Cleaned - Ready"
                      >
                        <div className="text-white text-xs">🧽</div>
                      </button>
                    )}
                  </div>

                  <div className="p-3 text-center h-full flex flex-col overflow-hidden">
                    {/* Table Type Pill */}
                    <div className="absolute top-2 left-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        table.tableType === 'booth' ? 'bg-purple-100 text-purple-800' :
                        table.tableType === 'bar' ? 'bg-orange-100 text-orange-800' :
                        table.tableType === 'patio' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {table.tableType}
                      </div>
                    </div>

                    {/* Availability Pill */}
                    <div className="absolute top-2 right-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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

                    {/* Table Info */}
                    <div className="mb-2 mt-6">
                      <div className="font-bold text-xl text-gray-900 mb-1">
                        {table.tableNumber}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {table.seatCount} seats
                      </div>
                    </div>

                    {/* Customer Info Pills */}
                    {table.status === 'occupied' && table.currentCustomerName && (
                      <div className="mb-2 space-y-1 flex-1">
                        <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold truncate max-w-full">
                          👤 {table.currentCustomerName}
                        </div>
                        <div className="flex justify-center gap-1">
                          <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            👥 {table.currentPartySize}
                          </div>
                          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            ⏱️ {formatDuration(table.occupiedAt)}
                          </div>
                        </div>
                      </div>
                    )}

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
                const waitTime = (() => {
                  if (!entry.createdAt) return 0

                  let createdTime: number
                  if ((entry.createdAt as any).seconds) {
                    // Firebase Timestamp object
                    createdTime = (entry.createdAt as any).seconds * 1000
                  } else if (typeof entry.createdAt === 'string') {
                    // String timestamp
                    createdTime = new Date(entry.createdAt).getTime()
                  } else {
                    // Already a number
                    createdTime = entry.createdAt as number
                  }

                  if (isNaN(createdTime)) return 0
                  return Math.round((Date.now() - createdTime) / (1000 * 60))
                })()

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

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add New Table</h2>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addTable(); }} className="space-y-4">
              {/* Table Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Number
                </label>
                <input
                  type="text"
                  required
                  value={newTableForm.tableNumber}
                  onChange={(e) => setNewTableForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="e.g., 1, A1, Patio-2"
                />
              </div>

              {/* Seat Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seat Count
                </label>
                <select
                  value={newTableForm.seatCount}
                  onChange={(e) => setNewTableForm(prev => ({ ...prev, seatCount: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  {[2, 4, 6, 8, 10, 12].map(count => (
                    <option key={count} value={count}>{count} seats</option>
                  ))}
                </select>
              </div>

              {/* Table Type Pills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Table Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'regular', label: 'Regular', color: 'bg-gray-100 text-gray-800' },
                    { value: 'booth', label: 'Booth', color: 'bg-purple-100 text-purple-800' },
                    { value: 'bar', label: 'Bar', color: 'bg-orange-100 text-orange-800' },
                    { value: 'outdoor', label: 'Outdoor', color: 'bg-green-100 text-green-800' }
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNewTableForm(prev => ({ ...prev, tableType: type.value as any }))}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        newTableForm.tableType === type.value
                          ? 'bg-blue-600 text-white'
                          : `${type.color} hover:opacity-80`
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === 'add-table'}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'add-table' ? 'Adding...' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}