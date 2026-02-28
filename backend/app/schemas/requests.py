from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=6)


class QuestionCreate(BaseModel):
    city_id: int
    topic_id: int
    duration: str
    budget_tier: str
    requirements: List[str]
    question_text: str


class AnswerCreate(BaseModel):
    question_id: int
    answer_text: str
    reply_to_id: Optional[int] = None
    email: Optional[EmailStr] = None
    context: Optional[dict] = None
    media_url: Optional[str] = None


class ReactionCreate(BaseModel):
    entity_type: str
    entity_id: int
    reaction_type: str


class ReportCreate(BaseModel):
    entity_type: str
    entity_id: int
    reason: str


class CardUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    recommendations: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    fit_for: Optional[List[str]] = None
    status: Optional[str] = None


class ProfileUpdate(BaseModel):
    language: Optional[str] = None
    travel_style: Optional[str] = None
    budget_tier: Optional[str] = None
    cities_of_experience: Optional[List[str]] = None
