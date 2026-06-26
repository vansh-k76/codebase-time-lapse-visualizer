from sqlalchemy.orm import Session
from app import crud
import os


class ContextBuilder:
    def __init__(self, db: Session):
        self.db = db

    def build_repository_context(self, repository_id: int) -> str:
        repo = crud.get_repository(self.db, repository_id)

        if not repo:
            return "Repository not found."

        commits = crud.get_commits(self.db, repository_id, limit=10)
        contributors = crud.get_contributors(self.db, repository_id)

        context = []

        # ---------------- Repository ----------------

        context.append(f"Repository Name: {repo.name}")
        context.append(f"Repository Path: {repo.local_path or repo.url}")
        context.append(f"Status: {repo.status}")

        # ---------------- Contributors ----------------

        context.append("\n===== Contributors =====")

        for c in contributors:
            context.append(
                f"{c.name} ({c.email}) - {c.total_commits} commits"
            )

        # ---------------- Recent Commits ----------------

        context.append("\n===== Recent Commits =====")

        for commit in commits:
            context.append(
                f"{commit.hash[:8]} | {commit.author_name} | {commit.message}"
            )

        # ---------------- Folder Structure ----------------

        context.append("\n===== Folder Structure =====")

        if repo.local_path and os.path.exists(repo.local_path):

            for root, dirs, files in os.walk(repo.local_path):

                level = root.replace(repo.local_path, "").count(os.sep)

                if level > 2:
                    continue

                indent = "    " * level

                context.append(f"{indent}{os.path.basename(root)}/")

                subindent = "    " * (level + 1)

                for file in files[:20]:
                    context.append(f"{subindent}{file}")

        return "\n".join(context)