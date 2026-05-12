import httpx
import hashlib
from datetime import date
from typing import List, Dict, Any, Optional
from app.services.solar_platforms.base import BaseSolarAdapter, SiteInfo, DailyProduction

BASE_URL = "https://server.growatt.com"


def _md5(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()


class GrowattAdapter(BaseSolarAdapter):
    """
    Credentials: {"username": "...", "password": "..."}
    Uses Growatt ShineServer API.
    """

    async def _login(self, client: httpx.AsyncClient) -> str:
        resp = await client.post(
            f"{BASE_URL}/login",
            data={
                "account": self.credentials.get("username", ""),
                "password": _md5(self.credentials.get("password", "")),
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("result") != 1:
            raise ValueError(f"Growatt login failed: {data.get('msg', 'Unknown error')}")
        return data.get("user", {}).get("id", "")

    async def test_connection(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                user_id = await self._login(client)
                resp = await client.post(
                    f"{BASE_URL}/index/getPlantListTitle",
                    data={"userId": user_id},
                )
                plants = resp.json() if resp.status_code == 200 else []
                return {"success": True, "message": "Connection successful", "sites_found": len(plants)}
            except Exception as e:
                return {"success": False, "message": str(e), "sites_found": 0}

    async def get_sites(self) -> List[SiteInfo]:
        async with httpx.AsyncClient(timeout=15) as client:
            user_id = await self._login(client)
            resp = await client.post(
                f"{BASE_URL}/index/getPlantListTitle",
                data={"userId": user_id},
            )
            resp.raise_for_status()
            plants = resp.json()
            result = []
            for p in plants:
                result.append(SiteInfo(
                    site_id=str(p.get("id", "")),
                    name=p.get("plantName", "Growatt Plant"),
                    address=p.get("plantAddress", ""),
                    lat=float(p.get("plantLat", 0.0) or 0.0),
                    lng=float(p.get("plantLng", 0.0) or 0.0),
                    capacity_kw=float(p.get("nominalPower", 0.0) or 0.0) / 1000,
                    timezone=p.get("timezone", "UTC"),
                ))
            return result

    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        from datetime import timedelta
        results = []
        async with httpx.AsyncClient(timeout=20) as client:
            await self._login(client)
            current = start_date
            while current <= end_date:
                resp = await client.post(
                    f"{BASE_URL}/PlantDetail/getPlantDetailDay",
                    data={
                        "plantId": site_id,
                        "date": current.strftime("%Y-%m-%d"),
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    energy = float(data.get("energyDay", 0.0) or 0.0)
                    results.append(DailyProduction(date=current.isoformat(), energy_kwh=round(energy, 3)))
                current += timedelta(days=1)
        return results

    async def get_current_power(self, site_id: str) -> Optional[float]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                await self._login(client)
                resp = await client.post(
                    f"{BASE_URL}/panel/getPlantData",
                    data={"plantId": site_id},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return float(data.get("currentPower", 0.0) or 0.0)
            except Exception:
                pass
        return None
