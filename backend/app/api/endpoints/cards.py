import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_admin_user
from app.models.enums import BudgetTier, CardStatus, QuestionStatus
from app.models.models import Answer, Card, CardSource, Question, User
from app.schemas.common import CardBase
from app.schemas.requests import CardUpdate

logger = logging.getLogger("travel_decision")

router = APIRouter()

def _generate_card_from_question(question: Question, answers: List[Answer]) -> dict:
    title = f"{question.city.name} — {question.topic.name} for {question.duration}"
    summary = (
        f"For a {question.duration} stay in {question.city.name}, locals recommend balancing {question.topic.name.lower()} "
        f"with your {question.budget_tier.value} budget tier."
    )
    recommendations = [
        "Pick a neighborhood close to daily amenities and reliable transit.",
        "Test internet speeds within the first week and have a backup option.",
        "Budget a 10-15% buffer for unexpected fees.",
    ]
    risks = ["Seasonal price spikes can impact your budget.", "Short-term rental rules change quickly."]
    fit_for = ["Remote workers", "Slow travel couples"]
    if answers:
        recommendations.append(f"Based on community answers, {answers[0].answer_text[:80]}...")
    return {
        "title": title,
        "summary": summary,
        "recommendations": recommendations,
        "risks": risks,
        "fit_for": fit_for,
    }

@router.post("/questions/{question_id}/generate-summary", response_model=CardBase)
def generate_summary(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only author can generate summary")
    answers = db.query(Answer).filter(Answer.question_id == question_id).limit(3).all()
    template = _generate_card_from_question(question, answers)
    card = Card(
        title=template["title"],
        city_id=question.city_id,
        topic_id=question.topic_id,
        duration=question.duration,
        budget_tier=question.budget_tier,
        requirements=question.requirements,
        summary=template["summary"],
        recommendations=template["recommendations"],
        risks=template["risks"],
        fit_for=template["fit_for"],
        status=CardStatus.draft,
        updated_at=datetime.utcnow(),
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    for answer in answers:
        db.add(CardSource(card_id=card.id, answer_id=answer.id))
    question.status = QuestionStatus.compiling
    db.commit()
    logger.info("Card draft generated %s for question %s", card.id, question.id)
    return card

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
        req_list = [req.strip() for req in requirements.split(",") if req.strip()]
        for req in req_list:
            query = query.filter(Card.requirements.contains(req))
    return query.order_by(Card.updated_at.desc()).all()

@router.get("/cards/{card_id}", response_model=List[CardBase] if False else CardBase) # small fix for type hint if I were using List, but it's CardBase
def get_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.status != CardStatus.published:
        raise HTTPException(status_code=403, detail="Card not published")
    return card

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
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
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
    # Convert string IDs to integers only if they are numeric
    c_id = int(city_id) if city_id and city_id.isdigit() else None
    t_id = int(topic_id) if topic_id and topic_id.isdigit() else None
    
    return list_cards(
        city_id=c_id,
        topic_id=t_id,
        budget_tier=budget_tier,
        requirements=requirements,
        include_drafts=False,
        db=db
    )

