from fastapi import APIRouter
from app.api.endpoints import auth, users, feed, questions, answers, reactions, cards, admin, meta

router = APIRouter()

# Meta / Utils
router.include_router(meta.router, tags=["meta"])

# Auth
router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Users / Profile
router.include_router(users.router, prefix="/users", tags=["users"])

# Feed
router.include_router(feed.router, prefix="/feed", tags=["feed"])

# Questions
router.include_router(questions.router, prefix="/questions", tags=["questions"])

# Answers
router.include_router(answers.router, prefix="/answers", tags=["answers"])

# Reactions & Reports
router.include_router(reactions.router, tags=["reactions"])

# Cards & Search
router.include_router(cards.router, tags=["cards"])

# Admin
router.include_router(admin.router, prefix="/admin", tags=["admin"])
