import httpx
from datetime import date
from typing import List, Dict, Any, Optional
from app.services.solar_platforms.base import BaseSolarAdapter, SiteInfo, DailyProduction

BASE_URL = "https://api.enphaseenergy.com/api/v4"


class EnphaseAdapter(BaseSolarAdapter):
    """
    Credentials: {"api_key": "...", "client_id": "...", "client_secret": "...", "access_token": "..."}
    Enphase uses OAuth2 + API key combo.
    """

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.credentials.get('access_token', '')}",
            "key": self.credentials.get("api_key", ""),
        }

    async def test_connection(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{BASE_URL}/systems", headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    count = len(data.get("systems", []))
                    return {"success": True, "message": "Connection successful", "sites_found": count}
                return {"success": False, "message": f"API error {resp.status_code}: {resp.text[:200]}", "sites_found": 0}
            except Exception as e:
                return {"success": False, "message": str(e), "sites_found": 0}

    async def get_sites(self) -> List[SiteInfo]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/systems", headers=self._headers())
            resp.raise_for_status()
            systems = resp.json().get("systems", [])
            result = []
            for s in systems:
                result.append(SiteInfo(
                    site_id=str(s["system_id"]),
                    name=s.get("name", f"System {s['system_id']}"),
                    address=s.get("address", ""),
                    lat=s.get("lat", 0.0),
                    lng=s.get("lng", 0.0),
                    capacity_kw=s.get("system_size_kw", 0.0),
                    installation_date=s.get("operational_at"),
                    timezone=s.get("timezone", "UTC"),
                ))
            return result

    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/systems/{site_id}/energy_lifetime",
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                },
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            production = data.get("production", [])
            start = date.fromisoformat(data.get("start_date", start_date.isoformat()))
            result = []
            for i, wh in enumerate(production):
                from datetime import timedelta
                d = start + timedelta(days=i)
                result.append(DailyProduction(
                    date=d.isoformat(),
                    energy_kwh=round(wh / 1000, 3),
                ))
            return result

    async def get_current_power(self, site_id: str) -> Optional[float]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{BASE_URL}/systems/{site_id}/summary",
                headers=self._headers(),
            )
            if resp.status_code == 200:
                return resp.json().get("current_power", 0.0) / 1000  # W -> kW
            return None
