from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app import models, schemas
from app.api import deps
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/search", response_model=list[schemas.User])
def search_users(
    query: str = Query(..., min_length=1, description="Email or name to search for"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Search for users by email or full name. Excludes the current user.
    """
    search_term = f"%{query}%"
    users = (
        db.query(models.User)
        .filter(models.User.id != current_user.id)
        .filter(
            or_(
                models.User.email.ilike(search_term),
                models.User.full_name.ilike(search_term),
            )
        )
        .limit(limit)
        .all()
    )
    return users

@router.get("/all", response_model=list[schemas.User])
def list_users(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    List all users except the current user.
    """
    users = (
        db.query(models.User)
        .filter(models.User.id != current_user.id)
        .order_by(models.User.full_name, models.User.email)
        .all()
    )
    return users

@router.post("/", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = models.User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user profile.
    """
    data = user_in.model_dump(exclude_unset=True)

    if "email" in data and data["email"] and data["email"] != current_user.email:
        existing = db.query(models.User).filter(models.User.email == data["email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
        current_user.email = data["email"]

    if "full_name" in data and data["full_name"] is not None:
        current_user.full_name = data["full_name"]

    if "password" in data and data["password"]:
        current_user.hashed_password = get_password_hash(data["password"])

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
