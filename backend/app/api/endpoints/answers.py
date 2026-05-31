import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.models.models import User
from app.schemas.common import AnswerBase
from app.schemas.requests import AnswerCreate
from app.services import answer_service

logger = logging.getLogger("travel_decision")

router = APIRouter()


@router.post("", response_model=AnswerBase)
def create_answer(
    payload: AnswerCreate,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    return answer_service.create_answer(db, payload, optional_user)
