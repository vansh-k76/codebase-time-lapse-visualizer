from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional, Dict, Any

class RepositoryCreate(BaseModel):
    name: str
    url: Optional[str] = None
    local_path: Optional[str] = None

class RepositoryResponse(BaseModel):
    id: int
    name: str
    url: Optional[str]
    local_path: Optional[str]
    status: str
    last_analyzed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class FileChangeResponse(BaseModel):
    id: int
    filepath: str
    change_type: str
    lines_added: int
    lines_deleted: int
    file_type: Optional[str]

    class Config:
        from_attributes = True

class CommitResponse(BaseModel):
    id: int
    hash: str
    author_name: str
    author_email: str
    message: str
    committed_at: datetime
    lines_added: int
    lines_deleted: int
    files_changed: int
    total_lines: int = 0
    file_count: int = 0
    average_file_size: float = 0.0
    complexity_score: float = 0.0

    class Config:
        from_attributes = True

class ContributorResponse(BaseModel):
    id: int
    name: str
    email: str
    total_commits: int
    lines_added: int
    lines_deleted: int

    class Config:
        from_attributes = True

class DailyMetricResponse(BaseModel):
    record_date: date
    total_files: int
    total_lines: int
    active_contributors_count: int

    class Config:
        from_attributes = True

class RepositorySummary(BaseModel):
    repository: RepositoryResponse
    total_commits: int
    total_contributors: int
    total_lines: int
    total_files: int

class FileNode(BaseModel):
    path: str
    name: str
    type: str  # "file" or "directory"
    size: int = 0
    lines: int = 0
    complexity: float = 0.0
    children: Optional[List['FileNode']] = None

FileNode.update_forward_refs()

class CommitVisualFrame(BaseModel):
    commit: CommitResponse
    file_changes: List[FileChangeResponse]

class CommitComplexityResponse(BaseModel):
    hash: str
    committed_at: datetime
    total_lines: int
    file_count: int
    average_file_size: float
    complexity_score: float

    class Config:
        from_attributes = True


class AICommitInsightResponse(BaseModel):
    hash: str
    commit_message: str
    committed_at: datetime
    author_name: str
    complexity_delta: float
    loc_delta: int
    risk_score: str
    most_impacted_files: List[str]
    summary: str
    refactoring_recommendation: str

    class Config:
        from_attributes = True
