from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.platform import SolarPlatformConnection
from app.schemas.platform import PlatformConnectionCreate, PlatformConnectionOut, PlatformTestResult
from app.utils.auth import get_current_user
from app.utils.encryption import encrypt_credentials, decrypt_credentials
from app.services.solar_platforms import get_adapter

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("", response_model=List[PlatformConnectionOut])
def list_platforms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SolarPlatformConnection).filter(
        SolarPlatformConnection.user_id == current_user.id
    ).all()


@router.post("/test", response_model=PlatformTestResult)
async def test_platform(payload: PlatformConnectionCreate, current_user: User = Depends(get_current_user)):
    try:
        adapter = get_adapter(payload.platform_type, payload.credentials)
        result = await adapter.test_connection()
        return PlatformTestResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=PlatformConnectionOut)
async def add_platform(
    payload: PlatformConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        adapter = get_adapter(payload.platform_type, payload.credentials)
        result = await adapter.test_connection()
        if not result["success"]:
            raise HTTPException(status_code=400, detail=f"Connection failed: {result['message']}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    encrypted = encrypt_credentials(payload.credentials)
    conn = SolarPlatformConnection(
        user_id=current_user.id,
        platform_type=payload.platform_type,
        display_name=payload.display_name,
        credentials_encrypted=encrypted,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.delete("/{platform_id}")
def remove_platform(
    platform_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = db.query(SolarPlatformConnection).filter(
        SolarPlatformConnection.id == platform_id,
        SolarPlatformConnection.user_id == current_user.id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Platform not found")
    db.delete(conn)
    db.commit()
    return {"ok": True}


@router.post("/{platform_id}/sync-sites")
async def sync_sites(
    platform_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pull all sites from this platform connection and create project records."""
    from app.models.project import SolarProject

    conn = db.query(SolarPlatformConnection).filter(
        SolarPlatformConnection.id == platform_id,
        SolarPlatformConnection.user_id == current_user.id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Platform not found")

    credentials = decrypt_credentials(conn.credentials_encrypted)
    adapter = get_adapter(conn.platform_type, credentials)

    try:
        sites = await adapter.get_sites()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch sites: {str(e)}")

    created = []
    for site in sites:
        existing = db.query(SolarProject).filter(
            SolarProject.platform_connection_id == conn.id,
            SolarProject.external_site_id == site.site_id,
        ).first()
        if not existing:
            project = SolarProject(
                user_id=current_user.id,
                platform_connection_id=conn.id,
                external_site_id=site.site_id,
                name=site.name,
                address=site.address,
                latitude=site.lat,
                longitude=site.lng,
                installed_capacity_kw=site.capacity_kw,
                timezone=site.timezone,
            )
            db.add(project)
            created.append(site.name)

    db.commit()
    return {"created": len(created), "sites": created}
