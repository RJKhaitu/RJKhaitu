import httpx
from datetime import date, timedelta
from typing import Optional, List, Dict, Any
from app.config import settings

OWM_BASE = "https://api.openweathermap.org/data/2.5"
OWM_ONE_CALL = "https://api.openweathermap.org/data/3.0/onecall"


async def get_current_weather(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    if not settings.OPENWEATHER_API_KEY:
        return _mock_current_weather()

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{OWM_BASE}/weather",
                params={
                    "lat": lat,
                    "lon": lng,
                    "appid": settings.OPENWEATHER_API_KEY,
                    "units": "metric",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                clouds = data.get("clouds", {}).get("all", 0)
                return {
                    "temperature_c": data["main"]["temp"],
                    "humidity_pct": data["main"]["humidity"],
                    "cloud_cover_pct": clouds,
                    "wind_speed_ms": data["wind"]["speed"],
                    "description": data["weather"][0]["description"],
                    "icon": data["weather"][0]["icon"],
                    "irradiance_wm2": _estimate_irradiance(clouds),
                    "city": data.get("name", ""),
                }
        except Exception:
            pass
    return _mock_current_weather()


async def get_weather_forecast(lat: float, lng: float, days: int = 7) -> List[Dict[str, Any]]:
    if not settings.OPENWEATHER_API_KEY:
        return _mock_forecast(days)

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{OWM_BASE}/forecast",
                params={
                    "lat": lat,
                    "lon": lng,
                    "appid": settings.OPENWEATHER_API_KEY,
                    "units": "metric",
                    "cnt": days * 8,  # 3-hour intervals
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return _aggregate_forecast_by_day(data.get("list", []), days)
        except Exception:
            pass
    return _mock_forecast(days)


def _aggregate_forecast_by_day(intervals: list, days: int) -> List[Dict[str, Any]]:
    daily: Dict[str, Dict] = {}
    for entry in intervals:
        day_key = entry["dt_txt"][:10]
        if day_key not in daily:
            daily[day_key] = {
                "date": day_key,
                "temps": [],
                "clouds": [],
                "humidity": [],
                "descriptions": [],
                "icons": [],
            }
        daily[day_key]["temps"].append(entry["main"]["temp"])
        daily[day_key]["clouds"].append(entry["clouds"]["all"])
        daily[day_key]["humidity"].append(entry["main"]["humidity"])
        daily[day_key]["descriptions"].append(entry["weather"][0]["description"])
        daily[day_key]["icons"].append(entry["weather"][0]["icon"])

    result = []
    for day_key in sorted(daily.keys())[:days]:
        d = daily[day_key]
        avg_clouds = sum(d["clouds"]) / len(d["clouds"])
        result.append({
            "date": day_key,
            "temp_max_c": max(d["temps"]),
            "temp_min_c": min(d["temps"]),
            "humidity_pct": sum(d["humidity"]) / len(d["humidity"]),
            "cloud_cover_pct": avg_clouds,
            "description": d["descriptions"][len(d["descriptions"]) // 2],
            "icon": d["icons"][len(d["icons"]) // 2],
            "irradiance_wm2": _estimate_irradiance(avg_clouds),
            "production_factor": _cloud_to_production_factor(avg_clouds),
        })
    return result


def _estimate_irradiance(cloud_cover_pct: float) -> float:
    """Rough solar irradiance estimate based on cloud cover (W/m²)."""
    clear_sky = 1000.0
    return round(clear_sky * (1 - cloud_cover_pct / 100 * 0.75), 1)


def _cloud_to_production_factor(cloud_cover_pct: float) -> float:
    """0.0–1.0 factor representing expected production relative to clear sky."""
    return round(1.0 - (cloud_cover_pct / 100) * 0.75, 2)


def _mock_current_weather() -> Dict[str, Any]:
    return {
        "temperature_c": 22.5,
        "humidity_pct": 45.0,
        "cloud_cover_pct": 20.0,
        "wind_speed_ms": 3.5,
        "description": "few clouds",
        "icon": "02d",
        "irradiance_wm2": 850.0,
        "city": "Unknown (API key not configured)",
    }


def _mock_forecast(days: int) -> List[Dict[str, Any]]:
    import random
    result = []
    for i in range(days):
        d = date.today() + timedelta(days=i)
        clouds = random.uniform(5, 60)
        result.append({
            "date": d.isoformat(),
            "temp_max_c": round(20 + random.uniform(-5, 10), 1),
            "temp_min_c": round(12 + random.uniform(-5, 5), 1),
            "humidity_pct": round(random.uniform(30, 70), 1),
            "cloud_cover_pct": round(clouds, 1),
            "description": "partly cloudy",
            "icon": "02d",
            "irradiance_wm2": _estimate_irradiance(clouds),
            "production_factor": _cloud_to_production_factor(clouds),
        })
    return result
