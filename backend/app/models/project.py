from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SolarProject(Base):
    __tablename__ = "solar_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform_connection_id = Column(Integer, ForeignKey("solar_platform_connections.id"), nullable=False)
    external_site_id = Column(String, nullable=False)  # ID on the solar platform
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    installed_capacity_kw = Column(Float, nullable=True)
    panel_count = Column(Integer, nullable=True)
    installation_date = Column(DateTime, nullable=True)
    timezone = Column(String, default="UTC")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    platform_connection = relationship("SolarPlatformConnection", back_populates="projects")
    production_records = relationship("ProductionRecord", back_populates="project", cascade="all, delete-orphan")
    weather_records = relationship("WeatherRecord", back_populates="project", cascade="all, delete-orphan")
