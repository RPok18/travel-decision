import logging
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.models import OtpCode, User, UserProfile
from app.schemas.requests import OtpRequest, OtpVerify

logger = logging.getLogger("travel_decision")

router = APIRouter()

@router.post("/request-otp")
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    code = "".join(str(random.randint(0, 9)) for _ in range(6))
    expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes)
    db.add(OtpCode(email=payload.email, code=code, expires_at=expires_at))
    db.commit()
    logger.info("OTP requested for %s", payload.email)
    return {"message": "OTP created", "code": code}

@router.post("/verify-otp")
def verify_otp(payload: OtpVerify, db: Session = Depends(get_db)):
    otp = (
        db.query(OtpCode)
        .filter(OtpCode.email == payload.email, OtpCode.code == payload.code)
        .order_by(OtpCode.created_at.desc())
        .first()
    )
    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        user = User(email=payload.email)
        db.add(user)
        db.commit()
        db.refresh(user)
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
        db.commit()
    token = create_access_token(user.email)
    logger.info("User verified OTP %s", user.email)
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}

@router.post("/login")
def login_simple(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Simplified login for Swagger UI: get bearer token by email (username field).
    """
    email = form_data.username  # OAuth2 form uses 'username' field
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
        db.commit()

    token = create_access_token(user.email)
    logger.info("User logged in via simple auth: %s", user.email)
    return {"access_token": token, "token_type": "bearer"}
