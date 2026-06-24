from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, analyzing, completed, failed
    last_analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    commits = relationship("Commit", back_populates="repository", cascade="all, delete-orphan")
    contributors = relationship("Contributor", back_populates="repository", cascade="all, delete-orphan")
    daily_metrics = relationship("DailyMetric", back_populates="repository", cascade="all, delete-orphan")

class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    hash = Column(String, nullable=False, index=True)
    author_name = Column(String, nullable=False)
    author_email = Column(String, nullable=False)
    message = Column(String, nullable=False)
    committed_at = Column(DateTime, nullable=False)
    lines_added = Column(Integer, default=0)
    lines_deleted = Column(Integer, default=0)
    files_changed = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    file_count = Column(Integer, default=0)
    average_file_size = Column(Float, default=0.0)
    complexity_score = Column(Float, default=0.0)

    repository = relationship("Repository", back_populates="commits")
    file_changes = relationship("FileChange", back_populates="commit", cascade="all, delete-orphan")
    ai_insight = relationship("AICommitInsight", back_populates="commit", uselist=False, cascade="all, delete-orphan")

class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    total_commits = Column(Integer, default=0)
    lines_added = Column(Integer, default=0)
    lines_deleted = Column(Integer, default=0)

    repository = relationship("Repository", back_populates="contributors")

class FileChange(Base):
    __tablename__ = "file_changes"

    id = Column(Integer, primary_key=True, index=True)
    commit_id = Column(Integer, ForeignKey("commits.id", ondelete="CASCADE"), nullable=False)
    filepath = Column(String, nullable=False)
    change_type = Column(String, nullable=False)  # ADD, MODIFY, DELETE, RENAME
    lines_added = Column(Integer, default=0)
    lines_deleted = Column(Integer, default=0)
    file_type = Column(String, nullable=True)  # extension / language
    complexity_score = Column(Float, default=0.0)
    functions = Column(Integer, default=0)
    conditionals = Column(Integer, default=0)
    loops = Column(Integer, default=0)
    max_depth = Column(Integer, default=0)

    commit = relationship("Commit", back_populates="file_changes")

class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    record_date = Column(Date, nullable=False)
    total_files = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    active_contributors_count = Column(Integer, default=0)

    repository = relationship("Repository", back_populates="daily_metrics")


class AICommitInsight(Base):
    __tablename__ = "ai_commit_insights"

    id = Column(Integer, primary_key=True, index=True)
    commit_id = Column(Integer, ForeignKey("commits.id", ondelete="CASCADE"), unique=True, nullable=False)
    complexity_delta = Column(Float, default=0.0)
    loc_delta = Column(Integer, default=0)
    risk_score = Column(String, nullable=False)  # Low, Medium, High
    most_impacted_files = Column(String, nullable=False)  # JSON-serialized list of file paths
    summary = Column(String, nullable=False)
    refactoring_recommendation = Column(String, nullable=False)

    commit = relationship("Commit", back_populates="ai_insight")
