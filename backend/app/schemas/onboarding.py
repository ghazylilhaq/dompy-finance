from typing import List
from pydantic import BaseModel

from app.schemas.account import AccountCreate
from app.schemas.category import CategoryCreate

class OnboardingComplete(BaseModel):
    accounts: List[AccountCreate]
    categories: List[CategoryCreate]

class OnboardingStatus(BaseModel):
    has_completed_onboarding: bool

