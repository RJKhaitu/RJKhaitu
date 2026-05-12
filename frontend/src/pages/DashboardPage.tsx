import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Zap, TrendingUp, AlertTriangle, Plus, RefreshCw, Settings, LogOut, Crown } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { SolarProject, PlatformConnection, ProjectDashboard } from '../types'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<SolarProject[]>([])
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([])
  const [dashboards, setDashboards] = useState<Record<number, ProjectDashboard>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/projects').then(r => r.data),
      api.get('/platforms').then(r => r.data),
    ]).then(([projs, plats]) => {
      setProjects(projs)
      setPlatforms(plats)
      projs.forEach((p: SolarProject) => {
        api.get(`/projects/${p.id}/dashboard`).then(r => {
          setDashboards(prev => ({ ...prev, [p.id]: r.data }))
        }).catch(() => {})
      })
    }).finally(() => setLoading(false))
  }, [])

  const syncProject = async (projectId: number) => {
    setSyncing(projectId)
    try {
      await api.post(`/projects/${projectId}/sync`)
      const r = await api.get(`/projects/${projectId}/dashboard`)
      setDashboards(prev => ({ ...prev, [projectId]: r.data }))
    } finally {
      setSyncing(null)
    }
  }

  const totalProduction30d = Object.values(dashboards).reduce(
    (sum, d) => sum + (d.production_30d?.total_kwh || 0), 0
  )
  const totalCapacity = projects.reduce((sum, p) => sum + (p.installed_capacity_kw || 0), 0)
  const criticalIssues = Object.values(dashboards).reduce((sum, d) => {
    return sum + (d.diagnostics?.filter(i => i.severity === 'critical' || i.severity === 'high').length || 0)
  }, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Sun className="animate-spin text-amber-500" size={24} />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="text-amber-500" size={24} />
            <span className="text-xl font-black text-gray-900">SolarHub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={user?.is_pro ? 'badge-pro' : 'badge-free'}>
              {user?.is_pro ? <><Crown size={12} /> PRO</> : 'FREE'}
            </span>
            <span className="text-sm text-gray-600 hidden sm:block">{user?.full_name}</span>
            <Link to="/platforms" className="btn-secondary text-sm py-2">
              <Settings size={15} className="inline mr-1" /> Platforms
            </Link>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary bar */}
        {!user?.is_pro && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <Crown size={16} className="text-amber-500" />
              <span>You're on the <strong>Free plan</strong> — data is delayed 24 hours. Upgrade to Pro for real-time monitoring & AI diagnostics.</span>
            </div>
            <Link to="/upgrade" className="btn-primary text-sm py-1.5 px-4 whitespace-nowrap">Upgrade</Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Sun className="text-amber-500" />} label="Total Sites" value={projects.length.toString()} sub={`${platforms.length} platform${platforms.length !== 1 ? 's' : ''} connected`} />
          <StatCard icon={<Zap className="text-blue-500" />} label="Total Capacity" value={`${totalCapacity.toFixed(1)} kW`} sub="installed" />
          <StatCard icon={<TrendingUp className="text-green-500" />} label="30-Day Production" value={`${totalProduction30d.toFixed(0)} kWh`} sub="across all sites" />
          <StatCard icon={<AlertTriangle className={criticalIssues > 0 ? 'text-red-500' : 'text-gray-300'} />} label="Active Alerts" value={criticalIssues.toString()} sub={criticalIssues > 0 ? 'needs attention' : 'all systems ok'} alert={criticalIssues > 0} />
        </div>

        {/* Projects */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Your Solar Sites</h2>
          <Link to="/platforms" className="btn-primary text-sm py-2 flex items-center gap-1.5">
            <Plus size={15} /> Add Platform
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                dashboard={dashboards[project.id]}
                onSync={() => syncProject(project.id)}
                syncing={syncing === project.id}
                isPro={user?.is_pro || false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, sub, alert }: { icon: React.ReactNode; label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`card ${alert ? 'border-red-200 bg-red-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

function ProjectCard({ project, dashboard, onSync, syncing, isPro }: {
  project: SolarProject
  dashboard?: ProjectDashboard
  onSync: () => void
  syncing: boolean
  isPro: boolean
}) {
  const topIssue = dashboard?.diagnostics?.find(d => d.issue !== 'ok')
  const severityColor: Record<string, string> = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200',
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{project.name}</h3>
          {project.address && <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>}
        </div>
        <div className="flex items-center gap-2">
          {dashboard?.data_delayed && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">24h delay</span>
          )}
          <button onClick={onSync} disabled={syncing} className="p-2 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Production stats */}
      {dashboard ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ProdBadge label="7 Days" value={dashboard.production_7d.total_kwh} />
            <ProdBadge label="14 Days" value={dashboard.production_14d.total_kwh} />
            <ProdBadge label="30 Days" value={dashboard.production_30d.total_kwh} highlight />
          </div>

          {/* Performance ratio */}
          {dashboard.performance_ratio_pct !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Performance vs Expected</span>
                <span className={dashboard.performance_ratio_pct >= 80 ? 'text-green-600' : 'text-orange-600'}>
                  {dashboard.performance_ratio_pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${dashboard.performance_ratio_pct >= 80 ? 'bg-green-400' : dashboard.performance_ratio_pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(100, dashboard.performance_ratio_pct)}%` }}
                />
              </div>
            </div>
          )}

          {/* Weather */}
          {dashboard.current_weather && (
            <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl mb-4 text-sm">
              <img
                src={`https://openweathermap.org/img/wn/${dashboard.current_weather.icon}@2x.png`}
                alt={dashboard.current_weather.description}
                className="w-10 h-10"
              />
              <div>
                <div className="font-semibold text-gray-800">{dashboard.current_weather.temperature_c.toFixed(1)}°C · {dashboard.current_weather.description}</div>
                <div className="text-xs text-gray-500">
                  {dashboard.current_weather.cloud_cover_pct}% cloud · {dashboard.current_weather.irradiance_wm2} W/m²
                  {isPro && dashboard.current_power_kw !== null && (
                    <span className="ml-2 text-green-600 font-semibold">{dashboard.current_power_kw?.toFixed(2)} kW live</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top diagnostic */}
          {topIssue && topIssue.severity !== 'none' && (
            <div className={`p-3 rounded-xl border text-sm mb-4 ${severityColor[topIssue.severity] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
              <div className="font-semibold capitalize mb-0.5">
                {topIssue.severity === 'critical' ? '🚨' : topIssue.severity === 'high' ? '⚠️' : topIssue.severity === 'medium' ? '🔶' : 'ℹ️'} {topIssue.issue.replace('_', ' ')} detected
              </div>
              <div className="text-xs opacity-90 line-clamp-2">{topIssue.description}</div>
            </div>
          )}

          {!topIssue && (
            <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 mb-4">
              ✓ System performing normally
            </div>
          )}
        </>
      ) : (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
          <Sun className="animate-pulse mr-2 text-amber-400" size={16} /> Loading data...
        </div>
      )}

      <Link
        to={`/projects/${project.id}`}
        className="block w-full text-center btn-secondary text-sm py-2.5 mt-2"
      >
        View full dashboard →
      </Link>
    </div>
  )
}

function ProdBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
      <div className={`text-lg font-black ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>{value.toFixed(0)}</div>
      <div className="text-xs text-gray-500 mt-0.5">kWh</div>
      <div className="text-xs font-semibold text-gray-400">{label}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-16">
      <Sun size={48} className="text-amber-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-800 mb-2">No solar sites yet</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Connect your solar platform (SolarEdge, Enphase, Fronius, SMA, or Growatt) to start monitoring.
      </p>
      <Link to="/platforms" className="btn-primary inline-flex items-center gap-2">
        <Plus size={16} /> Connect a Platform
      </Link>
    </div>
  )
}
