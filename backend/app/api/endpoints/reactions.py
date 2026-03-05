import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import EntityType, ReactionType, ReportStatus
from app.models.models import Answer, Question, Reaction, Report, User
from app.schemas.requests import ReactionCreate, ReportCreate

logger = logging.getLogger("travel_decision")

router = APIRouter()

@router.post("/reactions")
def create_reaction(
    payload: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.reaction_type == ReactionType.helped.value:
        if payload.entity_type != EntityType.answer.value:
            raise HTTPException(status_code=400, detail="Helped only for answers")
        answer = db.query(Answer).filter(Answer.id == payload.entity_id).first()
        if not answer:
            raise HTTPException(status_code=404, detail="Answer not found")
        question = db.query(Question).filter(Question.id == answer.question_id).first()
        if question.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only question author can mark helped")
    
    if payload.reaction_type == ReactionType.saved.value:
        if payload.entity_type not in {EntityType.answer.value, EntityType.card.value}:
            raise HTTPException(status_code=400, detail="Save only for answers and cards")
            
    reaction = Reaction(
        user_id=current_user.id,
        entity_type=EntityType(payload.entity_type),
        entity_id=payload.entity_id,
        reaction_type=ReactionType(payload.reaction_type),
    )
    db.add(reaction)
    db.commit()
    logger.info("Reaction %s created on %s %s", payload.reaction_type, payload.entity_type, payload.entity_id)
    return {"status": "ok"}

@router.post("/reactions/toggle")
def toggle_reaction(
    payload: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle a reaction on/off. If it already exists, delete it. Otherwise create it."""
    existing = (
        db.query(Reaction)
        .filter(
            Reaction.user_id == current_user.id,
            Reaction.entity_type == EntityType(payload.entity_type),
            Reaction.entity_id == payload.entity_id,
            Reaction.reaction_type == ReactionType(payload.reaction_type),
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        logger.info("Reaction %s removed from %s %s", payload.reaction_type, payload.entity_type, payload.entity_id)
        return {"status": "removed", "liked": False}
    else:
        reaction = Reaction(
            user_id=current_user.id,
            entity_type=EntityType(payload.entity_type),
            entity_id=payload.entity_id,
            reaction_type=ReactionType(payload.reaction_type),
        )
        db.add(reaction)
        db.commit()
        logger.info("Reaction %s added on %s %s", payload.reaction_type, payload.entity_type, payload.entity_id)
        return {"status": "added", "liked": True}

@router.post("/reports")
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = Report(
        reporter_id=current_user.id,
        entity_type=EntityType(payload.entity_type),
        entity_id=payload.entity_id,
        reason=payload.reason,
    )
    db.add(report)
    db.commit()
    logger.info("Report created on %s %s", payload.entity_type, payload.entity_id)
    return {"status": "queued"}
