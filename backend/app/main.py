import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import Base
from app.routers import (
    attachments,
    comments,
    document_types,
    documents,
    invitations,
    notifications,
    projects,
    regex_patterns,
    settings as settings_router,
    subscriptions,
)

from .auth.router import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "X-API-Key", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(projects.router)
app.include_router(document_types.router)
app.include_router(documents.router)
app.include_router(regex_patterns.router)
app.include_router(settings_router.router)
app.include_router(notifications.router)
app.include_router(comments.router)
app.include_router(invitations.router)
app.include_router(subscriptions.router)
app.include_router(attachments.router)

# Serve uploaded files
uploads_path = os.path.abspath(settings.upload_dir)
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
