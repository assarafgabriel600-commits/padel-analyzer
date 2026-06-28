"""
Search module — finds exercises matching the user's request in the database.
Uses theme/type/subject filters. Falls back to text similarity if no exact match.
"""

from app.database import get_supabase


async def find_exercises(params: dict) -> list[dict]:
    """
    params: { subjects, themes, exercise_types, difficulty, title }
    Returns list of exercise rows from the DB.
    """
    db = get_supabase()
    query = db.table("exercises").select("*")

    # Subject filter
    subjects = params.get("subjects") or []
    if len(subjects) == 1:
        query = query.eq("subject", subjects[0])
    elif subjects:
        query = query.in_("subject", subjects)

    # Exercise type filter
    ex_types = params.get("exercise_types") or []
    if len(ex_types) == 1:
        query = query.eq("exercise_type", ex_types[0])
    elif ex_types:
        query = query.in_("exercise_type", ex_types)

    # Difficulty filter
    difficulty = params.get("difficulty")
    if difficulty:
        query = query.eq("difficulty", difficulty)

    # Execute without theme filter first to see what we have
    resp = query.limit(200).execute()
    all_exercises = resp.data or []

    # Theme filter in Python (case-insensitive partial match)
    themes = params.get("themes") or []
    if themes:
        filtered = []
        for ex in all_exercises:
            ex_theme = (ex.get("theme") or "").lower()
            ex_sub = (ex.get("sub_theme") or "").lower()
            ex_text = (ex.get("text_content") or "").lower()
            for theme in themes:
                t = theme.lower()
                if t in ex_theme or t in ex_sub or t in ex_text:
                    filtered.append(ex)
                    break
        all_exercises = filtered

    if not all_exercises:
        # Fallback: return any exercises for the requested subjects
        fallback = db.table("exercises").select("*")
        if subjects:
            fallback = fallback.in_("subject", subjects)
        fallback_resp = fallback.limit(10).execute()
        all_exercises = fallback_resp.data or []

    # Pick at most 3 exercises (enough for a realistic brevet paper)
    return _pick_best_exercises(all_exercises, params)


def _pick_best_exercises(exercises: list[dict], params: dict) -> list[dict]:
    """Select a balanced set of exercises for the generated subject."""
    if not exercises:
        return []

    themes = params.get("themes") or []
    ex_types = params.get("exercise_types") or []

    # Try to get one exercise per requested theme
    selected: list[dict] = []
    used_ids: set = set()

    for theme in themes:
        t = theme.lower()
        for ex in exercises:
            if ex["id"] in used_ids:
                continue
            ex_theme = (ex.get("theme") or "").lower()
            if t in ex_theme:
                selected.append(ex)
                used_ids.add(ex["id"])
                break

    # Fill remaining slots
    for ex in exercises:
        if len(selected) >= 3:
            break
        if ex["id"] not in used_ids:
            selected.append(ex)
            used_ids.add(ex["id"])

    return selected[:3]
