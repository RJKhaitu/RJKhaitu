from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    address: Optional[str]
    company_name: Optional[str]
    is_active: bool
    subscription_tier: str
    is_pro: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class UpgradeRequest(BaseModel):
    tier: str  # "pro" or "free"
