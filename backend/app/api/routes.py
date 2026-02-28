import logging
import random
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_admin_user, get_current_user, get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.enums import (
    BudgetTier,
    CardStatus,
    EntityType,
    QuestionStatus,
    ReactionType,
    ReportStatus,
)
from app.models.models import (
    Answer,
    Card,
    CardSource,
    City,
    OtpCode,
    Question,
    Reaction,
    Report,
    Topic,
    User,
    UserProfile,
)
from app.schemas.common import AnswerBase, CardBase, CityBase, QuestionBase, TopicBase
from app.schemas.requests import (
    AnswerCreate,
    CardUpdate,
    OtpRequest,
    OtpVerify,
    ProfileUpdate,
    QuestionCreate,
    ReactionCreate,
    ReportCreate,
)

logger = logging.getLogger("travel_decision")

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.get("/feed")
def get_feed(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    # Берем вопросы (это наши треды) + дату последнего ответа (как last_message_at)
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
            User.email.label("author_name"),
            last_answer_sq.c.last_message_at,
            answer_count_sq.c.answer_count,
        )
        .join(User, User.id == Question.author_id)
        .outerjoin(last_answer_sq, last_answer_sq.c.question_id == Question.id)
        .outerjoin(answer_count_sq, answer_count_sq.c.question_id == Question.id)
        .order_by(func.coalesce(last_answer_sq.c.last_message_at, Question.created_at).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Fetch like counts for all retrieved question ids
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
                "author": {"id": r.author_id, "display_name": r.author_name},
                "answer_count": r.answer_count or 0,
                "like_count": like_counts.get(r.id, 0),
            }
        )

    return {"items": items}


@router.post("/feed")
def create_feed_thread(payload: dict, db: Session = Depends(get_db)):
    """
    MVP: создаем публичный тред без авторизации.
    Чтобы не заморачиваться с OTP на фронте.
    """
    text = (payload.get("question_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="question_text is required")

    # 1) гарантируем что есть юзер "member@travel.dev"
    user = db.query(User).filter(User.email == "member@travel.dev").first()
    if not user:
        user = User(email="member@travel.dev")
        db.add(user)
        db.commit()
        db.refresh(user)
        if not db.query(UserProfile).filter(UserProfile.user_id == user.id).first():
            db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
            db.commit()

    # 2) гарантируем что есть city + topic для MVP
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

    q = Question(
        city_id=city.id,
        topic_id=topic.id,
        author_id=user.id,
        duration="2 months",
        budget_tier=BudgetTier.mid,
        requirements=[],
        question_text=text,
        status=QuestionStatus.open,
        created_at=datetime.utcnow(),
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    return {"id": q.id}

@router.post("/auth/request-otp")
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    code = "".join(str(random.randint(0, 9)) for _ in range(6))
    expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes)
    db.add(OtpCode(email=payload.email, code=code, expires_at=expires_at))
    db.commit()
    logger.info("OTP requested for %s", payload.email)
    return {"message": "OTP created", "code": code}


@router.post("/auth/verify-otp")
def verify_otp(payload: OtpVerify, db: Session = Depends(get_db)):
    otp = (
        db.query(OtpCode)
        .filter(OtpCode.email == payload.email, OtpCode.code == payload.code)
        .order_by(OtpCode.created_at.desc())
        .first()
    )
    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        user = User(email=payload.email)
        db.add(user)
        db.commit()
        db.refresh(user)
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
        db.commit()
    token = create_access_token(user.email)
    logger.info("User verified OTP %s", user.email)
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}


from fastapi.security import OAuth2PasswordRequestForm

@router.post("/auth/login")
def login_simple(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Simplified login for Swagger UI: get bearer token by email (username field).
    """
    email = form_data.username  # OAuth2 form uses 'username' field
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        db.add(UserProfile(user_id=user.id, cities_of_experience=[]))
        db.commit()

    token = create_access_token(user.email)
    logger.info("User logged in via simple auth: %s", user.email)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user details.
    """
    return {"id": current_user.id, "email": current_user.email, "is_admin": current_user.is_admin}


@router.get("/cities", response_model=List[CityBase])
def list_cities(db: Session = Depends(get_db)):
    return db.query(City).order_by(City.name.asc()).all()


@router.get("/topics", response_model=List[TopicBase])
def list_topics(db: Session = Depends(get_db)):
    return db.query(Topic).order_by(Topic.name.asc()).all()


@router.post("/questions", response_model=QuestionBase)
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
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    logger.info("Question created %s by %s", question.id, current_user.email)
    return question


@router.delete("/questions/{question_id}")
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


@router.get("/questions", response_model=List[QuestionBase])
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


@router.get("/questions/{question_id}")
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
    contributor_helped_counts = {
        answer.user_id: db.query(Reaction)
        .join(Answer, Reaction.entity_id == Answer.id)
        .filter(Reaction.reaction_type == ReactionType.helped, Answer.user_id == answer.user_id)
        .count()
        for answer in answers
    }
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
        return base

    return {
        "question": QuestionBase.model_validate(question),
        "question_like_count": question_like_count,
        "answers": [answer_to_dict(a) for a in answers_sorted],
    }


@router.post("/answers", response_model=AnswerBase)
def create_answer(
    payload: AnswerCreate,
    db: Session = Depends(get_db),
    # current_user is removed to allow unauthenticated access
):
    # Resolve user
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


@router.get("/cards/{card_id}", response_model=CardBase)
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
        .filter(Reaction.reaction_type == ReactionType.saved, Reaction.entity_type == EntityType.card)
        .all()
    )
    questions = db.query(Question).filter(Question.author_id == current_user.id).all()
    answers = db.query(Answer).filter(Answer.user_id == current_user.id).all()
    return {
        "profile": profile,
        "stats": {
            "helped_answers": helped_count,
            "cards_used": cards_used,
            "answer_saves": saves_count,
        },
        "saved_cards": saved_cards,
        "questions": questions,
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
    for key, value in update_data.items():
        setattr(profile, key, value)
    db.commit()
    logger.info("Profile updated %s", current_user.id)
    return {"status": "ok"}


@router.get("/admin/reports")
def list_reports(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return db.query(Report).order_by(Report.created_at.desc()).all()


@router.put("/admin/reports/{report_id}")
def update_report(
    report_id: int,
    status_update: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = ReportStatus(status_update)
    db.commit()
    logger.info("Report %s updated to %s", report.id, status_update)
    return {"status": "ok"}


@router.get("/admin/questions")
def admin_questions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return list_questions(None, None, status_filter, db)


@router.get("/admin/cards/drafts", response_model=List[CardBase])
def admin_card_drafts(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return db.query(Card).filter(Card.status == CardStatus.draft).all()
