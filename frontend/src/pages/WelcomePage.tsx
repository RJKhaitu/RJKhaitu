import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Zap, CloudSun, BarChart2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PLATFORM_TILES = [
  { name: 'SolarEdge',  logo: '⚡', color: 'bg-blue-50   border-blue-200',   text: 'text-blue-700'   },
  { name: 'Enphase',    logo: '🔆', color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { name: 'Fronius',    logo: '🌞', color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
  { name: 'SMA',        logo: '☀️', color: 'bg-sky-50    border-sky-200',    text: 'text-sky-700'    },
  { name: 'Growatt',    logo: '🌱', color: 'bg-green-50  border-green-200',  text: 'text-green-700'  },
]

export default function WelcomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <Sun className="text-amber-500" size={26} />
          <span className="text-xl font-black text-gray-900">SolarHub</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          Skip for now <ArrowRight size={14} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16 text-center">
        {/* Greeting */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Sun className="text-amber-500" size={34} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Welcome, {user?.first_name}! 👋
          </h1>
          <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
            Let's connect your first solar platform so we can start tracking your production.
          </p>
        </div>

        {/* Platform tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10 w-full max-w-2xl">
          {PLATFORM_TILES.map(p => (
            <Link
              key={p.name}
              to="/platforms"
              className={`border-2 rounded-2xl px-4 py-5 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 ${p.color}`}
            >
              <span className="text-3xl">{p.logo}</span>
              <span className={`text-sm font-bold ${p.text}`}>{p.name}</span>
            </Link>
          ))}
        </div>

        {/* Energy monitoring mention */}
        <div className="mb-8 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full text-left">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="text-purple-500" size={18} />
            <span className="font-bold text-gray-800 text-sm">Energy Monitoring Platforms</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Also supports generic energy monitoring via direct CSV import or API key — set up from the Platforms page.
          </p>
          <Link to="/platforms" className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
            Browse all integrations <ArrowRight size={11} />
          </Link>
        </div>

        {/* CTA */}
        <Link to="/platforms" className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
          <Zap size={16} /> Connect a Platform
        </Link>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
          <Highlight icon={<BarChart2 className="text-amber-500" size={18} />} title="7 / 14 / 30-day history" desc="See production trends at a glance." />
          <Highlight icon={<CloudSun className="text-sky-500" size={18} />} title="Live weather & irradiance" desc="Understand how weather affects output." />
          <Highlight icon={<Zap className="text-purple-500" size={18} />} title="AI fault detection" desc="Spot soiling, shading & faults early." />
        </div>
      </main>
    </div>
  )
}

function Highlight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">{icon} <span className="font-bold text-gray-800 text-sm">{title}</span></div>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  )
}
