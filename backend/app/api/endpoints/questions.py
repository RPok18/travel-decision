import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import BudgetTier, EntityType, QuestionStatus, ReactionType
from app.models.models import Answer, Question, Reaction, User
from app.schemas.common import AnswerBase, QuestionBase
from app.schemas.requests import QuestionCreate

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
    recent_cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_count = (
        db.query(Question)
        .filter(Question.author_id == current_user.id, Question.created_at >= recent_cutoff)
        .count()
    )
    if recent_count >= 3:
        raise HTTPException(status_code=429, detail="Daily question limit reached")
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
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    answers = db.query(Answer).filter(Answer.question_id == question_id).all()
    answer_ids = [answer.id for answer in answers]
    reactions = []
    if answer_ids:
        reactions = (
            db.query(Reaction)
            .filter(Reaction.entity_type == EntityType.answer, Reaction.entity_id.in_(answer_ids))
            .all()
        )
    help_map = {reaction.entity_id for reaction in reactions if reaction.reaction_type == ReactionType.helped}
    save_counts = {}
    like_counts = {}
    for reaction in reactions:
        if reaction.reaction_type == ReactionType.saved:
            save_counts[reaction.entity_id] = save_counts.get(reaction.entity_id, 0) + 1
        if reaction.reaction_type == ReactionType.thanks:
            like_counts[reaction.entity_id] = like_counts.get(reaction.entity_id, 0) + 1
    
    # helper for sorting answers
    contributor_helped_counts = {
        answer.user_id: db.query(Reaction)
        .join(Answer, Reaction.entity_id == Answer.id)
        .filter(Reaction.reaction_type == ReactionType.helped, Answer.user_id == answer.user_id)
        .count()
        for answer in answers
    }
    
    # Sort answers by helped, then save count, then author's global helpfulness, then time
    answers_sorted = sorted(
        answers,
        key=lambda answer: (
            0 if answer.id in help_map else 1,
            -save_counts.get(answer.id, 0),
            -contributor_helped_counts.get(answer.user_id, 0),
            answer.created_at,
        ),
    )
    
    # Question-level like count
    question_like_count = (
        db.query(Reaction)
        .filter(
            Reaction.entity_type == EntityType.question,
            Reaction.entity_id == question_id,
            Reaction.reaction_type == ReactionType.thanks,
        )
        .count()
    )

    def answer_to_dict(answer):
        base = AnswerBase.model_validate(answer).model_dump()
        base["like_count"] = like_counts.get(answer.id, 0)
        base["author_username"] = answer.author.username or answer.author.email.split("@")[0]
        return base

    q_base = QuestionBase.model_validate(question).model_dump()
    q_base["author_username"] = question.author.username or question.author.email.split("@")[0]

    return {
        "question": q_base,
        "question_like_count": question_like_count,
        "answers": [answer_to_dict(a) for a in answers_sorted],
    }

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    
    # Delete associated answers first (manual cascade)
    db.query(Answer).filter(Answer.question_id == question_id).delete()
    
    db.delete(question)
    db.commit()
    logger.info("Question %s deleted by %s", question_id, current_user.email)
    return {"status": "ok"}
