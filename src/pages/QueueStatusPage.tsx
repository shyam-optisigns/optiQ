import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

interface QueueStatus {
  queueId: string
  status: string
  position: number
  estimatedWaitMinutes: number
  customerName: string
  partySize: number
  restaurant: {
    name: string
    phone?: string
    address?: string
  }
  table?: {
    tableNumber: string
    seatCount: number
  }
  statusMessage: string
  createdAt: string
}

export default function QueueStatusPage() {
  const params = useParams()
  const queueId = params.queueId as string

  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!queueId) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/queue/status/${queueId}`)
        const data = await response.json()

        if (response.ok) {
          setQueueStatus(data)
        } else {
          setError(data.error || 'Failed to load queue status')
        }
      } catch (error) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Poll for updates every 60 seconds
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [queueId])

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'called': return 'bg-green-100 text-green-800 border-green-200'
      case 'seated': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading queue status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!queueStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Queue Entry Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Restaurant Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{queueStatus.restaurant.name}</h1>
          {queueStatus.restaurant.address && (
            <p className="text-gray-600 text-sm">{queueStatus.restaurant.address}</p>
          )}
        </div>

        {/* Queue Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Queue Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(queueStatus.status)}`}>
              {queueStatus.status.charAt(0).toUpperCase() + queueStatus.status.slice(1)}
            </span>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 mb-2">{queueStatus.statusMessage}</p>

              {queueStatus.status === 'waiting' && (
                <>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    #{queueStatus.position}
                  </div>
                  <p className="text-gray-600">Your position in queue</p>

                  {queueStatus.estimatedWaitMinutes > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-900">
                        Estimated wait: {formatWaitTime(queueStatus.estimatedWaitMinutes)}
                      </p>
                    </div>
                  )}
                </>
              )}

              {queueStatus.status === 'called' && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-900">
                    Please head to the restaurant!
                  </p>
                  {queueStatus.table && (
                    <p className="text-green-700 mt-2">
                      Table {queueStatus.table.tableNumber} is ready
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Party of {queueStatus.partySize}</span>
                <span>{queueStatus.customerName}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Joined at {new Date(queueStatus.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {queueStatus.restaurant.phone && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-2">Need to contact the restaurant?</h3>
            <a
              href={`tel:${queueStatus.restaurant.phone}`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {queueStatus.restaurant.phone}
            </a>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="text-center text-xs text-gray-500">
          Status updates automatically every 30 seconds
        </div>
      </div>
    </div>
  )
}
