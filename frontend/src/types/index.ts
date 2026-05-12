export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string | null
  address: string | null
  company_name: string | null
  is_active: boolean
  subscription_tier: 'free' | 'pro'
  is_pro: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

export interface PlatformConnection {
  id: number
  platform_type: string
  display_name: string
  is_active: boolean
  last_sync: string | null
  created_at: string
}

export interface SolarProject {
  id: number
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  installed_capacity_kw: number | null
  panel_count: number | null
  installation_date: string | null
  timezone: string
  notes: string | null
  platform_connection_id: number
  external_site_id: string
  created_at: string
}

export interface ProductionRecord {
  date: string
  energy_kwh: number
  peak_power_kw: number | null
}

export interface ProductionSummary {
  period_days: number
  total_kwh: number
  daily_average_kwh: number
  records: ProductionRecord[]
}

export interface ForecastDay {
  date: string
  estimated_kwh: number
  production_factor: number
  cloud_cover_pct: number
  description: string
  icon: string
  temp_max_c: number | null
  temp_min_c: number | null
}

export interface Diagnostic {
  issue: 'soiling' | 'shading' | 'equipment' | 'clipping' | 'weather' | 'ok'
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  description: string
  recommendation: string
}

export interface WeatherData {
  temperature_c: number
  humidity_pct: number
  cloud_cover_pct: number
  wind_speed_ms: number
  description: string
  icon: string
  irradiance_wm2: number
  city: string
}

export interface ProjectDashboard {
  project: SolarProject
  is_pro: boolean
  current_weather: WeatherData | null
  current_power_kw: number | null
  data_delayed: boolean
  delay_hours: number
  production_7d: ProductionSummary
  production_14d: ProductionSummary
  production_30d: ProductionSummary
  forecast_7d: ForecastDay[]
  expected_daily_kwh: number
  actual_daily_avg_kwh: number
  performance_ratio_pct: number | null
  diagnostics: Diagnostic[]
}

export type PlatformType = 'solaredge' | 'enphase' | 'fronius' | 'sma' | 'growatt'
