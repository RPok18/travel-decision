import sys
import os

# Root directory of the project
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
# Backend directory
BACKEND_DIR = os.path.join(PROJECT_ROOT, 'backend')

# Add backend to path so we can import app
sys.path.append(BACKEND_DIR)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User
from app.core.config import settings

def set_admin(email):
    # Adjust database URL for absolute path if needed
    db_url = settings.database_url
    if db_url.startswith("sqlite:///./"):
        # Convert relative path to absolute based on backend directory
        db_path = os.path.join(BACKEND_DIR, 'travel_decision.db')
        db_url = f"sqlite:///{db_path}"
    
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    user = session.query(User).filter(User.email == email).first()
    if not user:
        print(f"Error: User with email '{email}' not found.")
        print("Tip: Make sure you have logged in at least once with this email.")
        session.close()
        return

    user.is_admin = True
    session.commit()
    print(f"Success! '{email}' is now an administrator.")
    session.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_admin.py your-email@example.com")
    else:
        set_admin(sys.argv[1])
