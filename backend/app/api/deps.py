from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import verify_access_token
from app.models.models import User

# Define the scheme BEFORE using it
oauth2_scheme = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(db: Session = Depends(get_db), token_auth: HTTPBearer = Depends(oauth2_scheme)) -> User:
    try:
        # HTTPBearer returns an object, the actual token is in .credentials
        token = token_auth.credentials
        email = verify_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(db: Session = Depends(get_db), token_auth: Optional[HTTPBearer] = Depends(oauth2_scheme)) -> Optional[User]:
    if not token_auth or not token_auth.credentials:
        return None
    try:
        token = token_auth.credentials
        email = verify_access_token(token)
        return db.query(User).filter(User.email == email).first()
    except Exception:
        return None


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
