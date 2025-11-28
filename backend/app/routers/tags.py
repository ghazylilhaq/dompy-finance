"""
Tag API routes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.tag import TagResponse
from app.crud import tag as crud

router = APIRouter()


@router.get("", response_model=list[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get all tags for the current user ordered by name."""
    return crud.get_tags(db, user_id)
