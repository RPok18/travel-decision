import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.enums import EntityType, ReactionType, QuestionStatus
from app.models.models import Answer, Question, Reaction, User
from app.schemas.common import AnswerBase, QuestionBase

logger = logging.getLogger("travel_decision")

QUESTION_DAILY_LIMIT = 3


def check_rate_limit(db: Session, user_id: int) -> None:
    """Raise HTTP 429 if the user has posted >= 3 questions in the last 24 hours."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    count = (
        db.query(Question)
        .filter(Question.author_id == user_id, Question.created_at >= cutoff)
        .count()
    )
    if count >= QUESTION_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Daily question limit reached")


def get_question_detail(db: Session, question_id: int) -> Dict[str, Any]:
    """
    Return a question with its answers sorted by helpfulness, plus reaction counts.

    Original code had an N+1 query — it fired one DB call per answer to compute
    each author's global helpfulness score.  This version batches that into a
    single GROUP BY query over all unique author IDs in the answer set.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    answers: List[Answer] = (
        db.query(Answer).filter(Answer.question_id == question_id).all()
    )
    answer_ids = [a.id for a in answers]
    author_ids = list({a.user_id for a in answers})

   
    reactions: List[Reaction] = []
    if answer_ids:
        reactions = (
            db.query(Reaction)
            .filter(
                Reaction.entity_type == EntityType.answer,
                Reaction.entity_id.in_(answer_ids),
            )
            .all()
        )

    helped_set: set = {r.entity_id for r in reactions if r.reaction_type == ReactionType.helped}
    save_counts: Dict[int, int] = {}
    like_counts: Dict[int, int] = {}
    for r in reactions:
        if r.reaction_type == ReactionType.saved:
            save_counts[r.entity_id] = save_counts.get(r.entity_id, 0) + 1
        if r.reaction_type == ReactionType.thanks:
            like_counts[r.entity_id] = like_counts.get(r.entity_id, 0) + 1

    
    contributor_helped: Dict[int, int] = {}
    if author_ids:
        rows = (
            db.query(Answer.user_id, func.count(Reaction.id).label("cnt"))
            .join(Reaction, Reaction.entity_id == Answer.id)
            .filter(
                Reaction.reaction_type == ReactionType.helped,
                Answer.user_id.in_(author_ids),
            )
            .group_by(Answer.user_id)
            .all()
        )
        contributor_helped = {row.user_id: row.cnt for row in rows}

   
    answers_sorted = sorted(
        answers,
        key=lambda a: (
            0 if a.id in helped_set else 1,
            -save_counts.get(a.id, 0),
            -contributor_helped.get(a.user_id, 0),
            a.created_at,
        ),
    )

   
    question_like_count: int = (
        db.query(Reaction)
        .filter(
            Reaction.entity_type == EntityType.question,
            Reaction.entity_id == question_id,
            Reaction.reaction_type == ReactionType.thanks,
        )
        .count()
    )

    def _answer_dict(answer: Answer) -> Dict[str, Any]:
        base = AnswerBase.model_validate(answer).model_dump()
        base["like_count"] = like_counts.get(answer.id, 0)
        base["author_username"] = (
            answer.author.username or answer.author.email.split("@")[0]
        )
        return base

    q_base = QuestionBase.model_validate(question).model_dump()
    q_base["author_username"] = (
        question.author.username or question.author.email.split("@")[0]
    )

    return {
        "question": q_base,
        "question_like_count": question_like_count,
        "answers": [_answer_dict(a) for a in answers_sorted],
    }


def delete_question(db: Session, question_id: int, current_user: User) -> None:
    """Delete a question and cascade-delete its answers. Enforces ownership."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")

    db.query(Answer).filter(Answer.question_id == question_id).delete()
    db.delete(question)
    db.commit()
    logger.info("Question %s deleted by %s", question_id, current_user.email)
