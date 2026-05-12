import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Crown, Zap, CloudSun, Brain, RefreshCw, CheckCircle, ChevronLeft, Sun } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const FREE_FEATURES = [
  'Connect unlimited solar platforms',
  '7, 14 & 30-day production history',
  'Basic weather information',
  'Data delayed 24 hours',
  'Basic issue detection',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Real-time production monitoring',
  'Live current power output',
  'Live weather + solar irradiance',
  'AI-powered fault detection (soiling, shading, equipment)',
  'Expected vs actual production comparison',
  'Auto-refresh every 5 minutes',
  'Priority support',
]

export default function UpgradePage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      await api.post('/auth/upgrade', { tier: 'pro' })
      await refreshUser()
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <Sun className="text-amber-500" size={20} />
          <span className="font-bold text-gray-900">Upgrade to Pro</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <Crown className="text-amber-400 mx-auto mb-3" size={40} />
          <h1 className="text-3xl font-black text-gray-900 mb-2">Get more from your solar system</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Upgrade to Pro for real-time data, AI diagnostics, and complete visibility into your solar performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Free */}
          <div className="card border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="badge-free text-sm">FREE</span>
              <span className="text-2xl font-black text-gray-900">$0<span className="text-sm font-normal text-gray-400">/mo</span></span>
            </div>
            <ul className="space-y-3">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!user?.is_pro && (
              <div className="mt-6 text-center text-sm text-gray-400 font-semibold">Current plan</div>
            )}
          </div>

          {/* Pro */}
          <div className="card border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="badge-pro text-sm"><Crown size={12} /> PRO</span>
              <span className="text-2xl font-black text-gray-900">$19<span className="text-sm font-normal text-gray-400">/mo</span></span>
            </div>
            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {user?.is_pro ? (
              <div className="text-center text-sm text-amber-700 font-semibold">✓ Current plan</div>
            ) : (
              <button onClick={handleUpgrade} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Crown size={14} />}
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureHighlight icon={<Zap className="text-purple-500" size={24} />} title="Real-Time Monitoring" desc="See your current power output live, updated every 5 minutes automatically." />
          <FeatureHighlight icon={<CloudSun className="text-sky-500" size={24} />} title="Live Weather Impact" desc="Understand exactly how cloud cover and irradiance are affecting your production right now." />
          <FeatureHighlight icon={<Brain className="text-green-500" size={24} />} title="AI Fault Detection" desc="Automatically detect soiling, shading, equipment faults, and clipping with confidence scores." />
        </div>
      </main>
    </div>
  )
}

function FeatureHighlight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  )
}
