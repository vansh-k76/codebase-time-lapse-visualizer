import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import repositories, commits, contributors

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Codebase Time-Lapse Visualizer API",
    description="Backend service using FastAPI, PyDriller, and GitPython to parse and expose repository evolution histories.",
    version="1.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(repositories.router, prefix="/api")
app.include_router(commits.router, prefix="/api")
app.include_router(contributors.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "app": "Codebase Time-Lapse Visualizer API",
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
