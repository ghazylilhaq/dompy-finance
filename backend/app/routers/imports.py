"""
Import API routes for transaction file imports.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.import_profile import (
    ImportProfileResponse,
    ParseResult,
    ConfirmImportRequest,
    ImportResult,
)
from app.crud import import_profile as crud
from app.services import import_service


router = APIRouter()


@router.get("/profiles", response_model=list[ImportProfileResponse])
def list_profiles(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get all import profiles for the current user."""
    profiles = crud.get_profiles(db, user_id)
    return profiles


@router.get("/profiles/{profile_id}", response_model=ImportProfileResponse)
def get_profile(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single import profile by ID."""
    profile = crud.get_profile(db, profile_id, user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import profile not found",
        )
    return profile


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Delete an import profile and its mappings."""
    deleted = crud.delete_profile(db, profile_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import profile not found",
        )


@router.post("/parse", response_model=ParseResult)
async def parse_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Upload and parse a transaction file.

    Returns parsed rows and lists of unmapped category/account values
    that need to be mapped before import can proceed.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    # Validate file extension
    filename_lower = file.filename.lower()
    if not filename_lower.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload CSV or Excel (.xlsx) file.",
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )

    # Get or create default profile
    profile = crud.get_or_create_default_profile(db, user_id)

    # Parse file
    try:
        parsed_rows = import_service.parse_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Analyze mappings
    result = import_service.analyze_mappings(db, profile.id, parsed_rows)
    return result


@router.post("/confirm", response_model=ImportResult)
def confirm_import(
    request: ConfirmImportRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Confirm and execute the import.

    Persists new mappings and creates transactions from the parsed rows.
    """
    # Verify profile ownership
    profile = crud.get_profile(db, request.profile_id, user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import profile not found",
        )

    # Execute import
    try:
        result = import_service.execute_import(
            db=db,
            user_id=user_id,
            profile_id=request.profile_id,
            parsed_rows=request.parsed_rows,
            category_mappings=request.category_mappings,
            account_mappings=request.account_mappings,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )

    return result

