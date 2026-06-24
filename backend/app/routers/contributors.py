from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud
from app.database import get_db

router = APIRouter(
    prefix="/repositories",
    tags=["contributors"]
)

@router.get("/{repo_id}/contributors", response_model=List[schemas.ContributorResponse])
def read_contributors(repo_id: int, db: Session = Depends(get_db)):
    db_repo = crud.get_repository(db, repo_id)
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return crud.get_contributors(db, repo_id)
