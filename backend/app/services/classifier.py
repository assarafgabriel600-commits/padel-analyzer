"""
Classifier — uses Claude to assign a theme/sub-theme from the 3ème curriculum
to exercises that weren't pre-classified by the source site (e.g. Eduscol PDFs).

Also parses a free-text user request into structured search parameters.
"""

import json
import re
from typing import Optional
import anthropic
from app.config import settings

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


# ── Official 3ème curriculum themes ──────────────────────────────────────────

HISTOIRE_THEMES = [
    "La Première Guerre mondiale",
    "La Révolution russe et le régime soviétique",
    "La crise de 1929",
    "La Deuxième Guerre mondiale",
    "La Shoah et les génocides",
    "La Guerre froide",
    "La décolonisation",
    "La construction européenne",
    "La Ve République",
    "Le monde depuis 1989",
    "La France de 1958 à nos jours",
]

GEO_THEMES = [
    "Dynamiques territoriales de la France contemporaine",
    "Espaces de faible densité et marges",
    "Espaces de forte densité",
    "Les mobilités humaines transnationales",
    "Des espaces transformés par la mondialisation",
    "L'Afrique australe",
    "Le développement durable et la transition énergétique",
    "Territoires, populations et développement",
]

EMC_THEMES = [
    "La démocratie et ses valeurs",
    "Les libertés fondamentales",
    "La citoyenneté française et européenne",
    "L'égalité et la justice",
    "La laïcité",
    "La solidarité",
]

MATHS_THEMES = [
    "Nombres et calculs",
    "Organisation et gestion de données",
    "Grandeurs et mesures",
    "Espace et géométrie",
    "Fonctions et algèbre",
    "Probabilités et statistiques",
]

ALL_THEMES = HISTOIRE_THEMES + GEO_THEMES + EMC_THEMES + MATHS_THEMES


CLASSIFY_SYSTEM = """Tu es un expert du programme de troisième de l'Éducation nationale française.
Tu analyses des extraits de sujets du DNB (Brevet des collèges) et tu identifies :
1. Le thème principal du programme de 3ème
2. Le type d'exercice
3. Le nombre de points (si mentionné)
4. La difficulté estimée (1=facile, 2=standard, 3=difficile)

Tu réponds UNIQUEMENT avec un JSON valide, sans texte autour."""

CLASSIFY_PROMPT = """Analyse cet extrait de sujet de Brevet et retourne un JSON avec ces champs :
{{
  "theme": "nom exact du thème du programme de 3ème",
  "sub_theme": "sous-thème précis (ou null)",
  "exercise_type": "developpement_construit | etude_documents | questions_cours | calcul | geometrie | probleme | comprehension | expression_ecrite",
  "points": nombre entier ou null,
  "difficulty": 1, 2 ou 3
}}

Thèmes disponibles : {themes}

Extrait du sujet :
---
{text}
---"""


async def classify_exercise(text_content: str, subject: str) -> dict:
    """
    Returns classification dict with theme, sub_theme, exercise_type, points, difficulty.
    Falls back to empty dict on any error.
    """
    client = _get_client()
    themes_list = ", ".join(ALL_THEMES[:20])  # Keep prompt short

    prompt = CLASSIFY_PROMPT.format(
        themes=themes_list,
        text=text_content[:3000],  # Limit to avoid huge tokens
    )

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",  # Cheaper model for bulk classification
            max_tokens=256,
            system=CLASSIFY_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        # Strip any markdown fences
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        return json.loads(raw)
    except Exception:
        return {}


# ── Parse user request → search params ───────────────────────────────────────

PARSE_SYSTEM = """Tu es un assistant qui extrait des paramètres de recherche structurés
depuis une demande en langage naturel d'un élève de 3ème préparant le Brevet.
Tu réponds UNIQUEMENT avec un JSON valide."""

PARSE_PROMPT = """L'élève demande : "{request}"

Extrait les paramètres de recherche et retourne ce JSON :
{{
  "subjects": ["histoire_geo_emc" | "maths" | "francais" | "sciences"],
  "themes": ["thème 1", "thème 2"],
  "exercise_types": ["developpement_construit" | "etude_documents" | "calcul" | ...],
  "difficulty": 1 | 2 | 3 | null,
  "title": "Titre court pour le sujet généré"
}}

Si un champ n'est pas précisé, retourne null ou liste vide."""


async def build_search_params(user_request: str) -> dict:
    client = _get_client()
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=PARSE_SYSTEM,
            messages=[{"role": "user", "content": PARSE_PROMPT.format(request=user_request)}],
        )
        raw = resp.content[0].text.strip()
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        return json.loads(raw)
    except Exception:
        return {}
