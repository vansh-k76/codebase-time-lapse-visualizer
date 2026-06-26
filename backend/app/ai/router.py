from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.ai.schemas import ChatRequest, ChatResponse
from app.ai.service import AIService

router = APIRouter(
    prefix="/ai",
    tags=["ai"]
)

@router.post("/chat", response_model=ChatResponse)
def chat_with_repository(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint to chat with a repository context.
    """
    service = AIService(db)
    return service.process_chat(request)
