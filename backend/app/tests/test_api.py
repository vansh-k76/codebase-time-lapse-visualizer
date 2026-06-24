import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app import crud, models, schemas

# Use a test SQLite database path
TEST_DB_PATH = "C:/Users/hp/.gemini/antigravity-ide/scratch/codebase-time-lapse-visualizer/backend/data/test_visualizer.db"
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

def test_api_workflow(client, db_session):
    # Verify the local mock git repository exists
    repo_path = "C:/Users/hp/.gemini/antigravity-ide/scratch/test-git-repo"
    
    # Assert mock repo exists (from our create_mock_repo.py script)
    assert os.path.exists(repo_path), "Please ensure the mock repo has been created using create_mock_repo.py"

    # 1. Connect repository
    response = client.post("/api/repositories/", json={
        "name": "Test Git Repo",
        "local_path": repo_path
    })
    assert response.status_code == 200, response.text
    repo_data = response.json()
    assert repo_data["name"] == "Test Git Repo"
    assert repo_data["local_path"] == repo_path
    assert repo_data["status"] == "pending"
    repo_id = repo_data["id"]

    # 2. Run analysis synchronously for testing
    from app.git_analyzer import analyze_repository
    analyze_repository(repo_id, db_session)

    # 3. Read repository details
    response = client.get(f"/api/repositories/{repo_id}")
    assert response.status_code == 200
    repo_details = response.json()
    assert repo_details["status"] == "completed"

    # 4. GET /api/repositories
    response = client.get("/api/repositories/")
    assert response.status_code == 200
    repos = response.json()
    assert len(repos) >= 1
    assert any(r["id"] == repo_id for r in repos)

    # 5. GET /repositories/{id}/timeline
    response = client.get(f"/api/repositories/{repo_id}/timeline")
    assert response.status_code == 200
    timeline = response.json()
    assert len(timeline) > 0
    first_commit = timeline[0]
    assert "hash" in first_commit
    assert "author_name" in first_commit
    assert "lines_added" in first_commit
    assert "lines_deleted" in first_commit
    assert "files_changed" in first_commit

    # 6. GET /repositories/{id}/contributors
    response = client.get(f"/api/repositories/{repo_id}/contributors")
    assert response.status_code == 200
    contributors = response.json()
    assert len(contributors) > 0
    # Our mock repo contributor is "Test Contributor"
    assert any(c["name"] == "Test Contributor" for c in contributors)

    # 7. GET /repositories/{id}/growth
    response = client.get(f"/api/repositories/{repo_id}/growth")
    assert response.status_code == 200
    growth = response.json()
    assert len(growth) > 0
    assert "total_files" in growth[0]
    assert "total_lines" in growth[0]
    assert "active_contributors_count" in growth[0]

    # 8. GET /repositories/{id}/summary
    response = client.get(f"/api/repositories/{repo_id}/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["total_commits"] == len(timeline)
    assert summary["total_contributors"] == len(contributors)

    # 9. GET /repositories/{id}/file-snapshots
    commit_hash = timeline[0]["hash"]
    response = client.get(f"/api/repositories/{repo_id}/file-snapshots?commit_hash={commit_hash}")
    assert response.status_code == 200
    snapshot = response.json()
    assert "commit" in snapshot
    assert "tree" in snapshot
    assert snapshot["tree"]["name"] == "root"

    # 10. DELETE /api/repositories/{id}
    response = client.delete(f"/api/repositories/{repo_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Repository and associated analysis deleted successfully"
