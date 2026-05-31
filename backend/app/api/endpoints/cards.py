import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user, get_db, get_optional_user
from app.models.enums import BudgetTier, CardStatus
from app.models.models import Card, User
from app.schemas.common import CardBase
from app.schemas.requests import CardUpdate
from app.services import card_service

logger = logging.getLogger("travel_decision")

router = APIRouter()


@router.post("/questions/{question_id}/generate-summary", response_model=CardBase)
async def generate_summary(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await card_service.generate_card(db, question_id, current_user)


@router.get("/cards", response_model=List[CardBase])
def list_cards(
    city_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    budget_tier: Optional[str] = None,
    requirements: Optional[str] = None,
    include_drafts: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Card)
    if not include_drafts:
        query = query.filter(Card.status == CardStatus.published)
    if city_id:
        query = query.filter(Card.city_id == city_id)
    if topic_id:
        query = query.filter(Card.topic_id == topic_id)
    if budget_tier:
        try:
            query = query.filter(Card.budget_tier == BudgetTier(budget_tier))
        except ValueError:
            logger.warning("Invalid budget_tier: %s", budget_tier)
    if requirements:
        for req in [r.strip() for r in requirements.split(",") if r.strip()]:
            query = query.filter(Card.requirements.contains(req))
    return query.order_by(Card.updated_at.desc()).all()


@router.get("/cards/{card_id}", response_model=CardBase)
def get_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.status == CardStatus.published:
        return card
    if current_user:
        return card
    raise HTTPException(status_code=403, detail="Card not published")


@router.put("/cards/{card_id}", response_model=CardBase)
def update_card(
    card_id: int,
    payload: CardUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(card, key, value)
    card.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(card)
    logger.info("Card updated %s", card.id)
    return card


@router.get("/search/cards", response_model=List[CardBase])
def search_cards(
    city_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    budget_tier: Optional[str] = None,
    requirements: Optional[str] = None,
    db: Session = Depends(get_db),
):
    c_id = int(city_id) if city_id and city_id.isdigit() else None
    t_id = int(topic_id) if topic_id and topic_id.isdigit() else None
    return list_cards(
        city_id=c_id,
        topic_id=t_id,
        budget_tier=budget_tier,
        requirements=requirements,
        include_drafts=False,
        db=db,
    )
