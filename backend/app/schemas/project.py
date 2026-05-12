from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class SolarProjectOut(BaseModel):
    id: int
    name: str
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    installed_capacity_kw: Optional[float]
    panel_count: Optional[int]
    installation_date: Optional[datetime]
    timezone: str
    notes: Optional[str]
    platform_connection_id: int
    external_site_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProductionSummary(BaseModel):
    date: str
    energy_kwh: float
    peak_power_kw: Optional[float]


class ProductionEstimate(BaseModel):
    period_days: int
    total_kwh: float
    daily_average_kwh: float
    records: List[ProductionSummary]


class ProjectDashboard(BaseModel):
    project: SolarProjectOut
    current_weather: Optional[dict]
    production_7d: ProductionEstimate
    production_14d: ProductionEstimate
    production_30d: ProductionEstimate
    forecast_7d: List[dict]
