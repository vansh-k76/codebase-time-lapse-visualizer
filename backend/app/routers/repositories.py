from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, models
from app.database import get_db
from app.git_analyzer import analyze_repository
from app.config import settings
import shutil
import os

router = APIRouter(
    prefix="/repositories",
    tags=["repositories"]
)

@router.post("/", response_model=schemas.RepositoryResponse)
def connect_repository(
    repo: schemas.RepositoryCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    if not repo.url and not repo.local_path:
        raise HTTPException(status_code=400, detail="Either 'url' or 'local_path' must be provided.")
    
    if repo.local_path and not os.path.exists(repo.local_path):
        raise HTTPException(status_code=400, detail=f"Local path '{repo.local_path}' does not exist.")

    # Create record
    db_repo = crud.create_repository(db, repo)
    
    # Run analysis in background
    background_tasks.add_task(analyze_repository, db_repo.id, db)
    
    return db_repo

@router.get("/", response_model=List[schemas.RepositoryResponse])
def read_repositories(db: Session = Depends(get_db)):
    return crud.get_repositories(db)

@router.get("/{repo_id}", response_model=schemas.RepositoryResponse)
def read_repository(repo_id: int, db: Session = Depends(get_db)):
    db_repo = crud.get_repository(db, repo_id)
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return db_repo

@router.get("/{repo_id}/summary", response_model=schemas.RepositorySummary)
def read_repository_summary(repo_id: int, db: Session = Depends(get_db)):
    db_repo = crud.get_repository(db, repo_id)
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    total_commits = db.query(models.Commit).filter(models.Commit.repository_id == repo_id).count()
    total_contributors = db.query(models.Contributor).filter(models.Contributor.repository_id == repo_id).count()
    
    # Fetch latest daily metric for total lines and files
    latest_metric = db.query(models.DailyMetric)\
        .filter(models.DailyMetric.repository_id == repo_id)\
        .order_by(models.DailyMetric.record_date.desc())\
        .first()
    
    total_lines = latest_metric.total_lines if latest_metric else 0
    total_files = latest_metric.total_files if latest_metric else 0

    return schemas.RepositorySummary(
        repository=schemas.RepositoryResponse.model_validate(db_repo),
        total_commits=total_commits,
        total_contributors=total_contributors,
        total_lines=total_lines,
        total_files=total_files
    )

@router.delete("/{repo_id}")
def delete_repository(repo_id: int, db: Session = Depends(get_db)):
    db_repo = crud.get_repository(db, repo_id)
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Delete cloned folder if exists
    clone_dir = settings.REPOS_DIR / f"repo_{repo_id}"
    if clone_dir.exists():
        try:
            shutil.rmtree(clone_dir)
        except Exception:
            pass  # Non-blocking if OS lock exists

    crud.delete_repository(db, repo_id)
    return {"message": "Repository and associated analysis deleted successfully"}
