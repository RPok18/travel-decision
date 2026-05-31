import json
import logging
import os
from datetime import datetime
from typing import List

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import CardStatus, QuestionStatus
from app.models.models import Answer, Card, CardSource, Question, User

logger = logging.getLogger("travel_decision")

async def _get_ai_summary(question: Question, answers: List[Answer]) -> dict:
    """
    Call the configured LLM provider and return structured card data.
    Falls back to _fallback_card() on any error so the endpoint never returns 500.
    """
    prompt = (
        f"Create a travel summary card for a {question.duration} trip to {question.city.name} "
        f"with a {question.budget_tier.value} budget. Topic: {question.topic.name}. "
        f"Additional requirements: {', '.join(question.requirements) if question.requirements else 'None'}. "
        f"Community advice: {' '.join([a.answer_text for a in answers]) if answers else 'None'}. "
        "Return a JSON object with: 'title' (string), 'summary' (string, 2 paragraphs), "
        "'recommendations' (list of strings), 'risks' (list of strings), 'fit_for' (list of strings)."
    )

    try:
        if settings.ai_provider == "ollama":
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={
                        "model": settings.ai_model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                    },
                )
                resp.raise_for_status()
                return json.loads(resp.json()["response"])

        if settings.ai_provider == "openrouter":
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}"},
                    json={
                        "model": settings.ai_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"},
                    },
                )
                resp.raise_for_status()
                return json.loads(resp.json()["choices"][0]["message"]["content"])

       
        return _fallback_card(question, answers)

    except Exception as exc:
        logger.error("AI generation failed: %s", exc)
        return _fallback_card(question, answers)


def _fallback_card(question: Question, answers: List[Answer]) -> dict:
    """Template-based card used when the LLM is unavailable or not configured."""
    recommendations = [
        "Pick a neighbourhood close to daily amenities and reliable transit.",
        "Test internet speeds within the first week and have a backup option.",
        "Budget a 10–15% buffer for unexpected fees.",
    ]
    if answers:
        recommendations.append(
            f"Based on community answers, {answers[0].answer_text[:80]}..."
        )
    return {
        "title": f"{question.city.name} — {question.topic.name} for {question.duration}",
        "summary": (
            f"For a {question.duration} stay in {question.city.name}, locals recommend "
            f"balancing {question.topic.name.lower()} with your "
            f"{question.budget_tier.value} budget tier."
        ),
        "recommendations": recommendations,
        "risks": [
            "Seasonal price spikes can impact your budget.",
            "Short-term rental rules change quickly.",
        ],
        "fit_for": ["Remote workers", "Slow travel couples"],
    }


async def generate_card(db: Session, question_id: int, current_user: User) -> Card:
    """
    Generate and persist a draft Card for the given question:
      1. Fetch question (404 if missing)
      2. Fetch the first 3 answers
      3. Call LLM / fallback
      4. Insert Card + CardSource rows
      5. Mark question status as compiling
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    answers = (
        db.query(Answer)
        .filter(Answer.question_id == question_id)
        .limit(3)
        .all()
    )

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

    logger.info("Card draft %s generated for question %s", card.id, question_id)
    return card
