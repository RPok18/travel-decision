import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import EntityType, ReactionType
from app.models.models import Answer, Card, CardSource, Question, Reaction, User, UserProfile
from app.schemas.requests import ProfileUpdate
from app.schemas.common import QuestionBase

logger = logging.getLogger("travel_decision")

router = APIRouter()

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user details.
    """
    return {"id": current_user.id, "email": current_user.email, "is_admin": current_user.is_admin}

@router.get("/profile/me")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    helped_count = (
        db.query(Reaction)
        .join(Answer, Reaction.entity_id == Answer.id)
        .filter(Reaction.reaction_type == ReactionType.helped, Answer.user_id == current_user.id)
        .count()
    )
    cards_used = (
        db.query(CardSource)
        .join(Answer, CardSource.answer_id == Answer.id)
        .filter(Answer.user_id == current_user.id)
        .count()
    )
    saves_count = (
        db.query(Reaction)
        .join(Answer, Reaction.entity_id == Answer.id)
        .filter(Reaction.reaction_type == ReactionType.saved, Answer.user_id == current_user.id)
        .count()
    )
    saved_cards = (
        db.query(Reaction)
        .filter(Reaction.user_id == current_user.id, Reaction.reaction_type == ReactionType.saved, Reaction.entity_type == EntityType.card)
        .all()
    )
    
    # Fetch liked questions
    liked_questions = (
        db.query(Question)
        .join(Reaction, Reaction.entity_id == Question.id)
        .filter(
            Reaction.user_id == current_user.id,
            Reaction.entity_type == EntityType.question,
            Reaction.reaction_type == ReactionType.thanks
        )
        .all()
    )

    def question_to_dict(q):
        base = QuestionBase.model_validate(q).model_dump()
        base["author_username"] = q.author.username or q.author.email.split("@")[0]
        # Get answer count for PostCard
        base["answer_count"] = len(q.answers)
        return base

    questions = db.query(Question).filter(Question.author_id == current_user.id).all()
    answers = db.query(Answer).filter(Answer.user_id == current_user.id).all()
    return {
        "profile": profile,
        "username": current_user.username or current_user.email.split("@")[0],
        "stats": {
            "helped_answers": helped_count,
            "cards_used": cards_used,
            "answer_saves": saves_count,
        },
        "saved_cards": saved_cards,
        "liked_questions": [question_to_dict(q) for q in liked_questions],
        "questions": [question_to_dict(q) for q in questions],
        "answers": answers,
    }

@router.put("/profile/me")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id, cities_of_experience=[])
        db.add(profile)
    update_data = payload.model_dump(exclude_unset=True)
    if "username" in update_data:
        current_user.username = update_data.pop("username")
    
    for key, value in update_data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
            
    db.commit()
    logger.info("Profile updated %s", current_user.id)
    return {"status": "ok"}
