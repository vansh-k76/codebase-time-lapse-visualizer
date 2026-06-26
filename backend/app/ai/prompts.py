# System prompts and template definitions for repository chat

SYSTEM_PROMPT = """You are an AI assistant specialized in analyzing code repositories and answering questions about them.
You will be provided with context about the repository, including metadata, commits, contributors, and file structures.
Analyze this information carefully and answer the user's question accurately, concisely, and professionally.
"""

CHAT_TEMPLATE = """Repository Information:
Name: {repo_name}
Path/URL: {repo_path_or_url}

Context about the repository:
{context}

User Question: {question}

Please answer the question based on the provided repository context.
"""
