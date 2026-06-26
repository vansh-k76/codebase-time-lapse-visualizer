from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    repository_id: int = Field(..., description="ID of the repository to chat about")
    question: str = Field(..., description="The question or prompt to ask the AI")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="AI generated response/answer")
