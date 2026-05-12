# SolarHub

Multi-platform solar monitoring with AI-powered diagnostics.

## Features

- **Multi-platform support**: SolarEdge, Enphase, Fronius, SMA, Growatt
- **One-click linking**: Enter your platform credentials and sites auto-import
- **Production tracking**: 7, 14, and 30-day production history per site
- **Weather integration**: Real-time weather via OpenWeatherMap with solar irradiance estimates
- **7-day forecast**: Expected production adjusted by weather forecast
- **AI fault detection**: Identifies soiling, shading, equipment issues, and clipping
- **Free / Pro tiers**:
  - **Free**: 24-hour delayed data, basic history, basic diagnostics
  - **Pro**: Real-time live power, auto-refresh, full AI diagnostics, expected vs actual comparison

## Quick Start

### Option A — Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your OPENWEATHER_API_KEY and SECRET_KEY

docker-compose up --build
```

Open http://localhost:3000

### Option B — Local Development

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit as needed
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Configuration

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret (change in production) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key (free tier works) |
| `ENCRYPTION_KEY` | 32-char key for encrypting stored credentials |
| `DATABASE_URL` | SQLite by default; swap to PostgreSQL for production |

## Supported Solar Platforms

| Platform | Auth Method |
|---|---|
| SolarEdge | API Key |
| Enphase | API Key + OAuth Access Token |
| Fronius | Local IP or cloud hostname + username/password |
| SMA (Ennexos) | Sunny Portal email + password |
| Growatt | ShineServer username + password |

## Architecture

```
frontend/          React + TypeScript + Tailwind + Recharts
backend/
  app/
    models/        SQLAlchemy ORM models
    routers/       FastAPI route handlers
    services/
      solar_platforms/  Adapters per brand
      weather.py        OpenWeatherMap integration
      production.py     History queries + forecast
      ai_diagnostics.py Fault detection engine
      scheduler.py      Hourly background sync
    utils/         Auth (JWT) + credential encryption
```
