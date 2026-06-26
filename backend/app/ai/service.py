# AI Chat business logic service layer

import os

from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app import crud
from app.ai.schemas import ChatRequest, ChatResponse
from app.ai.context_builder import ContextBuilder
from app.ai import prompts

load_dotenv()


class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.context_builder = ContextBuilder(db)

        self.client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url=os.getenv("OPENROUTER_BASE_URL"),
        )

        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "openrouter/auto"
        )

    def process_chat(self, request: ChatRequest) -> ChatResponse:
        """
        Process the chat request using OpenRouter.
        """

        repo = crud.get_repository(self.db, request.repository_id)

        if not repo:
            raise HTTPException(
                status_code=404,
                detail=f"Repository with ID {request.repository_id} not found."
            )

        # Build repository context
        context = self.context_builder.build_repository_context(
            request.repository_id
        )

        # Prepare prompt
        prompt = prompts.CHAT_TEMPLATE.format(
            repo_name=repo.name,
            repo_path_or_url=repo.local_path or repo.url or "N/A",
            context=context,
            question=request.question,
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert software engineer who explains "
                            "Git repositories clearly."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.3,
            )

            answer = response.choices[0].message.content

            return ChatResponse(answer=answer)

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"OpenRouter API Error: {str(e)}",
            )