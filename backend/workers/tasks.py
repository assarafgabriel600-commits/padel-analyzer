"""
Celery workers — background tasks for scraping, extraction, and classification.
"""

import asyncio
from celery import Celery
from app.config import settings

celery_app = Celery(
    "brev_app",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,  # Process one task at a time (PDF processing is heavy)
)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="tasks.scrape_source", max_retries=2)
def scrape_source(self, source: str = "strabon", year: int | None = None, limit: int | None = None):
    """Scrape a source site and store all found exercises in the database."""
    from app.services.scraper import scrape_strabon, scrape_eduscol
    from app.services.extractor import extract_exercises
    from app.services.classifier import classify_exercise
    from app.database import get_supabase

    db = get_supabase()
    processed = 0
    errors = 0

    async def _run():
        nonlocal processed, errors

        scraper = scrape_strabon if source == "strabon" else scrape_eduscol
        async for pdf_meta in scraper(year=year, limit=limit):
            try:
                exercises = extract_exercises(pdf_meta["local_path"])
                for ex in exercises:
                    # Classify if no theme (Strabon PDFs already have theme from scraper)
                    classification = {}
                    if not pdf_meta.get("theme") and ex.text_content:
                        classification = await classify_exercise(ex.text_content, pdf_meta.get("subject", ""))

                    theme = pdf_meta.get("theme") or classification.get("theme")
                    sub_theme = pdf_meta.get("sub_theme") or classification.get("sub_theme")

                    row = {
                        "source_site": pdf_meta["source_site"],
                        "source_url": pdf_meta["url"],
                        "pdf_path": pdf_meta["local_path"],
                        "year": pdf_meta.get("year"),
                        "session_code": pdf_meta.get("session_code"),
                        "subject": pdf_meta.get("subject", "unknown"),
                        "theme": theme,
                        "sub_theme": sub_theme,
                        "exercise_type": ex.exercise_type or classification.get("exercise_type"),
                        "difficulty": classification.get("difficulty", 2),
                        "points": ex.points or classification.get("points"),
                        "page_start": ex.page_start,
                        "page_end": ex.page_end,
                        "text_content": ex.text_content[:10000] if ex.text_content else None,
                        "images": ex.images,
                    }

                    # Upsert to avoid duplicates (source_url + page_start as natural key)
                    existing = (
                        db.table("exercises")
                        .select("id")
                        .eq("source_url", row["source_url"])
                        .eq("page_start", row["page_start"])
                        .execute()
                    )
                    if not existing.data:
                        db.table("exercises").insert(row).execute()
                        processed += 1

            except Exception as e:
                errors += 1
                print(f"Error processing {pdf_meta.get('url', '?')}: {e}")

    _run_async(_run())
    return {"processed": processed, "errors": errors, "source": source}


@celery_app.task(name="tasks.reclassify_unthemed")
def reclassify_unthemed(limit: int = 100):
    """Re-run classification on exercises that have no theme assigned."""
    from app.services.classifier import classify_exercise
    from app.database import get_supabase

    db = get_supabase()

    async def _run():
        resp = (
            db.table("exercises")
            .select("id, text_content, subject")
            .is_("theme", "null")
            .limit(limit)
            .execute()
        )
        for row in resp.data or []:
            if not row.get("text_content"):
                continue
            classification = await classify_exercise(row["text_content"], row.get("subject", ""))
            if classification.get("theme"):
                db.table("exercises").update({
                    "theme": classification["theme"],
                    "sub_theme": classification.get("sub_theme"),
                    "exercise_type": classification.get("exercise_type"),
                    "difficulty": classification.get("difficulty"),
                    "classified_at": "now()",
                }).eq("id", row["id"]).execute()

    _run_async(_run())
