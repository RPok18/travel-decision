import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import User, UserProfile

logger = logging.getLogger("travel_decision")

GUEST_EMAIL = "member@travel.dev"


def resolve_or_create_guest(db: Session, email: Optional[str] = None) -> User:
    """
    Return a User for the given email, creating one if needed.
    Falls back to GUEST_EMAIL when no email is supplied.
    Always ensures a UserProfile exists for the returned user.
    """
    target_email = (email or GUEST_EMAIL).strip().lower()
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        user = User(email=target_email)
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Guest user created: %s", target_email)

    ensure_profile(db, user.id)
    return user


def ensure_profile(db: Session, user_id: int) -> UserProfile:
    """Return existing UserProfile or create an empty one."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id, cities_of_experience=[])
        db.add(profile)
        db.commit()
    return profile
