import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.api.auth import get_current_user
from app.models.schemas import ChatRequest
from app.services.classifier import build_search_params
from app.services.search import find_exercises
from app.services.generator import generate_subject_pdf
from app.database import get_supabase
from app.config import settings
import anthropic

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = """Tu es l'assistant de BrevApp, une application qui aide les élèves de troisième à préparer le Brevet des collèges.

Ton rôle : comprendre la demande de l'élève et construire un sujet personnalisé à partir de vraies annales officielles du Brevet.

Règles de conversation :
1. Accueille chaleureusement l'élève et demande ce qu'il veut travailler s'il ne l'a pas précisé.
2. Si la demande est incomplète, pose UNE seule question de clarification à la fois (matière, thème, type d'exercice).
3. Quand tu as assez d'informations, confirme ce que tu vas chercher et génère le sujet.
4. Sois encourageant, chaleureux, adapté à un élève de 14-15 ans. Pas de jargon technique.

Matières disponibles : Histoire-Géographie-EMC, Mathématiques, Français, Sciences (SVT + Physique-Chimie)

Types d'exercices disponibles :
- Histoire-Géo-EMC : développement construit, étude de documents, questions de cours
- Maths : calcul, géométrie, problème, statistiques
- Français : compréhension de texte, dictée, réécriture, expression écrite
- Sciences : expérimentation, calcul, QCM

Quand tu as toutes les informations nécessaires, tu dois répondre avec un JSON structuré encadré par <GENERATE> et </GENERATE> :
<GENERATE>
{
  "subjects": ["histoire_geo_emc"],
  "themes": ["Guerre froide", "Espaces de faible densité"],
  "exercise_types": ["developpement_construit", "etude_documents"],
  "title": "Sujet personnalisé Histoire-Géo — Guerre froide et Espaces peu denses",
  "difficulty": 2
}
</GENERATE>

Après ce JSON, ajoute un message naturel du type "Je cherche tes exercices dans les annales officielles..."
"""


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_chat(messages: list, user_id: str, session_id: str | None):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    anthropic_messages = [{"role": m.role, "content": m.content} for m in messages]

    full_response = ""
    generate_payload = None

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=anthropic_messages,
    ) as stream:
        for text in stream.text_stream:
            full_response += text

            # Check if we have a complete <GENERATE> block mid-stream
            if "<GENERATE>" in full_response and "</GENERATE>" in full_response and generate_payload is None:
                start = full_response.index("<GENERATE>") + len("<GENERATE>")
                end = full_response.index("</GENERATE>")
                try:
                    generate_payload = json.loads(full_response[start:end].strip())
                except json.JSONDecodeError:
                    pass

            # Stream only the text visible to the user (hide the JSON block)
            visible = text
            yield _sse("token", {"text": visible})

    # If generation was requested, trigger PDF build
    if generate_payload:
        yield _sse("status", {"message": "Recherche dans les annales officielles..."})

        exercises = await find_exercises(generate_payload)

        if not exercises:
            yield _sse("error", {"message": "Aucun exercice trouvé pour ces thèmes. Essaie d'autres thèmes !"})
            return

        yield _sse("status", {"message": f"✓ {len(exercises)} exercice(s) trouvé(s). Génération du PDF..."})

        try:
            subject_id, pdf_url = await generate_subject_pdf(
                exercises=exercises,
                title=generate_payload.get("title", "Sujet personnalisé"),
                user_id=user_id,
                user_prompt=messages[-1].content if messages else "",
                metadata=generate_payload,
            )
            yield _sse("pdf_ready", {"subject_id": subject_id, "pdf_url": pdf_url, "title": generate_payload.get("title")})
        except Exception as e:
            yield _sse("error", {"message": f"Erreur lors de la génération : {str(e)}"})

    yield _sse("done", {})


@router.post("/chat/message")
async def chat_message(body: ChatRequest, current_user: dict = Depends(get_current_user)):
    return StreamingResponse(
        stream_chat(body.messages, current_user["id"], body.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
