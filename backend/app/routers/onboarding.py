from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.onboarding import OnboardingComplete, OnboardingStatus
from app.models.user_settings import UserSettings
from app.crud import account as account_crud
from app.crud import category as category_crud

router = APIRouter()

@router.get("/status", response_model=OnboardingStatus)
def get_onboarding_status(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        # Default to False if record doesn't exist
        return OnboardingStatus(has_completed_onboarding=False)
    return OnboardingStatus(has_completed_onboarding=settings.has_completed_onboarding)

@router.post("/complete", status_code=status.HTTP_200_OK)
def complete_onboarding(
    payload: OnboardingComplete,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # 1. Create Accounts
    for acc in payload.accounts:
        account_crud.create_account(db, acc, user_id)
    
    # 2. Create Categories
    for cat in payload.categories:
        category_crud.create_category(db, cat, user_id)
    
    # 3. Ensure Transfer Categories
    category_crud.ensure_transfer_categories(db, user_id)
    
    # 4. Update User Settings
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id, has_completed_onboarding=True)
        db.add(settings)
    else:
        settings.has_completed_onboarding = True
        settings.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Onboarding completed successfully"}
