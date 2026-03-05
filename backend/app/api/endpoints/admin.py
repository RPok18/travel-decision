import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_db
from app.models.enums import CardStatus, ReportStatus
from app.models.models import Card, Report, User
from app.schemas.common import CardBase
from .questions import list_questions

logger = logging.getLogger("travel_decision")

router = APIRouter()

@router.get("/reports")
def list_reports(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return db.query(Report).order_by(Report.created_at.desc()).all()

@router.put("/reports/{report_id}")
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

@router.get("/questions")
def admin_questions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return list_questions(None, None, status_filter, db)

@router.get("/cards/drafts", response_model=List[CardBase])
def admin_card_drafts(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return db.query(Card).filter(Card.status == CardStatus.draft).all()
