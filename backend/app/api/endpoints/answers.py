import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.models.models import Answer, Question, User, UserProfile
from app.schemas.common import AnswerBase
from app.schemas.requests import AnswerCreate

logger = logging.getLogger("travel_decision")

router = APIRouter()

@router.post("", response_model=AnswerBase)
def create_answer(
    payload: AnswerCreate,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    # Resolve user: use authenticated user if present, else payload.email, else "member@travel.dev"
    user = optional_user
    if not user:
        email = payload.email or "member@travel.dev"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
            # Ensure profile exists
            if not db.query(UserProfile).filter(UserProfile.user_id == user.id).first():
                db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
                db.commit()

    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Validate reply_to_id if given
    if payload.reply_to_id is not None:
        parent = db.query(Answer).filter(Answer.id == payload.reply_to_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent answer not found")

    answer = Answer(
        question_id=payload.question_id,
        user_id=user.id,
        reply_to_id=payload.reply_to_id,
        answer_text=payload.answer_text,
        context=payload.context or {},
        media_url=payload.media_url,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    logger.info("Answer created %s on question %s by %s", answer.id, question.id, user.email)
    return answer
