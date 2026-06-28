"""
PDF extractor — segments a Brevet subject PDF into individual exercises.

Strategy:
1. Extract text with coordinates via pdfplumber
2. Detect section boundaries using regex patterns for official Brevet headers
3. Extract page ranges for each exercise
4. Pull images per page with PyMuPDF
5. Store extracted images to disk for later embedding in generated PDFs
"""

import re
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import pdfplumber
import fitz  # PyMuPDF

IMAGE_DIR = Path("/tmp/brev_images")
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# Regex patterns that mark the start of a new exercise/section in a Brevet paper
SECTION_PATTERNS = [
    re.compile(r'^(EXERCICE|Exercice)\s*[1-9]', re.IGNORECASE),
    re.compile(r'^(PARTIE|Partie)\s*[A-C1-9]', re.IGNORECASE),
    re.compile(r'^(DÉVELOPPEMENT CONSTRUIT|Développement construit)', re.IGNORECASE),
    re.compile(r'^(ÉTUDE DE DOCUMENTS?|Étude de documents?)', re.IGNORECASE),
    re.compile(r'^(RAISONNEMENT GÉOGRAPHIQUE|Raisonnement géographique)', re.IGNORECASE),
    re.compile(r'^(SUJET [A-D])', re.IGNORECASE),
    re.compile(r'^\d+\s*/\s*\d+\s*points?', re.IGNORECASE),
]

EXERCISE_TYPE_MAP = {
    "développement construit": "developpement_construit",
    "étude de documents": "etude_documents",
    "raisonnement géographique": "raisonnement_geographique",
    "questions de cours": "questions_cours",
    "exercice": "exercice",
}


@dataclass
class ExtractedExercise:
    page_start: int
    page_end: int
    text_content: str
    exercise_type: Optional[str]
    points: Optional[int]
    images: list[str] = field(default_factory=list)
    raw_section_header: str = ""


def extract_exercises(pdf_path: str) -> list[ExtractedExercise]:
    """
    Main entry point. Returns a list of ExtractedExercise from a PDF path.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    segments = _segment_by_text(pdf_path)

    if len(segments) <= 1:
        # Fallback: treat entire PDF as one exercise
        segments = _single_exercise_fallback(pdf_path)

    return segments


def _segment_by_text(pdf_path: str) -> list[ExtractedExercise]:
    """Detect exercise boundaries via text pattern matching."""
    exercises: list[ExtractedExercise] = []
    current_start = 0
    current_text_lines: list[str] = []
    current_header = ""
    current_type = None
    current_points = None

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)

        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            lines = text.splitlines()

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                matched_section = _matches_section_header(stripped)
                if matched_section and page_num > 0:
                    # Save current exercise
                    if current_text_lines:
                        ex = ExtractedExercise(
                            page_start=current_start,
                            page_end=page_num - 1,
                            text_content="\n".join(current_text_lines),
                            exercise_type=current_type,
                            points=current_points,
                            raw_section_header=current_header,
                        )
                        exercises.append(ex)

                    # Start new exercise
                    current_start = page_num
                    current_header = stripped
                    current_text_lines = [stripped]
                    current_type = _infer_type(stripped)
                    current_points = _extract_points(stripped)
                else:
                    current_text_lines.append(line)
                    if current_points is None:
                        current_points = _extract_points(stripped)

        # Don't forget the last exercise
        if current_text_lines:
            ex = ExtractedExercise(
                page_start=current_start,
                page_end=total_pages - 1,
                text_content="\n".join(current_text_lines),
                exercise_type=current_type,
                points=current_points,
                raw_section_header=current_header,
            )
            exercises.append(ex)

    # Extract images for each exercise's page range
    _attach_images(pdf_path, exercises)

    return exercises


def _single_exercise_fallback(pdf_path: str) -> list[ExtractedExercise]:
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        total = len(pdf.pages)

    ex = ExtractedExercise(
        page_start=0,
        page_end=total - 1,
        text_content=text,
        exercise_type=None,
        points=None,
    )
    _attach_images(pdf_path, [ex])
    return [ex]


def _matches_section_header(line: str) -> bool:
    return any(p.search(line) for p in SECTION_PATTERNS)


def _infer_type(header: str) -> Optional[str]:
    lower = header.lower()
    for keyword, type_code in EXERCISE_TYPE_MAP.items():
        if keyword in lower:
            return type_code
    return None


def _extract_points(line: str) -> Optional[int]:
    m = re.search(r'(\d+)\s*points?', line, re.IGNORECASE)
    return int(m.group(1)) if m else None


def _attach_images(pdf_path: str, exercises: list[ExtractedExercise]):
    """Extract images from page ranges and save to disk."""
    doc = fitz.open(pdf_path)
    pdf_stem = Path(pdf_path).stem

    for ex in exercises:
        img_paths: list[str] = []
        for page_num in range(ex.page_start, min(ex.page_end + 1, len(doc))):
            page = doc[page_num]
            for img_idx, img_ref in enumerate(page.get_images(full=True)):
                xref = img_ref[0]
                try:
                    base_image = doc.extract_image(xref)
                    ext = base_image["ext"]
                    img_bytes = base_image["image"]
                    img_name = f"{pdf_stem}_p{page_num}_img{img_idx}.{ext}"
                    img_path = IMAGE_DIR / img_name
                    with open(img_path, "wb") as f:
                        f.write(img_bytes)
                    img_paths.append(str(img_path))
                except Exception:
                    pass
        ex.images = img_paths

    doc.close()


def get_page_range_bytes(pdf_path: str, page_start: int, page_end: int) -> bytes:
    """Extract a range of pages from a PDF and return as bytes (for reassembly)."""
    doc = fitz.open(pdf_path)
    new_doc = fitz.open()
    for i in range(page_start, min(page_end + 1, len(doc))):
        new_doc.insert_pdf(doc, from_page=i, to_page=i)
    data = new_doc.tobytes()
    doc.close()
    new_doc.close()
    return data
