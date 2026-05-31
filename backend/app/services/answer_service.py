import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import Answer, Question, User
from app.schemas.requests import AnswerCreate
from app.services.user_service import resolve_or_create_guest

logger = logging.getLogger("travel_decision")


def create_answer(
    db: Session,
    payload: AnswerCreate,
    optional_user: Optional[User],
) -> Answer:
    """
    Resolve the author, validate the question and optional parent answer,
    then persist and return the new Answer.
    """
   
    user = optional_user or resolve_or_create_guest(db, payload.email)

    
    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

   
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
    logger.info(
        "Answer %s created on question %s by %s",
        answer.id,
        question.id,
        user.email,
    )
    return answer
