import httpx
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from app.services.solar_platforms.base import BaseSolarAdapter, SiteInfo, DailyProduction


class FroniusAdapter(BaseSolarAdapter):
    """
    Credentials: {"host": "192.168.x.x or cloud-hostname", "username": "...", "password": "..."}
    Supports Fronius Solar.web cloud or local Datalogger API.
    """

    def _base_url(self) -> str:
        host = self.credentials.get("host", "")
        if not host.startswith("http"):
            host = f"http://{host}"
        return host.rstrip("/")

    async def test_connection(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(
                    f"{self._base_url()}/solar_api/v1/GetInverterInfo.cgi",
                    auth=(self.credentials.get("username", ""), self.credentials.get("password", "")),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    inverters = data.get("Body", {}).get("Data", {})
                    return {"success": True, "message": "Connection successful", "sites_found": len(inverters)}
                return {"success": False, "message": f"HTTP {resp.status_code}", "sites_found": 0}
            except Exception as e:
                return {"success": False, "message": str(e), "sites_found": 0}

    async def get_sites(self) -> List[SiteInfo]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self._base_url()}/solar_api/v1/GetInverterInfo.cgi",
                auth=(self.credentials.get("username", ""), self.credentials.get("password", "")),
            )
            resp.raise_for_status()
            data = resp.json().get("Body", {}).get("Data", {})
            result = []
            for inv_id, inv in data.items():
                result.append(SiteInfo(
                    site_id=str(inv_id),
                    name=f"{inv.get('CustomName', 'Inverter')} ({inv.get('DT', '')})",
                    capacity_kw=inv.get("PVPower", 0.0) / 1000,
                ))
            return result

    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        results = []
        current = start_date
        async with httpx.AsyncClient(timeout=20) as client:
            while current <= end_date:
                resp = await client.get(
                    f"{self._base_url()}/solar_api/v1/GetArchiveData.cgi",
                    params={
                        "Scope": "System",
                        "StartDate": current.isoformat(),
                        "EndDate": current.isoformat(),
                        "Channel": "EnergyReal_WAC_Sum_Produced",
                    },
                    auth=(self.credentials.get("username", ""), self.credentials.get("password", "")),
                )
                if resp.status_code == 200:
                    body = resp.json().get("Body", {}).get("Data", {})
                    energy_wh = 0.0
                    for channel_data in body.values():
                        vals = channel_data.get("Data", {}).get("EnergyReal_WAC_Sum_Produced", {}).get("Values", {})
                        if vals:
                            energy_wh = max(vals.values())
                    results.append(DailyProduction(
                        date=current.isoformat(),
                        energy_kwh=round(energy_wh / 1000, 3),
                    ))
                current += timedelta(days=1)
        return results

    async def get_current_power(self, site_id: str) -> Optional[float]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self._base_url()}/solar_api/v1/GetPowerFlowRealtimeData.fcgi",
                auth=(self.credentials.get("username", ""), self.credentials.get("password", "")),
            )
            if resp.status_code == 200:
                body = resp.json().get("Body", {}).get("Data", {})
                p_pv = body.get("Site", {}).get("P_PV")
                if p_pv is not None:
                    return round(p_pv / 1000, 3)
            return None
