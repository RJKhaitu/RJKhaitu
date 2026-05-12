import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Sun, Wind, Droplets, CloudSun, Zap, TrendingUp, AlertTriangle,
  CheckCircle, RefreshCw, ChevronLeft, ThermometerSun, Crown,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ProjectDashboard, Diagnostic } from '../types'
import { format, parseISO } from 'date-fns'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<ProjectDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [period, setPeriod] = useState<7 | 14 | 30>(30)

  const fetchDashboard = useCallback(async () => {
    const res = await api.get(`/projects/${id}/dashboard`)
    setData(res.data)
  }, [id])

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false))
    // Pro users get auto-refresh every 5 minutes
    if (user?.is_pro) {
      const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchDashboard, user?.is_pro])

  const sync = async () => {
    setSyncing(true)
    try {
      await api.post(`/projects/${id}/sync`)
      await fetchDashboard()
    } finally {
      setSyncing(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sun className="animate-spin text-amber-500 mr-2" size={24} />
        <span className="text-gray-500">Loading project...</span>
      </div>
    )
  }

  const prodData = period === 7 ? data.production_7d : period === 14 ? data.production_14d : data.production_30d
  const chartData = prodData.records.map(r => ({
    date: format(parseISO(r.date), 'd MMM'),
    actual: r.energy_kwh,
  }))

  const forecastChartData = data.forecast_7d.map(f => ({
    date: format(parseISO(f.date), 'EEE d'),
    estimated: f.estimated_kwh,
    factor: Math.round(f.production_factor * 100),
    clouds: f.cloud_cover_pct,
    desc: f.description,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Sun className="text-amber-500" size={18} />
                <span className="font-bold text-gray-900">{data.project.name}</span>
              </div>
              {data.project.address && (
                <div className="text-xs text-gray-500">{data.project.address}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.data_delayed && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Data delayed {data.delay_hours}h
              </span>
            )}
            {data.is_pro && user?.is_pro && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
              </span>
            )}
            <button onClick={sync} disabled={syncing} className="btn-secondary text-sm py-2 flex items-center gap-1.5">
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Zap className="text-blue-500" size={20} />}
            label="Capacity"
            value={`${data.project.installed_capacity_kw?.toFixed(1) ?? '—'} kW`}
            sub="installed"
          />
          <KpiCard
            icon={<TrendingUp className="text-green-500" size={20} />}
            label="30-Day Total"
            value={`${data.production_30d.total_kwh.toFixed(0)} kWh`}
            sub={`avg ${data.production_30d.daily_average_kwh.toFixed(1)} kWh/day`}
          />
          <KpiCard
            icon={<Sun className="text-amber-500" size={20} />}
            label="Expected Daily"
            value={`${data.expected_daily_kwh.toFixed(1)} kWh`}
            sub="weather-adjusted"
          />
          {data.is_pro && data.current_power_kw !== null ? (
            <KpiCard
              icon={<Zap className="text-purple-500 animate-pulse" size={20} />}
              label="Current Output"
              value={`${data.current_power_kw.toFixed(2)} kW`}
              sub="real-time"
              highlight
            />
          ) : (
            <KpiCard
              icon={<TrendingUp className="text-orange-500" size={20} />}
              label="Performance"
              value={data.performance_ratio_pct !== null ? `${data.performance_ratio_pct}%` : '—'}
              sub="vs expected"
            />
          )}
        </div>

        {/* Performance bar */}
        {data.performance_ratio_pct !== null && (
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Actual vs Expected Production</h3>
              <span className={`text-lg font-black ${data.performance_ratio_pct >= 80 ? 'text-green-600' : data.performance_ratio_pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {data.performance_ratio_pct}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${data.performance_ratio_pct >= 80 ? 'bg-green-400' : data.performance_ratio_pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, data.performance_ratio_pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Actual: {data.actual_daily_avg_kwh.toFixed(1)} kWh/day avg</span>
              <span>Expected: {data.expected_daily_kwh.toFixed(1)} kWh/day</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Production chart */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Production History</h3>
              <div className="flex gap-1">
                {([7, 14, 30] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${period === p ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {p}d
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={55} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, 'Production']} />
                {data.expected_daily_kwh > 0 && (
                  <ReferenceLine y={data.expected_daily_kwh} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Expected', fill: '#6366f1', fontSize: 11 }} />
                )}
                <Area type="monotone" dataKey="actual" stroke="#f59e0b" fill="url(#prodGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center border-t pt-4">
              <div>
                <div className="text-lg font-black text-gray-900">{data.production_7d.total_kwh.toFixed(1)}</div>
                <div className="text-xs text-gray-400">7-day kWh</div>
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">{data.production_14d.total_kwh.toFixed(1)}</div>
                <div className="text-xs text-gray-400">14-day kWh</div>
              </div>
              <div>
                <div className="text-lg font-black text-amber-600">{data.production_30d.total_kwh.toFixed(1)}</div>
                <div className="text-xs text-gray-400">30-day kWh</div>
              </div>
            </div>
          </div>

          {/* Weather panel */}
          <div className="space-y-4">
            {data.current_weather ? (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">Current Weather</h3>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={`https://openweathermap.org/img/wn/${data.current_weather.icon}@2x.png`}
                    alt={data.current_weather.description}
                    className="w-14 h-14"
                  />
                  <div>
                    <div className="text-3xl font-black text-gray-900">{data.current_weather.temperature_c.toFixed(1)}°C</div>
                    <div className="text-sm text-gray-500 capitalize">{data.current_weather.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <WeatherStat icon={<CloudSun size={14} className="text-gray-400" />} label="Cloud cover" value={`${data.current_weather.cloud_cover_pct}%`} />
                  <WeatherStat icon={<Droplets size={14} className="text-blue-400" />} label="Humidity" value={`${data.current_weather.humidity_pct}%`} />
                  <WeatherStat icon={<Wind size={14} className="text-teal-400" />} label="Wind" value={`${data.current_weather.wind_speed_ms} m/s`} />
                  <WeatherStat icon={<ThermometerSun size={14} className="text-amber-400" />} label="Irradiance" value={`${data.current_weather.irradiance_wm2} W/m²`} />
                </div>
              </div>
            ) : (
              <div className="card text-center text-gray-400 text-sm py-8">
                No location set for weather data
              </div>
            )}

            {/* Pro gate for real-time */}
            {!user?.is_pro && (
              <div className="card border-amber-200 bg-amber-50 text-center py-6">
                <Crown className="text-amber-400 mx-auto mb-2" size={28} />
                <div className="font-bold text-gray-800 text-sm mb-1">Pro Feature</div>
                <div className="text-xs text-gray-500 mb-3">Real-time power, live weather & AI diagnostics</div>
                <Link to="/upgrade" className="btn-primary text-xs py-1.5 px-4">Upgrade to Pro</Link>
              </div>
            )}
          </div>
        </div>

        {/* 7-day forecast */}
        {data.forecast_7d.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-5">7-Day Production Forecast</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={55} />
                <Tooltip
                  formatter={(v: number, name: string) => [name === 'estimated' ? `${v.toFixed(1)} kWh` : `${v}%`, name === 'estimated' ? 'Forecast' : 'Efficiency']}
                  labelFormatter={(l) => `${l}`}
                />
                <Bar dataKey="estimated" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {data.forecast_7d.map(f => (
                <div key={f.date} className="text-center">
                  <div className="text-xs text-gray-400 mb-1">{format(parseISO(f.date), 'EEE')}</div>
                  <img
                    src={`https://openweathermap.org/img/wn/${f.icon}.png`}
                    alt={f.description}
                    className="w-8 h-8 mx-auto"
                  />
                  <div className="text-xs font-bold text-amber-600">{f.estimated_kwh.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">kWh</div>
                  {f.temp_max_c !== null && (
                    <div className="text-xs text-gray-500">{Math.round(f.temp_max_c)}°</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Diagnostics */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800">AI System Diagnostics</h3>
            {!user?.is_pro && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                <Crown size={11} /> Full analysis in Pro
              </span>
            )}
          </div>
          <div className="space-y-3">
            {data.diagnostics.map((d, i) => (
              <DiagnosticItem key={i} diagnostic={d} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub: string; highlight?: boolean
}) {
  return (
    <div className={`card ${highlight ? 'border-purple-200 bg-purple-50' : ''}`}>
      <div className="flex items-center gap-2 mb-2">{icon} <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span></div>
      <div className={`text-2xl font-black ${highlight ? 'text-purple-700' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

function WeatherStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {icon}
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  )
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-50 border-red-200',
  high: 'bg-orange-50 border-orange-200',
  medium: 'bg-yellow-50 border-yellow-200',
  low: 'bg-blue-50 border-blue-200',
  none: 'bg-green-50 border-green-200',
}

const ISSUE_ICONS: Record<string, string> = {
  soiling: '🟤',
  shading: '🌫️',
  equipment: '🔧',
  clipping: '✂️',
  weather: '🌦️',
  ok: '✅',
}

function DiagnosticItem({ diagnostic }: { diagnostic: Diagnostic }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`border rounded-xl p-4 cursor-pointer transition ${SEVERITY_STYLES[diagnostic.severity] || 'bg-gray-50 border-gray-200'}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ISSUE_ICONS[diagnostic.issue] || '⚡'}</span>
          <div>
            <div className="font-semibold text-gray-900 capitalize text-sm">
              {diagnostic.issue === 'ok' ? 'System OK' : `${diagnostic.issue.replace('_', ' ')} detected`}
            </div>
            <div className="text-xs text-gray-500">
              Confidence: {Math.round(diagnostic.confidence * 100)}% · Severity: {diagnostic.severity}
            </div>
          </div>
        </div>
        {diagnostic.severity !== 'none' && (
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        )}
      </div>
      {(expanded || diagnostic.severity === 'none') && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-700">{diagnostic.description}</p>
          {diagnostic.recommendation && (
            <div className="p-2.5 bg-white/60 rounded-lg border border-white text-sm text-gray-600">
              <span className="font-semibold">Recommendation:</span> {diagnostic.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
