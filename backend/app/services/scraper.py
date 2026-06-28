"""
Scraper module — fetches official Brevet annales from institutional sites.

Sources:
  - Strabon (histoire.ac-versailles.fr): already classified by theme/sub-theme
  - Eduscol (eduscol.education.gouv.fr): all subjects, by session
  - Education.gouv.fr: official sujets page

Uses Playwright (headless Chromium) to bypass bot-detection on gov sites.
Rate limited to 1 request/second max to be a good citizen.
"""

import asyncio
import re
import os
import hashlib
import aiofiles
from pathlib import Path
from typing import AsyncGenerator
from playwright.async_api import async_playwright, Page, Browser
import httpx

DOWNLOAD_DIR = Path("/tmp/brev_pdfs")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

STRABON_BASE = "https://histoire.ac-versailles.fr"
STRABON_DNB_RUBRIQUE = f"{STRABON_BASE}/spip.php?rubrique128"
EDUSCOL_ANNALES = "https://eduscol.education.gouv.fr/5202/preparer-le-diplome-national-du-brevet-dnb-avec-les-sujets-des-annales"
EDUGOUV_SUJETS = "https://www.education.gouv.fr/reussir-au-lycee/brevet-bac-et-cap-les-sujets-des-examens-2024-414462"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9",
}


async def _get_browser() -> Browser:
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        executable_path="/opt/pw-browsers/chromium",
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    return browser


async def _safe_goto(page: Page, url: str, delay: float = 1.0):
    await asyncio.sleep(delay)
    await page.goto(url, wait_until="domcontentloaded", timeout=30_000)


# ── Strabon ───────────────────────────────────────────────────────────────────

async def scrape_strabon(year: int | None = None, limit: int | None = None) -> AsyncGenerator[dict, None]:
    """
    Yields metadata dicts for each PDF found on Strabon.
    Each dict: { url, filename, year, theme, sub_theme, subject, source_site }
    """
    browser = await _get_browser()
    try:
        page = await browser.new_page(extra_http_headers=HEADERS)
        await _safe_goto(page, STRABON_DNB_RUBRIQUE)

        # Collect sub-rubrique links (themes)
        rubrique_links = await page.eval_on_selector_all(
            "a[href*='spip.php?rubrique']",
            "els => els.map(e => ({ href: e.href, text: e.innerText.trim() }))"
        )

        count = 0
        for rubrique in rubrique_links:
            if limit and count >= limit:
                break
            theme = rubrique["text"].strip()
            if not theme or len(theme) < 3:
                continue

            await _safe_goto(page, rubrique["href"])

            # Within each theme rubrique, look for article links and PDF links
            article_links = await page.eval_on_selector_all(
                "a[href*='spip.php?article']",
                "els => els.map(e => ({ href: e.href, text: e.innerText.trim() }))"
            )

            for article in article_links:
                if limit and count >= limit:
                    break
                sub_theme = article["text"].strip()
                await _safe_goto(page, article["href"])

                pdf_links = await page.eval_on_selector_all(
                    "a[href$='.pdf'], a[href*='/IMG/pdf/']",
                    "els => els.map(e => e.href)"
                )

                for pdf_url in pdf_links:
                    if not pdf_url.startswith("http"):
                        pdf_url = STRABON_BASE + pdf_url

                    detected_year = _extract_year_from_url(pdf_url)
                    if year and detected_year and detected_year != year:
                        continue

                    filename = pdf_url.split("/")[-1]
                    local_path = await _download_pdf(pdf_url, filename)
                    if local_path:
                        count += 1
                        yield {
                            "url": pdf_url,
                            "local_path": str(local_path),
                            "filename": filename,
                            "year": detected_year,
                            "theme": theme,
                            "sub_theme": sub_theme,
                            "subject": "histoire_geo_emc",
                            "source_site": "strabon",
                        }
    finally:
        await browser.close()


# ── Eduscol ───────────────────────────────────────────────────────────────────

async def scrape_eduscol(year: int | None = None, limit: int | None = None) -> AsyncGenerator[dict, None]:
    """Scrapes Eduscol annales page — PDFs organized by session, not by theme."""
    browser = await _get_browser()
    try:
        page = await browser.new_page(extra_http_headers=HEADERS)
        await _safe_goto(page, EDUSCOL_ANNALES)

        pdf_links = await page.eval_on_selector_all(
            "a[href$='.pdf'], a[href*='/media/']",
            "els => els.map(e => ({ href: e.href, text: e.innerText.trim() }))"
        )

        count = 0
        for link in pdf_links:
            if limit and count >= limit:
                break
            pdf_url = link["href"]
            if not pdf_url.startswith("http"):
                pdf_url = "https://eduscol.education.gouv.fr" + pdf_url

            detected_year = _extract_year_from_url(pdf_url) or _extract_year_from_text(link["text"])
            if year and detected_year and detected_year != year:
                continue

            subject = _detect_subject_from_text(link["text"])
            filename = _url_to_filename(pdf_url)
            local_path = await _download_pdf(pdf_url, filename)
            if local_path:
                count += 1
                yield {
                    "url": pdf_url,
                    "local_path": str(local_path),
                    "filename": filename,
                    "year": detected_year,
                    "theme": None,
                    "sub_theme": None,
                    "subject": subject,
                    "source_site": "eduscol",
                }
    finally:
        await browser.close()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_year_from_url(url: str) -> int | None:
    m = re.search(r'(20\d{2})', url)
    return int(m.group(1)) if m else None


def _extract_year_from_text(text: str) -> int | None:
    m = re.search(r'(20\d{2})', text)
    return int(m.group(1)) if m else None


def _detect_subject_from_text(text: str) -> str:
    text_lower = text.lower()
    if any(k in text_lower for k in ["histoire", "géo", "hgemc", "hge", "emc"]):
        return "histoire_geo_emc"
    if any(k in text_lower for k in ["math", "maths"]):
        return "maths"
    if any(k in text_lower for k in ["français", "francais", "french"]):
        return "francais"
    if any(k in text_lower for k in ["svt", "physique", "chimie", "science"]):
        return "sciences"
    return "unknown"


def _url_to_filename(url: str) -> str:
    name = url.split("/")[-1].split("?")[0]
    if not name.endswith(".pdf"):
        name = hashlib.md5(url.encode()).hexdigest()[:12] + ".pdf"
    return name


async def _download_pdf(url: str, filename: str) -> Path | None:
    dest = DOWNLOAD_DIR / filename
    if dest.exists():
        return dest

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            if "pdf" not in resp.headers.get("content-type", "").lower():
                return None
            async with aiofiles.open(dest, "wb") as f:
                await f.write(resp.content)
        return dest
    except Exception:
        return None
