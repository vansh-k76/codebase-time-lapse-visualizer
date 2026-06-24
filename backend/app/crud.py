from sqlalchemy.orm import Session
from app import models, schemas

def get_repository(db: Session, repository_id: int):
    return db.query(models.Repository).filter(models.Repository.id == repository_id).first()

def get_repositories(db: Session):
    return db.query(models.Repository).all()

def create_repository(db: Session, repo: schemas.RepositoryCreate):
    db_repo = models.Repository(
        name=repo.name,
        url=repo.url,
        local_path=repo.local_path,
        status="pending"
    )
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)
    return db_repo

def delete_repository(db: Session, repository_id: int):
    db_repo = db.query(models.Repository).filter(models.Repository.id == repository_id).first()
    if db_repo:
        db.delete(db_repo)
        db.commit()
        return True
    return False

def get_commits(db: Session, repository_id: int, limit: int = 1000, offset: int = 0):
    return db.query(models.Commit)\
        .filter(models.Commit.repository_id == repository_id)\
        .order_by(models.Commit.committed_at.asc())\
        .offset(offset)\
        .limit(limit)\
        .all()

def get_contributors(db: Session, repository_id: int):
    return db.query(models.Contributor)\
        .filter(models.Contributor.repository_id == repository_id)\
        .order_by(models.Contributor.total_commits.desc())\
        .all()

def get_daily_metrics(db: Session, repository_id: int):
    return db.query(models.DailyMetric)\
        .filter(models.DailyMetric.repository_id == repository_id)\
        .order_by(models.DailyMetric.record_date.asc())\
        .all()

def get_commit_by_hash(db: Session, repository_id: int, commit_hash: str):
    return db.query(models.Commit)\
        .filter(models.Commit.repository_id == repository_id, models.Commit.hash == commit_hash)\
        .first()

def get_file_changes_up_to_commit(db: Session, repository_id: int, commit_id: int):
    # Returns all file changes chronologically up to and including the current commit
    # We query commits up to the target commit date/time
    target_commit = db.query(models.Commit).filter(models.Commit.id == commit_id).first()
    if not target_commit:
        return []
    
    # Query all commits in chronological order up to target commit
    commits = db.query(models.Commit)\
        .filter(
            models.Commit.repository_id == repository_id,
            models.Commit.committed_at <= target_commit.committed_at
        )\
        .order_by(models.Commit.committed_at.asc())\
        .all()
    
    commit_ids = [c.id for c in commits]
    
    return db.query(models.FileChange)\
        .filter(models.FileChange.commit_id.in_(commit_ids))\
        .order_by(models.FileChange.id.asc())\
        .all()
