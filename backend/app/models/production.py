from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("solar_projects.id"), nullable=False)
    recorded_date = Column(String, nullable=False)  # YYYY-MM-DD
    energy_kwh = Column(Float, nullable=False)
    peak_power_kw = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("SolarProject", back_populates="production_records")
