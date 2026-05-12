import httpx
from datetime import date
from typing import List, Dict, Any, Optional
from app.services.solar_platforms.base import BaseSolarAdapter, SiteInfo, DailyProduction

BASE_URL = "https://monitoringapi.solaredge.com"


class SolarEdgeAdapter(BaseSolarAdapter):
    """
    Credentials: {"api_key": "...", "site_id": "..." (optional)}
    SolarEdge uses a single API key that gives access to all sites.
    """

    def _headers(self) -> dict:
        return {"Accept": "application/json"}

    def _api_key(self) -> str:
        return self.credentials.get("api_key", "")

    async def test_connection(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(
                    f"{BASE_URL}/sites/list",
                    params={"api_key": self._api_key(), "size": 1},
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    count = data.get("sites", {}).get("count", 0)
                    return {"success": True, "message": "Connection successful", "sites_found": count}
                return {"success": False, "message": f"API error: {resp.status_code}", "sites_found": 0}
            except Exception as e:
                return {"success": False, "message": str(e), "sites_found": 0}

    async def get_sites(self) -> List[SiteInfo]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/sites/list",
                params={"api_key": self._api_key(), "size": 100},
                headers=self._headers(),
            )
            resp.raise_for_status()
            sites_data = resp.json().get("sites", {}).get("site", [])
            result = []
            for s in sites_data:
                loc = s.get("location", {})
                result.append(SiteInfo(
                    site_id=str(s["id"]),
                    name=s.get("name", ""),
                    address=f"{loc.get('address', '')} {loc.get('city', '')}".strip(),
                    lat=loc.get("latitude", 0.0),
                    lng=loc.get("longitude", 0.0),
                    capacity_kw=s.get("peakPower", 0.0),
                    installation_date=s.get("installationDate"),
                    timezone=loc.get("timeZone", "UTC"),
                ))
            return result

    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/site/{site_id}/energy",
                params={
                    "api_key": self._api_key(),
                    "timeUnit": "DAY",
                    "startDate": start_date.isoformat(),
                    "endDate": end_date.isoformat(),
                },
                headers=self._headers(),
            )
            resp.raise_for_status()
            values = resp.json().get("energy", {}).get("values", [])
            result = []
            for v in values:
                if v.get("value") is not None:
                    result.append(DailyProduction(
                        date=v["date"][:10],
                        energy_kwh=round(v["value"] / 1000, 3),  # Wh -> kWh
                    ))
            return result

    async def get_current_power(self, site_id: str) -> Optional[float]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{BASE_URL}/site/{site_id}/currentPowerFlow",
                params={"api_key": self._api_key()},
                headers=self._headers(),
            )
            if resp.status_code == 200:
                pv = resp.json().get("siteCurrentPowerFlow", {}).get("PV", {})
                return pv.get("currentPower", 0.0)
            return None
