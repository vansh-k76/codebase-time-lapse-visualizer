from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
from app import schemas, crud, models
from app.database import get_db
from app.services.ai_insights import get_ai_provider

router = APIRouter(
    prefix="/repositories",
    tags=["commits"]
)

@router.get("/{repo_id}/commits", response_model=List[schemas.CommitResponse])
@router.get("/{repo_id}/timeline", response_model=List[schemas.CommitResponse])
def read_commits(
    repo_id: int, 
    limit: int = 1000, 
    offset: int = 0, 
    db: Session = Depends(get_db)
):
    return crud.get_commits(db, repo_id, limit, offset)

@router.get("/{repo_id}/daily-metrics", response_model=List[schemas.DailyMetricResponse])
@router.get("/{repo_id}/growth", response_model=List[schemas.DailyMetricResponse])
def read_daily_metrics(repo_id: int, db: Session = Depends(get_db)):
    return crud.get_daily_metrics(db, repo_id)

@router.get("/{repo_id}/file-snapshots")
def read_file_snapshot(
    repo_id: int, 
    commit_hash: str = Query(..., description="Commit hash to generate snapshot for"), 
    db: Session = Depends(get_db)
):
    # Verify repo exists
    repo = crud.get_repository(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Get target commit
    target_commit = crud.get_commit_by_hash(db, repo_id, commit_hash)
    if not target_commit:
        raise HTTPException(status_code=404, detail="Commit hash not found")

    # Fetch all file changes up to this commit
    changes = crud.get_file_changes_up_to_commit(db, repo_id, target_commit.id)
    
    # Replay changes
    active_files = {}  # filepath: {lines: int, file_type: str, complexity: float}
    
    for change in changes:
        filepath = change.filepath
        if not filepath:
            continue
            
        if change.change_type == "ADD":
            active_files[filepath] = {
                "lines": max(0, change.lines_added - change.lines_deleted),
                "file_type": change.file_type or "unknown",
                "complexity": change.complexity_score or 0.0
            }
        elif change.change_type == "DELETE":
            active_files.pop(filepath, None)
        elif change.change_type == "RENAME":
            active_files[filepath] = {
                "lines": max(0, change.lines_added - change.lines_deleted),
                "file_type": change.file_type or "unknown",
                "complexity": change.complexity_score or 0.0
            }
        else:  # MODIFY
            current = active_files.get(filepath, {"lines": 0, "file_type": change.file_type or "unknown", "complexity": 0.0})
            new_lines = max(0, current["lines"] + change.lines_added - change.lines_deleted)
            active_files[filepath] = {
                "lines": new_lines,
                "file_type": change.file_type or "unknown",
                "complexity": change.complexity_score or 0.0
            }

    # Format into D3 hierarchical structure
    root = {"name": "root", "path": "", "type": "directory", "children": []}
    
    for filepath, info in active_files.items():
        # Standardize slashes to forward slash
        normalized_path = filepath.replace('\\', '/')
        parts = normalized_path.split('/')
        
        current_node = root
        current_path = ""
        
        for i, part in enumerate(parts):
            if not part:
                continue
            current_path = f"{current_path}/{part}" if current_path else part
            is_last = (i == len(parts) - 1)
            
            children = current_node.setdefault("children", [])
            
            # Find existing child
            found_child = None
            for child in children:
                if child["name"] == part:
                    found_child = child
                    break
            
            if not found_child:
                if is_last:
                    new_node = {
                        "name": part,
                        "path": current_path,
                        "type": "file",
                        "lines": info["lines"],
                        "file_type": info["file_type"],
                        "complexity": info["complexity"]
                    }
                else:
                    new_node = {
                        "name": part,
                        "path": current_path,
                        "type": "directory",
                        "complexity": 0.0,
                        "children": []
                    }
                children.append(new_node)
                found_child = new_node
            
            current_node = found_child

    # Roll up folder lines and complexities recursively
    def postprocess_tree(node: Dict[str, Any]) -> tuple:
        if node["type"] == "file":
            return node.get("lines", 0), node.get("complexity", 0.0)
            
        total_lines = 0
        total_complexity = 0.0
        for child in node.get("children", []):
            clines, ccomp = postprocess_tree(child)
            total_lines += clines
            total_complexity += ccomp
            
        node["lines"] = total_lines
        node["complexity"] = round(total_complexity, 2)
        return total_lines, total_complexity

    postprocess_tree(root)

    # Return the tree and the current commit info for convenience
    return {
        "commit": schemas.CommitResponse.model_validate(target_commit),
        "tree": root
    }

@router.get("/{repo_id}/complexity", response_model=List[schemas.CommitComplexityResponse])
def read_commit_complexity(repo_id: int, db: Session = Depends(get_db)):
    # Verify repo exists
    repo = crud.get_repository(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    return db.query(models.Commit)\
        .filter(models.Commit.repository_id == repo_id)\
        .order_by(models.Commit.committed_at.asc())\
        .all()


@router.get("/{repo_id}/ai-insights", response_model=List[schemas.AICommitInsightResponse])
def read_ai_insights(repo_id: int, db: Session = Depends(get_db)):
    # Verify repo exists
    repo = crud.get_repository(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Fetch all commits chronologically
    commits = db.query(models.Commit)\
        .filter(models.Commit.repository_id == repo_id)\
        .order_by(models.Commit.committed_at.asc())\
        .all()

    ai_provider = get_ai_provider()
    insights = []

    # Keep track of previous commit to compute deltas
    prev_commit = None

    for commit in commits:
        # Check if insight is already cached
        insight_record = db.query(models.AICommitInsight)\
            .filter(models.AICommitInsight.commit_id == commit.id)\
            .first()

        if not insight_record:
            # Gather file changes for the current commit
            file_changes = db.query(models.FileChange)\
                .filter(models.FileChange.commit_id == commit.id)\
                .all()

            files_list = []
            for fc in file_changes:
                files_list.append({
                    "filepath": fc.filepath,
                    "lines_added": fc.lines_added,
                    "lines_deleted": fc.lines_deleted,
                    "complexity_score": fc.complexity_score
                })

            # Calculate Deltas
            loc_delta = commit.lines_added - commit.lines_deleted
            
            if prev_commit:
                complexity_delta = commit.complexity_score - prev_commit.complexity_score
            else:
                complexity_delta = commit.complexity_score  # First commit's score is the delta

            # Generate Insight
            payload = ai_provider.generate_insight(
                commit_message=commit.message,
                files_changed=files_list,
                loc_delta=loc_delta,
                complexity_delta=complexity_delta
            )

            # Store inside database
            insight_record = models.AICommitInsight(
                commit_id=commit.id,
                complexity_delta=payload["complexity_delta"],
                loc_delta=payload["loc_delta"],
                risk_score=payload["risk_score"],
                most_impacted_files=json.dumps(payload["most_impacted_files"]),
                summary=payload["summary"],
                refactoring_recommendation=payload["refactoring_recommendation"]
            )
            db.add(insight_record)
            db.commit()
            db.refresh(insight_record)

        # Map to response schema
        insights.append(schemas.AICommitInsightResponse(
            hash=commit.hash,
            commit_message=commit.message,
            committed_at=commit.committed_at,
            author_name=commit.author_name,
            complexity_delta=insight_record.complexity_delta,
            loc_delta=insight_record.loc_delta,
            risk_score=insight_record.risk_score,
            most_impacted_files=json.loads(insight_record.most_impacted_files),
            summary=insight_record.summary,
            refactoring_recommendation=insight_record.refactoring_recommendation
        ))

        prev_commit = commit

    return insights
