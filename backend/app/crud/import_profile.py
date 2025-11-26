"""
CRUD operations for ImportProfile and ImportValueMapping entities.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.import_profile import ImportProfile, ImportValueMapping
from app.schemas.import_profile import (
    ImportProfileCreate,
    MappingItem,
)


# Default column mapping for the fixed template
DEFAULT_COLUMN_MAPPING = {
    "id": "Id",
    "date": "Date",
    "categories": "Categories",
    "amount": "Amount",
    "accounts": "Accounts",
    "description": "Description",
}


def get_or_create_default_profile(db: Session, user_id: str) -> ImportProfile:
    """
    Get or create the default import profile for a user.
    """
    stmt = select(ImportProfile).where(
        ImportProfile.user_id == user_id,
        ImportProfile.name == "Default Template",
    )
    profile = db.scalars(stmt).first()

    if not profile:
        profile = ImportProfile(
            user_id=user_id,
            name="Default Template",
            column_mapping=DEFAULT_COLUMN_MAPPING,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def get_profile(db: Session, profile_id: UUID, user_id: str) -> ImportProfile | None:
    """Get a single import profile by ID, verifying ownership."""
    stmt = (
        select(ImportProfile)
        .where(ImportProfile.id == profile_id, ImportProfile.user_id == user_id)
        .options(joinedload(ImportProfile.value_mappings))
    )
    return db.scalars(stmt).first()


def get_profiles(db: Session, user_id: str) -> list[ImportProfile]:
    """Get all import profiles for a user."""
    stmt = (
        select(ImportProfile)
        .where(ImportProfile.user_id == user_id)
        .order_by(ImportProfile.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def create_profile(
    db: Session, data: ImportProfileCreate, user_id: str
) -> ImportProfile:
    """Create a new import profile."""
    profile = ImportProfile(
        user_id=user_id,
        name=data.name,
        column_mapping=data.column_mapping,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def delete_profile(db: Session, profile_id: UUID, user_id: str) -> bool:
    """Delete an import profile, verifying ownership."""
    stmt = select(ImportProfile).where(
        ImportProfile.id == profile_id,
        ImportProfile.user_id == user_id,
    )
    profile = db.scalars(stmt).first()
    if not profile:
        return False

    db.delete(profile)
    db.commit()
    return True


# =============================================================================
# Value Mappings
# =============================================================================


def get_value_mappings(
    db: Session, profile_id: UUID, mapping_type: str | None = None
) -> list[ImportValueMapping]:
    """Get all value mappings for a profile, optionally filtered by type."""
    stmt = select(ImportValueMapping).where(ImportValueMapping.profile_id == profile_id)
    if mapping_type:
        stmt = stmt.where(ImportValueMapping.mapping_type == mapping_type)
    return list(db.scalars(stmt).all())


def get_value_mapping(
    db: Session, profile_id: UUID, mapping_type: str, csv_value: str
) -> ImportValueMapping | None:
    """Get a single value mapping by profile, type, and CSV value."""
    stmt = select(ImportValueMapping).where(
        ImportValueMapping.profile_id == profile_id,
        ImportValueMapping.mapping_type == mapping_type,
        ImportValueMapping.csv_value == csv_value,
    )
    return db.scalars(stmt).first()


def get_value_mappings_dict(
    db: Session, profile_id: UUID, mapping_type: str
) -> dict[str, UUID]:
    """
    Get all value mappings as a dictionary: csv_value -> internal_id.
    """
    mappings = get_value_mappings(db, profile_id, mapping_type)
    return {m.csv_value: m.internal_id for m in mappings}


def create_value_mapping(
    db: Session, profile_id: UUID, mapping_type: str, csv_value: str, internal_id: UUID
) -> ImportValueMapping:
    """Create a single value mapping."""
    mapping = ImportValueMapping(
        profile_id=profile_id,
        mapping_type=mapping_type,
        csv_value=csv_value,
        internal_id=internal_id,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


def create_value_mappings_batch(
    db: Session, profile_id: UUID, mappings: list[MappingItem], mapping_type: str
) -> list[ImportValueMapping]:
    """
    Create multiple value mappings in a batch.
    Skips duplicates (same profile_id, mapping_type, csv_value).
    """
    created = []
    for item in mappings:
        # Check if mapping already exists
        existing = get_value_mapping(db, profile_id, mapping_type, item.csv_value)
        if existing:
            # Update existing mapping
            existing.internal_id = item.internal_id
            created.append(existing)
        else:
            # Create new mapping
            mapping = ImportValueMapping(
                profile_id=profile_id,
                mapping_type=mapping_type,
                csv_value=item.csv_value,
                internal_id=item.internal_id,
            )
            db.add(mapping)
            created.append(mapping)

    db.commit()
    for m in created:
        db.refresh(m)
    return created


def delete_value_mapping(db: Session, mapping_id: UUID) -> bool:
    """Delete a single value mapping by ID."""
    stmt = select(ImportValueMapping).where(ImportValueMapping.id == mapping_id)
    mapping = db.scalars(stmt).first()
    if not mapping:
        return False

    db.delete(mapping)
    db.commit()
    return True


def delete_mappings_by_internal_id(
    db: Session, internal_id: UUID, mapping_type: str
) -> int:
    """
    Delete all value mappings that point to a specific internal_id.
    Called when a category or account is deleted to clean up stale mappings.

    Args:
        db: Database session
        internal_id: The category_id or account_id being deleted
        mapping_type: 'category' or 'account'

    Returns:
        Number of mappings deleted
    """
    stmt = select(ImportValueMapping).where(
        ImportValueMapping.internal_id == internal_id,
        ImportValueMapping.mapping_type == mapping_type,
    )
    mappings = list(db.scalars(stmt).all())

    for mapping in mappings:
        db.delete(mapping)

    if mappings:
        db.commit()

    return len(mappings)
