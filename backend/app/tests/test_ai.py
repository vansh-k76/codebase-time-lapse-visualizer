import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app import crud, models, schemas

# Use a test SQLite database path
TEST_DB_PATH = "C:/Users/hp/.gemini/antigravity-ide/scratch/codebase-time-lapse-visualizer/backend/data/test_visualizer_ai.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    # Make sure test DB parent dir exists
    os.makedirs(os.path.dirname(TEST_DB_PATH), exist_ok=True)
    
    # Create the tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up database
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_ai_insights_endpoint(client, db_session):
    repo_path = "C:/Users/hp/.gemini/antigravity-ide/scratch/test-git-repo"
    assert os.path.exists(repo_path), "Mock repo C:/Users/hp/.gemini/antigravity-ide/scratch/test-git-repo must exist!"

    # 1. Connect repository
    response = client.post("/api/repositories/", json={
        "name": "Test Git Repo for AI Insights",
        "local_path": repo_path
    })
    assert response.status_code == 200, response.text
    repo_data = response.json()
    repo_id = repo_data["id"]

    # 2. Run analysis synchronously
    from app.git_analyzer import analyze_repository
    analyze_repository(repo_id, db_session)

    # Verify repository status
    response = client.get(f"/api/repositories/{repo_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

    # 3. Request AI Insights for the first time (caches them in DB)
    response = client.get(f"/api/repositories/{repo_id}/ai-insights")
    assert response.status_code == 200, response.text
    insights = response.json()
    assert len(insights) > 0

    first_insight = insights[0]
    # Check schema fields
    assert "hash" in first_insight
    assert "commit_message" in first_insight
    assert "complexity_delta" in first_insight
    assert "loc_delta" in first_insight
    assert "risk_score" in first_insight
    assert "most_impacted_files" in first_insight
    assert "summary" in first_insight
    assert "refactoring_recommendation" in first_insight

    # Ensure risk score is a valid value
    assert first_insight["risk_score"] in ["Low", "Medium", "High"]

    # Check that database records got cached
    cached_count = db_session.query(models.AICommitInsight).count()
    assert cached_count == len(insights)

    # 4. Request again and ensure it hits cache without duplicate creations
    response2 = client.get(f"/api/repositories/{repo_id}/ai-insights")
    assert response2.status_code == 200
    insights2 = response2.json()
    assert len(insights2) == len(insights)
    assert insights2[0]["hash"] == first_insight["hash"]

    # Check database records count remains unchanged
    cached_count2 = db_session.query(models.AICommitInsight).count()
    assert cached_count2 == cached_count

    # 5. Delete repository and verify cascade deletes AI insights
    response_del = client.delete(f"/api/repositories/{repo_id}")
    assert response_del.status_code == 200
    
    # Assert database records got deleted
    cached_count_after_delete = db_session.query(models.AICommitInsight).count()
    assert cached_count_after_delete == 0
