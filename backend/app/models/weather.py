from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("solar_projects.id"), nullable=False)
    recorded_date = Column(String, nullable=False)  # YYYY-MM-DD
    temperature_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    cloud_cover_pct = Column(Float, nullable=True)
    wind_speed_ms = Column(Float, nullable=True)
    irradiance_wm2 = Column(Float, nullable=True)  # solar irradiance estimate
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("SolarProject", back_populates="weather_records")
