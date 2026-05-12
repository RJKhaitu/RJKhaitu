from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    # "free" or "pro"
    subscription_tier = Column(String, default="free", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    platforms = relationship("SolarPlatformConnection", back_populates="owner", cascade="all, delete-orphan")
    projects = relationship("SolarProject", back_populates="owner", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_pro(self) -> bool:
        return self.subscription_tier == "pro"
