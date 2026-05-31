import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import BudgetTier, QuestionStatus
from app.models.models import Question, User
from app.schemas.common import QuestionBase
from app.schemas.requests import QuestionCreate
from app.services import question_service

logger = logging.getLogger("travel_decision")

router = APIRouter()


@router.get("", response_model=List[QuestionBase])
def list_questions(
    city_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Question)
    if city_id:
        query = query.filter(Question.city_id == city_id)
    if topic_id:
        query = query.filter(Question.topic_id == topic_id)
    if status_filter:
        query = query.filter(Question.status == QuestionStatus(status_filter))
    return query.order_by(Question.created_at.desc()).all()


@router.post("", response_model=QuestionBase)
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question_service.check_rate_limit(db, current_user.id)
    question = Question(
        city_id=payload.city_id,
        topic_id=payload.topic_id,
        author_id=current_user.id,
        duration=payload.duration,
        budget_tier=BudgetTier(payload.budget_tier),
        requirements=payload.requirements,
        question_text=payload.question_text,
        media_url=payload.media_url,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    logger.info("Question created %s by %s", question.id, current_user.email)
    return question


@router.get("/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    return question_service.get_question_detail(db, question_id)


@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question_service.delete_question(db, question_id, current_user)
    return {"status": "ok"}
