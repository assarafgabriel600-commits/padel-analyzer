from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, chat, subjects

app = FastAPI(
    title="BrevApp API",
    description="Backend for BrevApp — Brevet des collèges exam prep assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(subjects.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": "BrevApp API"}
