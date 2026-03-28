import json
import httpx
import logging
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_admin_user, get_optional_user
from app.core.config import settings
from app.models.enums import BudgetTier, CardStatus, QuestionStatus
from app.models.models import Answer, Card, CardSource, Question, User
from app.schemas.common import CardBase
from app.schemas.requests import CardUpdate

logger = logging.getLogger("travel_decision")

router = APIRouter()

async def _get_ai_summary(question: Question, answers: List[Answer]) -> dict:
    prompt = (
        f"Create a travel summary card for a {question.duration} trip to {question.city.name} "
        f"with a {question.budget_tier.value} budget. Topic: {question.topic.name}. "
        f"Additional requirements: {', '.join(question.requirements) if question.requirements else 'None'}. "
        f"Community advice: {' '.join([a.answer_text for a in answers]) if answers else 'None'}. "
        "Return a JSON object with: 'title' (string), 'summary' (string, 2 paragraphs), "
        "'recommendations' (list of strings), 'risks' (list of strings), 'fit_for' (list of strings)."
    )
    
    provider = settings.ai_provider
    model = settings.ai_model
    
    try:
        if provider == "ollama":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                return json.loads(data["response"])
        elif provider == "openrouter":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                )
                response.raise_for_status()
                data = response.json()
                return json.loads(data["choices"][0]["message"]["content"])
        else:
            # Fallback for now if no LLM configured
            return _generate_card_from_question(question, answers)
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        return _generate_card_from_question(question, answers)

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
async def generate_summary(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only author or admin can generate summary")

    answers = db.query(Answer).filter(Answer.question_id == question_id).limit(3).all()
    template = await _get_ai_summary(question, answers)
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

    # Draft access: allow admins and the source question's author
    is_admin = current_user and current_user.is_admin
    if is_admin:
        return card

    # Check if the current user is the author of the question that generated this card
    if current_user:
        source = db.query(CardSource).filter(CardSource.card_id == card_id).first()
        if source:
            answer = db.query(Answer).filter(Answer.id == source.answer_id).first()
            if answer:
                question = db.query(Question).filter(Question.id == answer.question_id).first()
                if question and question.author_id == current_user.id:
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

