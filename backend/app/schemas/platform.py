from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class PlatformType(str, Enum):
    SOLAREDGE = "solaredge"
    ENPHASE = "enphase"
    FRONIUS = "fronius"
    SMA = "sma"
    HUAWEI = "huawei"
    GROWATT = "growatt"
    SOLARLOG = "solarlog"


class PlatformConnectionCreate(BaseModel):
    platform_type: PlatformType
    display_name: str
    credentials: Dict[str, Any]


class PlatformConnectionOut(BaseModel):
    id: int
    platform_type: str
    display_name: str
    is_active: bool
    last_sync: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PlatformTestResult(BaseModel):
    success: bool
    message: str
    sites_found: Optional[int] = None
