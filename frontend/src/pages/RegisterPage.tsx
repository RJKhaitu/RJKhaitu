import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/register', form)
      login(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex-col justify-center items-center p-12 text-white">
        <Sun size={72} className="mb-6 drop-shadow-xl" />
        <h1 className="text-4xl font-black mb-4">SolarHub</h1>
        <p className="text-xl text-white/90 text-center max-w-sm leading-relaxed">
          Connect all your solar platforms. Track production. Get AI-powered insights.
        </p>
        <div className="mt-10 space-y-3 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">✓</span> SolarEdge, Enphase, Fronius, SMA, Growatt
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">✓</span> 7, 14 & 30-day production estimates
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">✓</span> Live weather & irradiance data
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">✓</span> AI fault detection (soiling, shading & more)
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Sun className="text-amber-500" size={28} />
            <span className="text-2xl font-black text-gray-900">SolarHub</span>
          </div>

          <h2 className="text-3xl font-black text-gray-900 mb-1">Create account</h2>
          <p className="text-gray-500 mb-8">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name *</label>
                <input name="first_name" required value={form.first_name} onChange={handleChange} className="input" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name *</label>
                <input name="last_name" required value={form.last_name} onChange={handleChange} className="input" placeholder="Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} className="input" placeholder="john@example.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="input" placeholder="+1 (555) 000-0000" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
              <input name="address" value={form.address} onChange={handleChange} className="input" placeholder="123 Solar St, Sunnyvale, CA" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company name</label>
              <input name="company_name" value={form.company_name} onChange={handleChange} className="input" placeholder="Sunshine Solar LLC" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-12"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
