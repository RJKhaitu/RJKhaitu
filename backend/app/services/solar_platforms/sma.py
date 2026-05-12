import httpx
from datetime import date, timedelta, datetime
from typing import List, Dict, Any, Optional
from app.services.solar_platforms.base import BaseSolarAdapter, SiteInfo, DailyProduction

BASE_URL = "https://ennexos.sunnyportal.com/api"


class SMAAdapter(BaseSolarAdapter):
    """
    Credentials: {"username": "...", "password": "..."}
    Uses SMA Ennexos / Sunny Portal REST API.
    """

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        resp = await client.post(
            f"{BASE_URL}/v1/token",
            json={
                "username": self.credentials.get("username", ""),
                "password": self.credentials.get("password", ""),
                "grant_type": "password",
            },
        )
        resp.raise_for_status()
        return resp.json().get("access_token", "")

    async def test_connection(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                token = await self._get_token(client)
                resp = await client.get(
                    f"{BASE_URL}/v1/plants",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    plants = resp.json()
                    return {"success": True, "message": "Connection successful", "sites_found": len(plants)}
                return {"success": False, "message": f"HTTP {resp.status_code}", "sites_found": 0}
            except Exception as e:
                return {"success": False, "message": str(e), "sites_found": 0}

    async def get_sites(self) -> List[SiteInfo]:
        async with httpx.AsyncClient(timeout=15) as client:
            token = await self._get_token(client)
            resp = await client.get(
                f"{BASE_URL}/v1/plants",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            plants = resp.json()
            result = []
            for p in plants:
                result.append(SiteInfo(
                    site_id=str(p.get("plantId", "")),
                    name=p.get("name", "SMA Plant"),
                    address=p.get("address", {}).get("street", ""),
                    lat=p.get("location", {}).get("latitude", 0.0),
                    lng=p.get("location", {}).get("longitude", 0.0),
                    capacity_kw=p.get("peakPower", 0.0),
                    timezone=p.get("timezone", "UTC"),
                ))
            return result

    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        async with httpx.AsyncClient(timeout=20) as client:
            token = await self._get_token(client)
            resp = await client.get(
                f"{BASE_URL}/v1/plants/{site_id}/measurements/energy",
                params={
                    "startTime": f"{start_date.isoformat()}T00:00:00Z",
                    "endTime": f"{end_date.isoformat()}T23:59:59Z",
                    "granularity": "DAY",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            records = resp.json().get("measurements", [])
            result = []
            for r in records:
                ts = r.get("timestamp", "")[:10]
                kwh = r.get("value", 0.0)
                result.append(DailyProduction(date=ts, energy_kwh=round(kwh, 3)))
            return result

    async def get_current_power(self, site_id: str) -> Optional[float]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                token = await self._get_token(client)
                resp = await client.get(
                    f"{BASE_URL}/v1/plants/{site_id}/measurements/live",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    meas = resp.json().get("measurements", [{}])
                    return meas[0].get("value", 0.0) / 1000 if meas else None
            except Exception:
                pass
        return None
