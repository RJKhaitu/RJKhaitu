from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import date


class SiteInfo:
    def __init__(self, site_id: str, name: str, address: str = "",
                 lat: float = 0.0, lng: float = 0.0,
                 capacity_kw: float = 0.0, installation_date: Optional[str] = None,
                 timezone: str = "UTC"):
        self.site_id = site_id
        self.name = name
        self.address = address
        self.lat = lat
        self.lng = lng
        self.capacity_kw = capacity_kw
        self.installation_date = installation_date
        self.timezone = timezone


class DailyProduction:
    def __init__(self, date: str, energy_kwh: float, peak_power_kw: float = 0.0):
        self.date = date
        self.energy_kwh = energy_kwh
        self.peak_power_kw = peak_power_kw


class BaseSolarAdapter(ABC):
    def __init__(self, credentials: dict):
        self.credentials = credentials

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test credentials and return {success, message, sites_found}"""

    @abstractmethod
    async def get_sites(self) -> List[SiteInfo]:
        """Return list of solar sites/projects linked to the account"""

    @abstractmethod
    async def get_daily_production(self, site_id: str, start_date: date, end_date: date) -> List[DailyProduction]:
        """Return daily production data for a site over a date range"""

    @abstractmethod
    async def get_current_power(self, site_id: str) -> Optional[float]:
        """Return current power output in kW"""
