import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Plus, Trash2, RefreshCw, ChevronLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '../services/api'
import { PlatformConnection, PlatformType } from '../types'

const PLATFORMS: { type: PlatformType; name: string; logo: string; fields: { key: string; label: string; type: string; placeholder: string }[] }[] = [
  {
    type: 'solaredge',
    name: 'SolarEdge',
    logo: '⚡',
    fields: [{ key: 'api_key', label: 'API Key', type: 'text', placeholder: 'Your SolarEdge API key' }],
  },
  {
    type: 'enphase',
    name: 'Enphase',
    logo: '🔆',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'Enphase developer API key' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'OAuth access token' },
    ],
  },
  {
    type: 'fronius',
    name: 'Fronius',
    logo: '🌞',
    fields: [
      { key: 'host', label: 'Inverter Host/IP', type: 'text', placeholder: '192.168.1.100 or cloud hostname' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Inverter password' },
    ],
  },
  {
    type: 'sma',
    name: 'SMA',
    logo: '☀️',
    fields: [
      { key: 'username', label: 'Sunny Portal Email', type: 'email', placeholder: 'your@email.com' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Sunny Portal password' },
    ],
  },
  {
    type: 'growatt',
    name: 'Growatt',
    logo: '🌱',
    fields: [
      { key: 'username', label: 'ShineServer Username', type: 'text', placeholder: 'Your Growatt username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Your Growatt password' },
    ],
  },
]

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([])
  const [selected, setSelected] = useState<typeof PLATFORMS[0] | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [displayName, setDisplayName] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sites_found?: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = () => api.get('/platforms').then(r => setPlatforms(r.data))
  useEffect(() => { load() }, [])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post('/platforms/test', {
        platform_type: selected!.type,
        display_name: displayName || selected!.name,
        credentials: form,
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleAdd = async () => {
    setError('')
    setSubmitting(true)
    try {
      await api.post('/platforms', {
        platform_type: selected!.type,
        display_name: displayName || selected!.name,
        credentials: form,
      })
      await load()
      setSelected(null)
      setForm({})
      setDisplayName('')
      setTestResult(null)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to add platform')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSyncSites = async (platformId: number) => {
    setSyncing(platformId)
    try {
      const res = await api.post(`/platforms/${platformId}/sync-sites`)
      alert(`Synced ${res.data.created} new site(s): ${res.data.sites.join(', ') || 'none new'}`)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this platform? All associated projects will be deleted.')) return
    await api.delete(`/platforms/${id}`)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <Sun className="text-amber-500" size={20} />
          <span className="font-bold text-gray-900">Connected Platforms</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Connected list */}
        {platforms.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-4">Your Platforms</h2>
            <div className="space-y-3">
              {platforms.map(p => (
                <div key={p.id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{p.display_name}</div>
                    <div className="text-xs text-gray-500 capitalize mt-0.5">
                      {p.platform_type} · {p.last_sync ? `Last sync: ${new Date(p.last_sync).toLocaleString()}` : 'Never synced'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncSites(p.id)}
                      disabled={syncing === p.id}
                      className="btn-secondary text-sm py-1.5 flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} className={syncing === p.id ? 'animate-spin' : ''} />
                      Sync Sites
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new */}
        <div>
          <h2 className="font-bold text-gray-800 mb-4">Connect a Platform</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {PLATFORMS.map(p => (
              <button
                key={p.type}
                onClick={() => { setSelected(p); setForm({}); setTestResult(null); setError('') }}
                className={`card text-center py-5 hover:border-amber-300 hover:shadow-md transition cursor-pointer ${selected?.type === p.type ? 'border-amber-400 bg-amber-50' : ''}`}
              >
                <div className="text-3xl mb-2">{p.logo}</div>
                <div className="text-sm font-semibold text-gray-700">{p.name}</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="card max-w-xl">
              <h3 className="font-bold text-gray-900 mb-5 text-lg">
                {selected.logo} Connect {selected.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Name</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="input"
                    placeholder={`My ${selected.name} System`}
                  />
                </div>

                {selected.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                    <input
                      type={f.type}
                      value={form[f.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="input"
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}

                {testResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${testResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {testResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                    <div>
                      {testResult.message}
                      {testResult.success && testResult.sites_found !== undefined && (
                        <span className="ml-1 font-semibold">({testResult.sites_found} site{testResult.sites_found !== 1 ? 's' : ''} found)</span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleTest} disabled={testing} className="btn-secondary flex items-center gap-2">
                    {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                    Test Connection
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={submitting || !testResult?.success}
                    className="btn-primary flex items-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Platform
                  </button>
                </div>
                <p className="text-xs text-gray-400">Credentials are encrypted with AES-256 before storage.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
