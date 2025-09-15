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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Restaurant Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2">{restaurant?.name}</h1>
              <p className="text-indigo-100 text-lg">Join the digital queue</p>
            </div>
          </div>

          <div className="px-8 py-6 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {restaurant?.address && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-3 text-indigo-600" />
                  <span className="text-sm">{restaurant.address}</span>
                </div>
              )}
              {restaurant?.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-3 text-indigo-600" />
                  <span className="text-sm">{restaurant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Queue Join Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Reserve Your Spot</h2>
            <p className="text-gray-600 text-center mt-2">Fill out the form below to join the queue</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="customerEmail"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg"
                      placeholder="your@email.com"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="partySize" className="block text-sm font-semibold text-gray-700 mb-2">
                    Party Size *
                  </label>
                  <div className="relative">
                    <select
                      id="partySize"
                      value={formData.partySize}
                      onChange={(e) => setFormData(prev => ({ ...prev, partySize: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg appearance-none bg-white cursor-pointer"
                    >
                      {Array.from({ length: restaurant?.settings?.maxPartySize || 8 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'person' : 'people'}
                        </option>
                      ))}
                    </select>
                    <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Joining Queue...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Clock className="h-6 w-6 mr-3" />
                    Join Queue
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-indigo-50 rounded-2xl border-2 border-indigo-100 p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">Stay Informed</h3>
            <p className="text-indigo-700 text-sm leading-relaxed">
              We'll send you email updates about your queue position and notify you when your table is ready.
              No need to wait around – you can leave and come back when it's your turn!
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">⏱️</div>
            <h4 className="font-semibold text-gray-900 mb-1">Real-time Updates</h4>
            <p className="text-sm text-gray-600">Get live position and wait time estimates</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">📧</div>
            <h4 className="font-semibold text-gray-900 mb-1">Email Notifications</h4>
            <p className="text-sm text-gray-600">No need to constantly check your position</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">🎯</div>
            <h4 className="font-semibold text-gray-900 mb-1">Smart Seating</h4>
            <p className="text-sm text-gray-600">Optimized table assignments for faster service</p>
          </div>
        </div>
      </div>
    </div>
  )
}