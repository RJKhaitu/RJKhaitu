from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.project import SolarProject
from app.models.platform import SolarPlatformConnection
from app.utils.encryption import decrypt_credentials
from app.services.production import sync_production_data

scheduler = AsyncIOScheduler()


async def _sync_all_projects():
    db: Session = SessionLocal()
    try:
        projects = db.query(SolarProject).all()
        for project in projects:
            conn = db.query(SolarPlatformConnection).filter(
                SolarPlatformConnection.id == project.platform_connection_id,
                SolarPlatformConnection.is_active == True,
            ).first()
            if conn:
                credentials = decrypt_credentials(conn.credentials_encrypted)
                await sync_production_data(db, project, credentials)
    except Exception:
        pass
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        _sync_all_projects,
        trigger=IntervalTrigger(hours=1),
        id="sync_all_projects",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()
