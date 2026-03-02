from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CityBase(BaseModel):
    id: int
    name: str
    country: str

    model_config = ConfigDict(from_attributes=True)


class TopicBase(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


class ProfileBase(BaseModel):
    language: Optional[str]
    travel_style: Optional[str]
    budget_tier: str
    cities_of_experience: List[str]

    model_config = ConfigDict(from_attributes=True)


class QuestionBase(BaseModel):
    id: int
    city_id: int
    topic_id: int
    author_id: int
    duration: str
    budget_tier: str
    requirements: List[str]
    question_text: str
    media_url: Optional[str] = None
    author_username: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnswerBase(BaseModel):
    id: int
    question_id: int
    user_id: int
    reply_to_id: Optional[int] = None
    answer_text: str
    context: dict
    media_url: Optional[str]
    author_username: Optional[str] = None
    created_at: datetime
    like_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CardBase(BaseModel):
    id: int
    title: str
    city_id: int
    topic_id: int
    duration: str
    budget_tier: str
    requirements: List[str]
    season: Optional[str]
    summary: str
    recommendations: List[str]
    risks: List[str]
    fit_for: List[str]
    status: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
