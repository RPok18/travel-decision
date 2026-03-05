import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db
from app.models.models import City, Topic
from app.schemas.common import CityBase, TopicBase

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.get("/cities", response_model=List[CityBase])
def list_cities(db: Session = Depends(get_db)):
    return db.query(City).order_by(City.name.asc()).all()

@router.get("/topics", response_model=List[TopicBase])
def list_topics(db: Session = Depends(get_db)):
    return db.query(Topic).order_by(Topic.name.asc()).all()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Simple validation for media files
    allowed_types = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not supported")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    
    # Path to app/uploads
    # We use a path relative to the runtime or config if possible, but keeping current logic
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    upload_dir = os.path.join(base_dir, "uploads")
    
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/uploads/{filename}"}
