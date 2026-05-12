from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.production import ProductionRecord
from app.models.project import SolarProject


def get_production_summary(db: Session, project_id: int, days: int) -> Dict[str, Any]:
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=days - 1)

    records = (
        db.query(ProductionRecord)
        .filter(
            ProductionRecord.project_id == project_id,
            ProductionRecord.recorded_date >= start_date.isoformat(),
            ProductionRecord.recorded_date <= end_date.isoformat(),
        )
        .order_by(ProductionRecord.recorded_date)
        .all()
    )

    total_kwh = sum(r.energy_kwh for r in records)
    daily_avg = total_kwh / days if days > 0 else 0.0

    return {
        "period_days": days,
        "total_kwh": round(total_kwh, 2),
        "daily_average_kwh": round(daily_avg, 2),
        "records": [
            {
                "date": r.recorded_date,
                "energy_kwh": r.energy_kwh,
                "peak_power_kw": r.peak_power_kw,
            }
            for r in records
        ],
    }


def estimate_future_production(
    daily_avg_kwh: float,
    capacity_kw: float,
    forecast: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Estimate future daily production using historical average adjusted by weather forecast.
    """
    result = []
    for day in forecast:
        factor = day.get("production_factor", 1.0)
        estimated_kwh = round(daily_avg_kwh * factor, 2)
        result.append({
            "date": day["date"],
            "estimated_kwh": estimated_kwh,
            "production_factor": factor,
            "cloud_cover_pct": day.get("cloud_cover_pct", 0),
            "description": day.get("description", ""),
            "icon": day.get("icon", ""),
            "temp_max_c": day.get("temp_max_c"),
            "temp_min_c": day.get("temp_min_c"),
        })
    return result


async def sync_production_data(db: Session, project: SolarProject, connection_credentials: dict) -> int:
    """Pull latest production data from the solar platform and save to DB."""
    from app.services.solar_platforms import get_adapter
    from app.models.platform import SolarPlatformConnection

    conn = db.query(SolarPlatformConnection).filter(
        SolarPlatformConnection.id == project.platform_connection_id
    ).first()
    if not conn:
        return 0

    adapter = get_adapter(conn.platform_type, connection_credentials)

    # Sync last 35 days to catch any gaps
    end_date = date.today()
    start_date = end_date - timedelta(days=35)

    try:
        daily_records = await adapter.get_daily_production(project.external_site_id, start_date, end_date)
    except Exception:
        return 0

    saved = 0
    for rec in daily_records:
        existing = db.query(ProductionRecord).filter(
            ProductionRecord.project_id == project.id,
            ProductionRecord.recorded_date == rec.date,
        ).first()
        if existing:
            existing.energy_kwh = rec.energy_kwh
            existing.peak_power_kw = rec.peak_power_kw
        else:
            db.add(ProductionRecord(
                project_id=project.id,
                recorded_date=rec.date,
                energy_kwh=rec.energy_kwh,
                peak_power_kw=rec.peak_power_kw,
            ))
        saved += 1

    db.commit()
    return saved
