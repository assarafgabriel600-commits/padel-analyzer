from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional
from datetime import datetime


# ── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    first_name: str
    last_name: str


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn]
    session_id: Optional[str] = None


# ── Exercises ────────────────────────────────────────────────────────────────

class ExerciseOut(BaseModel):
    id: str
    source_site: str
    year: int
    subject: str
    theme: Optional[str]
    sub_theme: Optional[str]
    exercise_type: Optional[str]
    difficulty: Optional[int]
    points: Optional[int]
    text_content: Optional[str]


# ── Generated Subjects ───────────────────────────────────────────────────────

class GeneratedSubjectOut(BaseModel):
    id: str
    title: str
    pdf_url: Optional[str]
    subjects: Optional[list[str]]
    themes: Optional[list[str]]
    user_prompt: str
    created_at: datetime
    exercise_count: Optional[int] = None


# ── Pipeline ─────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    source: str = "strabon"  # "strabon" | "eduscol" | "education_gouv"
    year: Optional[int] = None
    limit: Optional[int] = None


class PipelineStatusOut(BaseModel):
    exercises_total: int
    exercises_by_subject: dict
    last_scrape: Optional[datetime]
