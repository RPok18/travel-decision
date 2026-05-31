import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.models.enums import BudgetTier, EntityType, QuestionStatus, ReactionType
from app.models.models import Answer, City, Question, Reaction, Topic, User
from app.services import user_service

logger = logging.getLogger("travel_decision")

router = APIRouter()


@router.get("", response_model=dict)
def get_feed(
    limit: int = 20,
    offset: int = 0,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    last_answer_sq = (
        db.query(
            Answer.question_id.label("question_id"),
            func.max(Answer.created_at).label("last_message_at"),
        )
        .group_by(Answer.question_id)
        .subquery()
    )
    answer_count_sq = (
        db.query(
            Answer.question_id.label("question_id"),
            func.count(Answer.id).label("answer_count"),
        )
        .group_by(Answer.question_id)
        .subquery()
    )

    rows = (
        db.query(
            Question.id,
            Question.question_text,
            Question.created_at,
            User.id.label("author_id"),
            func.coalesce(User.username, User.email).label("author_display_name"),
            last_answer_sq.c.last_message_at,
            answer_count_sq.c.answer_count,
        )
        .join(User, User.id == Question.author_id)
        .outerjoin(last_answer_sq, last_answer_sq.c.question_id == Question.id)
        .outerjoin(answer_count_sq, answer_count_sq.c.question_id == Question.id)
    )

    if q:
        rows = rows.filter(func.lower(Question.question_text).like(f"%{q.lower()}%"))

    rows = (
        rows.order_by(
            func.coalesce(last_answer_sq.c.last_message_at, Question.created_at).desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    question_ids = [r.id for r in rows]
    like_counts: dict = {}
    if question_ids:
        like_rows = (
            db.query(Reaction.entity_id, func.count(Reaction.id).label("cnt"))
            .filter(
                Reaction.entity_type == EntityType.question,
                Reaction.entity_id.in_(question_ids),
                Reaction.reaction_type == ReactionType.thanks,
            )
            .group_by(Reaction.entity_id)
            .all()
        )
        like_counts = {r.entity_id: r.cnt for r in like_rows}

    items = []
    for r in rows:
        text = r.question_text or ""
        items.append(
            {
                "id": r.id,
                "title": text[:80] + ("…" if len(text) > 80 else ""),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "last_message_at": r.last_message_at.isoformat() if r.last_message_at else None,
                "author": {"id": r.author_id, "display_name": r.author_display_name},
                "answer_count": r.answer_count or 0,
                "like_count": like_counts.get(r.id, 0),
                "vote_score": like_counts.get(r.id, 0),
            }
        )
    return {"items": items}


@router.post("")
def create_feed_thread(
    payload: dict,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    text = (payload.get("question_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="question_text is required")

    # ── Resolve author ────────────────────────────────────────────────────
    author = optional_user or user_service.resolve_or_create_guest(
        db, payload.get("email")
    )

    # ── Ensure city + topic exist (MVP fallback) ──────────────────────────
    city = db.query(City).first()
    if not city:
        city = City(name="Tashkent", country="Uzbekistan")
        db.add(city)
        db.commit()
        db.refresh(city)

    topic = db.query(Topic).first()
    if not topic:
        topic = Topic(name="Remote work")
        db.add(topic)
        db.commit()
        db.refresh(topic)

    question = Question(
        city_id=city.id,
        topic_id=topic.id,
        author_id=author.id,
        duration="2 months",
        budget_tier=BudgetTier.mid,
        requirements=[],
        question_text=text,
        media_url=payload.get("media_url"),
        status=QuestionStatus.open,
        created_at=datetime.utcnow(),
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return {"id": question.id}
