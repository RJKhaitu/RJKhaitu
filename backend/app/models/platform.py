from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SolarPlatformConnection(Base):
    __tablename__ = "solar_platform_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform_type = Column(String, nullable=False)  # solaredge, enphase, fronius, sma, huawei
    display_name = Column(String, nullable=False)
    credentials_encrypted = Column(Text, nullable=False)  # JSON blob, AES encrypted
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="platforms")
    projects = relationship("SolarProject", back_populates="platform_connection", cascade="all, delete-orphan")
