'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Phone, Clock, Users, Mail, ChevronRight } from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  phone?: string
  address?: string
  settings?: {
    maxPartySize?: number
  }
}

export default function RestaurantPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    partySize: 2
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRestaurant()
  }, [slug])

  const fetchRestaurant = async () => {
    try {
      const response = await fetch(`/api/restaurants/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setRestaurant(data)
      } else {
        setError('Restaurant not found')
      }
    } catch (err) {
      setError('Failed to load restaurant')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug: slug,
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/queue/${data.queueId}`)
      } else {
        setError(data.error || 'Failed to join queue')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Clean Header */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="px-6 py-8 text-center">
            <div className="text-4xl mb-4">🍽️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant?.name}</h1>
            <p className="text-gray-600">Join the digital queue</p>
          </div>

          {(restaurant?.address || restaurant?.phone) && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <div className="space-y-2">
                {restaurant?.address && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{restaurant.address}</span>
                  </div>
                )}
                {restaurant?.phone && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clean Form */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-6 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Join Queue</h2>
            <p className="text-gray-500 text-sm mt-1">Fill out your details below</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="customerName"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  required
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">We'll email you updates about your queue position</p>
              </div>

              <div>
                <label htmlFor="partySize" className="block text-sm font-medium text-gray-700 mb-2">
                  Party Size
                </label>
                <select
                  id="partySize"
                  value={formData.partySize}
                  onChange={(e) => setFormData(prev => ({ ...prev, partySize: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white appearance-none cursor-pointer"
                >
                  {Array.from({ length: restaurant?.settings?.maxPartySize || 8 }, (_, i) => (
                    <option key={i + 1} value={i + 1} className="text-gray-900">
                      {i + 1} {i === 0 ? 'person' : 'people'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Joining Queue...
                  </div>
                ) : (
                  'Join Queue'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-6">
          <div className="text-center">
            <div className="text-2xl mb-3">📧</div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Notifications</h3>
            <p className="text-gray-600 text-sm">
              We'll send you email updates about your position and notify you when your table is ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}