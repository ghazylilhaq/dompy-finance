"""
CRUD operations for Tag entity.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tag import Tag


def get_tags(db: Session, user_id: str) -> list[Tag]:
    """Get all tags for a user ordered by name."""
    stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
    return list(db.scalars(stmt).all())


def get_tag_by_name(db: Session, name: str, user_id: str) -> Tag | None:
    """Get a tag by its name for a specific user."""
    stmt = select(Tag).where(Tag.user_id == user_id, Tag.name == name.lower().strip())
    return db.scalars(stmt).first()


def get_or_create_tags(db: Session, tag_names: list[str], user_id: str) -> list[Tag]:
    """
    Get existing tags or create new ones for a user.
    Tag names are normalized to lowercase and trimmed.
    """
    if not tag_names:
        return []

    tags = []
    for name in tag_names:
        normalized = name.lower().strip()
        if not normalized:
            continue

        tag = get_tag_by_name(db, normalized, user_id)
        if not tag:
            tag = Tag(name=normalized, user_id=user_id)
            db.add(tag)
            db.flush()  # Get ID without committing

        tags.append(tag)

    return tags
