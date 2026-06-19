from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import Base
from app.routers import document_types, documents, projects

from .auth.router import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "X-API-Key", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(projects.router)
app.include_router(document_types.router)
app.include_router(documents.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
