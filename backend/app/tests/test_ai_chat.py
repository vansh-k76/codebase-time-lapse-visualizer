import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app import models

TEST_DB_PATH = "C:/Users/hp/.gemini/antigravity-ide/scratch/codebase-time-lapse-visualizer/backend/data/test_visualizer_chat.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    os.makedirs(os.path.dirname(TEST_DB_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
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

def test_ai_chat_endpoint(client, db_session):
    # 1. Create a mock repository in database
    db_repo = models.Repository(
        name="Chat Test Repository",
        url="https://github.com/example/chat-test",
        status="completed"
    )
    db_session.add(db_repo)
    db_session.commit()
    db_session.refresh(db_repo)
    repo_id = db_repo.id

    # 2. Query chat endpoint with valid repository ID
    response = client.post("/api/ai/chat", json={
        "repository_id": repo_id,
        "question": "What does this repo do?"
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert "answer" in data
    assert data["answer"] == "Mock AI response"

    # 3. Query chat endpoint with invalid repository ID
    invalid_repo_id = 999999
    response_invalid = client.post("/api/ai/chat", json={
        "repository_id": invalid_repo_id,
        "question": "Hello?"
    })
    assert response_invalid.status_code == 404
    assert "not found" in response_invalid.json()["detail"].lower()
