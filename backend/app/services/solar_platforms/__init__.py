from app.services.solar_platforms.base import BaseSolarAdapter
from app.services.solar_platforms.solaredge import SolarEdgeAdapter
from app.services.solar_platforms.enphase import EnphaseAdapter
from app.services.solar_platforms.fronius import FroniusAdapter
from app.services.solar_platforms.sma import SMAAdapter
from app.services.solar_platforms.growatt import GrowattAdapter

PLATFORM_ADAPTERS = {
    "solaredge": SolarEdgeAdapter,
    "enphase": EnphaseAdapter,
    "fronius": FroniusAdapter,
    "sma": SMAAdapter,
    "growatt": GrowattAdapter,
}


def get_adapter(platform_type: str, credentials: dict) -> BaseSolarAdapter:
    adapter_class = PLATFORM_ADAPTERS.get(platform_type)
    if not adapter_class:
        raise ValueError(f"Unsupported platform: {platform_type}")
    return adapter_class(credentials)
