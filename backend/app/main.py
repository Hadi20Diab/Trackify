from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="Trackify backend powered by FastAPI + Supabase",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.project_name, "docs": "/docs"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
