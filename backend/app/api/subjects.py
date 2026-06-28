from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.models.schemas import GeneratedSubjectOut, ScrapeRequest, PipelineStatusOut
from app.database import get_supabase
from app.workers.tasks import scrape_source
from datetime import datetime

router = APIRouter(tags=["subjects"])


@router.get("/subjects", response_model=list[GeneratedSubjectOut])
async def list_subjects(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    resp = (
        db.table("generated_subjects")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    rows = resp.data or []
    out = []
    for r in rows:
        out.append(GeneratedSubjectOut(
            id=r["id"],
            title=r.get("title", "Sujet sans titre"),
            pdf_url=r.get("pdf_url"),
            subjects=r.get("subjects", []),
            themes=r.get("themes", []),
            user_prompt=r.get("user_prompt", ""),
            created_at=datetime.fromisoformat(r["created_at"]),
            exercise_count=len(r.get("exercise_ids", [])),
        ))
    return out


@router.get("/subjects/{subject_id}", response_model=GeneratedSubjectOut)
async def get_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    resp = (
        db.table("generated_subjects")
        .select("*")
        .eq("id", subject_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    r = resp.data
    if not r:
        raise HTTPException(status_code=404, detail="Sujet introuvable.")
    return GeneratedSubjectOut(
        id=r["id"],
        title=r.get("title", "Sujet sans titre"),
        pdf_url=r.get("pdf_url"),
        subjects=r.get("subjects", []),
        themes=r.get("themes", []),
        user_prompt=r.get("user_prompt", ""),
        created_at=datetime.fromisoformat(r["created_at"]),
        exercise_count=len(r.get("exercise_ids", [])),
    )


@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    db.table("generated_subjects").delete().eq("id", subject_id).eq("user_id", current_user["id"]).execute()
    return {"message": "Sujet supprimé."}


# ── Admin / Pipeline ─────────────────────────────────────────────────────────

@router.post("/pipeline/scrape")
async def trigger_scrape(body: ScrapeRequest, current_user: dict = Depends(get_current_user)):
    """Trigger a background scraping job (admin only in production)."""
    task = scrape_source.delay(source=body.source, year=body.year, limit=body.limit)
    return {"task_id": task.id, "message": f"Scraping {body.source} lancé en arrière-plan."}


@router.get("/pipeline/status", response_model=PipelineStatusOut)
async def pipeline_status(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    total_resp = db.table("exercises").select("id", count="exact").execute()
    total = total_resp.count or 0

    by_subject: dict = {}
    for subj in ["histoire_geo_emc", "maths", "francais", "sciences"]:
        r = db.table("exercises").select("id", count="exact").eq("subject", subj).execute()
        by_subject[subj] = r.count or 0

    last_resp = db.table("exercises").select("created_at").order("created_at", desc=True).limit(1).execute()
    last_scrape = None
    if last_resp.data:
        last_scrape = datetime.fromisoformat(last_resp.data[0]["created_at"])

    return PipelineStatusOut(
        exercises_total=total,
        exercises_by_subject=by_subject,
        last_scrape=last_scrape,
    )
