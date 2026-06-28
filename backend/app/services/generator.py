"""
PDF generator — assembles a new brevet subject PDF from selected exercises.

Strategy:
1. Generate a cover page with ReportLab (matching official Brevet format)
2. For each exercise, extract pages from the source PDF with PyMuPDF
3. Concatenate: cover + exercise pages
4. Upload to S3/R2 and save reference in Supabase
"""

import io
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import boto3
from botocore.config import Config

from app.config import settings
from app.database import get_supabase


# ── S3/R2 storage ─────────────────────────────────────────────────────────────

def _get_s3():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def _upload_pdf(pdf_bytes: bytes, key: str) -> str:
    s3 = _get_s3()
    s3.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
        CacheControl="max-age=86400",
    )
    if settings.s3_endpoint:
        return f"{settings.s3_endpoint}/{settings.s3_bucket}/{key}"
    return f"https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{key}"


# ── Cover page ────────────────────────────────────────────────────────────────

SUBJECT_LABELS = {
    "histoire_geo_emc": "HISTOIRE-GÉOGRAPHIE — ENSEIGNEMENT MORAL ET CIVIQUE",
    "maths": "MATHÉMATIQUES",
    "francais": "FRANÇAIS",
    "sciences": "SCIENCES",
}


def _build_cover_page(title: str, exercises: list[dict]) -> bytes:
    """Generate a cover page that mimics the official Brevet format."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    # Infer subject from first exercise
    subject_code = exercises[0].get("subject", "histoire_geo_emc") if exercises else "histoire_geo_emc"
    subject_label = SUBJECT_LABELS.get(subject_code, subject_code.upper())
    year = datetime.now().year

    styles = {
        "ministry": ParagraphStyle("ministry", fontSize=10, alignment=TA_CENTER, spaceAfter=2),
        "title_big": ParagraphStyle("title_big", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6),
        "title_sub": ParagraphStyle("title_sub", fontSize=13, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4),
        "info": ParagraphStyle("info", fontSize=11, alignment=TA_CENTER, spaceAfter=3),
        "section": ParagraphStyle("section", fontSize=11, alignment=TA_LEFT, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4),
        "body": ParagraphStyle("body", fontSize=10, alignment=TA_LEFT, spaceAfter=2),
    }

    story = [
        Paragraph("MINISTÈRE DE L'ÉDUCATION NATIONALE", styles["ministry"]),
        Paragraph("Direction générale de l'enseignement scolaire", styles["ministry"]),
        Spacer(1, 0.5 * cm),
        HRFlowable(width="100%", thickness=2, color=colors.HexColor("#003189")),
        Spacer(1, 0.4 * cm),
        Paragraph(f"DIPLÔME NATIONAL DU BREVET — SESSION {year}", styles["title_big"]),
        Paragraph(subject_label, styles["title_sub"]),
        Spacer(1, 0.3 * cm),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#003189")),
        Spacer(1, 0.8 * cm),
        Paragraph("⚠ SUJET PERSONNALISÉ — Assemblé à partir d'annales officielles du DNB", styles["info"]),
        Spacer(1, 0.4 * cm),
        Paragraph(f"<b>{title}</b>", styles["info"]),
        Spacer(1, 1.5 * cm),
    ]

    # Table of exercises
    story.append(Paragraph("Composition du sujet :", styles["section"]))
    table_data = [["N°", "Thème", "Type d'exercice", "Points"]]
    total_points = 0
    for i, ex in enumerate(exercises, 1):
        pts = ex.get("points") or "—"
        if isinstance(pts, int):
            total_points += pts
        table_data.append([
            str(i),
            ex.get("theme") or "—",
            (ex.get("exercise_type") or "—").replace("_", " ").title(),
            str(pts),
        ])
    if total_points:
        table_data.append(["", "TOTAL", "", str(total_points)])

    table = Table(table_data, colWidths=[1 * cm, 9 * cm, 5 * cm, 2 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003189")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f0f4ff")]),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
    ]))
    story.append(table)

    # Sources section
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("Sources des exercices :", styles["section"]))
    source_sites = set(ex.get("source_site", "annales officielles") for ex in exercises)
    years = set(str(ex.get("year", "")) for ex in exercises if ex.get("year"))
    story.append(Paragraph(
        f"Exercices extraits d'annales officielles du DNB ({', '.join(years)}) — "
        f"Sources : {', '.join(source_sites)}",
        styles["body"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        "Ces exercices proviennent de sujets officiels du Diplôme National du Brevet publiés par "
        "le Ministère de l'Éducation nationale et les académies. Reproduction à usage pédagogique personnel.",
        styles["body"]
    ))

    doc.build(story)
    return buf.getvalue()


# ── Main generation function ──────────────────────────────────────────────────

async def generate_subject_pdf(
    exercises: list[dict],
    title: str,
    user_id: str,
    user_prompt: str,
    metadata: dict,
) -> tuple[str, str]:
    """
    Builds the final PDF and stores it.
    Returns (subject_id, pdf_url).
    """
    subject_id = str(uuid.uuid4())

    # 1. Cover page
    cover_bytes = _build_cover_page(title, exercises)

    # 2. Assemble exercise pages
    merged_doc = fitz.open()

    # Insert cover
    cover_doc = fitz.open("pdf", cover_bytes)
    merged_doc.insert_pdf(cover_doc)
    cover_doc.close()

    # Insert pages from each exercise's source PDF
    for ex in exercises:
        pdf_path = ex.get("pdf_path")
        if pdf_path and Path(pdf_path).exists():
            page_start = ex.get("page_start", 0)
            page_end = ex.get("page_end", 0)
            try:
                src_doc = fitz.open(pdf_path)
                merged_doc.insert_pdf(src_doc, from_page=page_start, to_page=page_end)
                src_doc.close()
            except Exception:
                # If source PDF unavailable, embed a text-only page
                _append_text_page(merged_doc, ex)
        else:
            _append_text_page(merged_doc, ex)

    pdf_bytes = merged_doc.tobytes(garbage=4, deflate=True)
    merged_doc.close()

    # 3. Upload to S3/R2
    s3_key = f"subjects/{user_id}/{subject_id}.pdf"
    try:
        pdf_url = _upload_pdf(pdf_bytes, s3_key)
    except Exception:
        # Dev fallback: save locally
        local_path = Path("/tmp") / f"{subject_id}.pdf"
        local_path.write_bytes(pdf_bytes)
        pdf_url = f"/dev/pdf/{subject_id}"

    # 4. Save to Supabase
    db = get_supabase()
    db.table("generated_subjects").insert({
        "id": subject_id,
        "user_id": user_id,
        "title": title,
        "pdf_url": pdf_url,
        "pdf_path": s3_key,
        "exercise_ids": [ex["id"] for ex in exercises],
        "user_prompt": user_prompt,
        "subjects": list({ex.get("subject") for ex in exercises if ex.get("subject")}),
        "themes": list({ex.get("theme") for ex in exercises if ex.get("theme")}),
    }).execute()

    return subject_id, pdf_url


def _append_text_page(doc: fitz.Document, exercise: dict):
    """Append a plain-text page when source PDF page is unavailable."""
    page = doc.new_page(width=595, height=842)  # A4

    theme = exercise.get("theme") or ""
    ex_type = (exercise.get("exercise_type") or "").replace("_", " ").title()
    text = exercise.get("text_content") or "Exercice non disponible."

    y = 60
    page.insert_text((50, y), f"— {ex_type} —", fontsize=13, fontname="helv", color=(0, 0.2, 0.6))
    if theme:
        y += 25
        page.insert_text((50, y), theme, fontsize=11, fontname="helv")

    y += 30
    # Word-wrap text manually (PyMuPDF doesn't auto-wrap)
    max_chars = 90
    words = text.split()
    line = ""
    for word in words:
        if len(line) + len(word) + 1 > max_chars:
            page.insert_text((50, y), line, fontsize=10, fontname="helv")
            y += 16
            if y > 800:
                break
            line = word
        else:
            line = f"{line} {word}".strip()
    if line and y <= 800:
        page.insert_text((50, y), line, fontsize=10, fontname="helv")
