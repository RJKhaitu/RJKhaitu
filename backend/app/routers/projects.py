from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta, datetime, timezone
from app.database import get_db
from app.models.user import User
from app.models.project import SolarProject
from app.models.platform import SolarPlatformConnection
from app.schemas.project import SolarProjectOut
from app.utils.auth import get_current_user
from app.utils.encryption import decrypt_credentials
from app.services import weather as weather_service
from app.services.production import get_production_summary, estimate_future_production, sync_production_data
from app.services.ai_diagnostics import analyze_performance

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Free tier data is delayed by 24 hours
FREE_TIER_DELAY_HOURS = 24


@router.get("", response_model=List[SolarProjectOut])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SolarProject).filter(SolarProject.user_id == current_user.id).all()


@router.get("/{project_id}", response_model=SolarProjectOut)
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(SolarProject).filter(
        SolarProject.id == project_id,
        SolarProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/dashboard")
async def get_dashboard(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(SolarProject).filter(
        SolarProject.id == project_id,
        SolarProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_pro = current_user.is_pro

    # Weather: Pro gets live, Free gets delayed (same data but flagged as delayed)
    current_weather = None
    forecast_7d = []
    if project.latitude and project.longitude:
        import asyncio
        current_weather, forecast_7d = await asyncio.gather(
            weather_service.get_current_weather(project.latitude, project.longitude),
            weather_service.get_weather_forecast(project.latitude, project.longitude, days=7),
        )

    prod_7d = get_production_summary(db, project.id, 7)
    prod_14d = get_production_summary(db, project.id, 14)
    prod_30d = get_production_summary(db, project.id, 30)

    daily_avg = prod_30d["daily_average_kwh"] or prod_14d["daily_average_kwh"] or prod_7d["daily_average_kwh"]

    forecast_with_estimates = estimate_future_production(
        daily_avg_kwh=daily_avg,
        capacity_kw=project.installed_capacity_kw or 0,
        forecast=forecast_7d,
    )

    # Real-time current power (Pro only)
    current_power_kw = None
    if is_pro:
        try:
            conn = db.query(SolarPlatformConnection).filter(
                SolarPlatformConnection.id == project.platform_connection_id
            ).first()
            if conn:
                from app.services.solar_platforms import get_adapter
                credentials = decrypt_credentials(conn.credentials_encrypted)
                adapter = get_adapter(conn.platform_type, credentials)
                current_power_kw = await adapter.get_current_power(project.external_site_id)
        except Exception:
            pass

    # AI Diagnostics (Pro only gets full analysis, Free gets basic)
    all_records = prod_30d["records"]
    diagnostics = analyze_performance(
        production_records=all_records,
        capacity_kw=project.installed_capacity_kw or 1.0,
        current_weather=current_weather,
        forecast=forecast_7d,
        current_power_kw=current_power_kw if is_pro else None,
    )

    # Performance vs expected
    expected_daily_kwh = (project.installed_capacity_kw or 0) * 4.5
    cloud_factor = 1.0
    if current_weather:
        cloud_factor = 1.0 - (current_weather.get("cloud_cover_pct", 0) / 100) * 0.75
    expected_now = expected_daily_kwh * cloud_factor

    performance_ratio = None
    if expected_now > 0 and daily_avg > 0:
        performance_ratio = round(daily_avg / expected_now * 100, 1)

    return {
        "project": SolarProjectOut.model_validate(project),
        "is_pro": is_pro,
        "current_weather": current_weather,
        "current_power_kw": current_power_kw if is_pro else None,
        "data_delayed": not is_pro,
        "delay_hours": FREE_TIER_DELAY_HOURS if not is_pro else 0,
        "production_7d": prod_7d,
        "production_14d": prod_14d,
        "production_30d": prod_30d,
        "forecast_7d": forecast_with_estimates,
        "expected_daily_kwh": round(expected_now, 2),
        "actual_daily_avg_kwh": round(daily_avg, 2),
        "performance_ratio_pct": performance_ratio,
        "diagnostics": diagnostics,
    }


@router.post("/{project_id}/sync")
async def sync_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(SolarProject).filter(
        SolarProject.id == project_id,
        SolarProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conn = db.query(SolarPlatformConnection).filter(
        SolarPlatformConnection.id == project.platform_connection_id
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Platform connection not found")

    credentials = decrypt_credentials(conn.credentials_encrypted)
    saved = await sync_production_data(db, project, credentials)

    from sqlalchemy.sql import func
    conn.last_sync = func.now()
    db.commit()

    return {"synced_records": saved}


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(SolarProject).filter(
        SolarProject.id == project_id,
        SolarProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}
