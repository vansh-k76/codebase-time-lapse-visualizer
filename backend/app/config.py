import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPOS_DIR = DATA_DIR / "cloned_repos"

# Ensure dirs exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPOS_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = f"sqlite:///{DATA_DIR}/visualizer.db"

class Settings:
    DATABASE_URL: str = DATABASE_URL
    REPOS_DIR: Path = REPOS_DIR
    DATA_DIR: Path = DATA_DIR

settings = Settings()
