"""AI-powered fact visualization service for court judgments."""

import asyncio
import json
import logging
import re
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Case
from backend.services.llm_service import _get_client, _semaphore
from backend.services.strategy_service import _parse_json_response

logger = logging.getLogger(__name__)

TIMELINE_SYSTEM_PROMPT = """あなたは日本の判決文分析の専門家です。判決文の事実セクションから時系列イベントを構造化JSONで抽出してください。

出力JSON形式:
{
  "events": [{
    "date": "判決文の表記そのまま（例: 平成30年4月1日）",
    "date_sort": "ソート用ISO日付（例: 2018-04-01）。おおよその場合はその月の1日を使用",
    "actor": "行為者（原告、被告、第三者名など）",
    "action": "行為の内容（50字以内）",
    "category": "contract|payment|dispute|filing|ruling|other",
    "significance": "high|medium|low",
    "source_text": "この事実が記載されている原文の一文をそのまま引用"
  }],
  "summary": "事実関係の概要（100字以内）",
  "parties": ["当事者名のリスト"]
}

抽出ルール:
1. 日付が明示されたイベントを優先的に抽出してください（最大20件）
2. 「頃」「ころ」等のおおよその表現の場合もdate_sortは推定してください
3. イベントは時系列順に並べてください
4. significance: 事件の結論に与える影響度で判断してください
5. source_text: 必ず原文から直接引用すること（改変しないでください）
6. JSONのみを返してください。説明文は不要です"""

RELATIONSHIP_SYSTEM_PROMPT = """あなたは日本の判決文分析の専門家です。判決文から当事者間の関係を構造化JSONで抽出してください。

出力JSON形式:
{
  "nodes": [{
    "id": "一意識別子（英数字、例: plaintiff, defendant, company_a）",
    "label": "表示名（例: 原告 A、被告 B株式会社）",
    "type": "plaintiff|defendant|third_party|organization"
  }],
  "edges": [{
    "from": "ノードid",
    "to": "ノードid",
    "label": "関係の内容（例: 雇用契約、売買契約）",
    "type": "contract|employment|claim|payment|guarantee|other",
    "source_text": "この関係が記載されている原文の一文をそのまま引用"
  }],
  "summary": "当事者関係の概要（80字以内）"
}

抽出ルール:
1. 原告・被告は必ず含めてください
2. 重要な第三者（保証人、取引先等）も含めてください（最大8ノード）
3. 各edgeのlabelは関係の性質を簡潔に記述してください
4. source_text: 必ず原文から直接引用すること
5. JSONのみを返してください。説明文は不要です"""

# Regex patterns for Japanese judgment section headers
_FACT_PATTERNS = [
    re.compile(r"事\s*実\s*及\s*び\s*理\s*由"),
    re.compile(r"事\s*実\s*の\s*概\s*要"),
    re.compile(r"(?:^|\n)\s*事\s*実\s*(?:\n|$)"),
]
_NEXT_SECTION_PATTERNS = re.compile(
    r"(?:^|\n)\s*(?:理\s*由|主\s*文|結\s*論|当裁判所の判断)\s*(?:\n|$)"
)


def extract_fact_section(
    full_text: str, gist: str | None = None, case_gist: str | None = None
) -> str:
    """Extract the fact section from judgment text using regex, with fallback."""
    if not full_text:
        parts = []
        if gist:
            parts.append(f"【判示事項】\n{gist}")
        if case_gist:
            parts.append(f"【裁判要旨】\n{case_gist}")
        return "\n\n".join(parts) if parts else ""

    text = full_text
    # Try to find fact section using patterns
    for pattern in _FACT_PATTERNS:
        match = pattern.search(text)
        if match:
            start = match.start()
            # Find the next section header after the fact section
            next_match = _NEXT_SECTION_PATTERNS.search(text, match.end() + 10)
            end = next_match.start() if next_match else len(text)
            section = text[start:end].strip()
            if len(section) > 100:  # Sanity check
                return section[:10000]

    # Fallback: combine gist + case_gist + beginning of full_text
    parts = []
    if gist:
        parts.append(f"【判示事項】\n{gist[:2000]}")
    if case_gist:
        parts.append(f"【裁判要旨】\n{case_gist[:2000]}")
    remaining = 8000 - sum(len(p) for p in parts)
    if remaining > 500:
        parts.append(f"【判決文抜粋】\n{full_text[:remaining]}")
    return "\n\n".join(parts)[:10000]


async def generate_fact_timeline(fact_text: str) -> dict:
    """Generate a timeline of facts from judgment text using Claude."""
    client = _get_client()
    for attempt in range(2):
        try:
            async with _semaphore:
                response = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=4096,
                    system=TIMELINE_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": fact_text}],
                )
            result = _parse_json_response(response.content[0].text)
            # Validate required keys
            if "events" not in result:
                result["events"] = []
            if "summary" not in result:
                result["summary"] = ""
            if "parties" not in result:
                result["parties"] = []
            # Sort events by date_sort
            result["events"].sort(key=lambda e: e.get("date_sort", "9999"))
            return result
        except (json.JSONDecodeError, ValueError) as e:
            if attempt == 0:
                logger.warning("Timeline JSON parse failed, retrying: %s", e)
                continue
            logger.error("Timeline generation failed after retry: %s", e)
            return {"events": [], "summary": "", "parties": [], "error": str(e)}
    return {"events": [], "summary": "", "parties": []}


async def generate_relationship_diagram(fact_text: str) -> dict:
    """Generate a relationship diagram from judgment text using Claude."""
    client = _get_client()
    for attempt in range(2):
        try:
            async with _semaphore:
                response = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=2048,
                    system=RELATIONSHIP_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": fact_text}],
                )
            result = _parse_json_response(response.content[0].text)
            if "nodes" not in result:
                result["nodes"] = []
            if "edges" not in result:
                result["edges"] = []
            if "summary" not in result:
                result["summary"] = ""
            return result
        except (json.JSONDecodeError, ValueError) as e:
            if attempt == 0:
                logger.warning("Relationship JSON parse failed, retrying: %s", e)
                continue
            logger.error("Relationship generation failed after retry: %s", e)
            return {"nodes": [], "edges": [], "summary": "", "error": str(e)}
    return {"nodes": [], "edges": [], "summary": ""}


async def generate_fact_visualizations(
    db: Session,
    case_id: str,
    full_text: str,
    gist: str | None = None,
    case_gist: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Generate fact visualizations, yielding SSE events. Uses DB cache if available."""
    # Check DB cache
    case = db.get(Case, case_id)
    if case and case.fact_viz_json:
        try:
            cached = json.loads(case.fact_viz_json)
            yield {"type": "status", "step": "cached"}
            if "timeline" in cached:
                yield {"type": "timeline", "data": cached["timeline"]}
            if "relationships" in cached:
                yield {"type": "relationships", "data": cached["relationships"]}
            yield {"type": "done"}
            return
        except (json.JSONDecodeError, TypeError):
            logger.warning("Corrupted cache for case %s, regenerating", case_id)

    # Extract fact section
    yield {"type": "status", "step": "extracting"}
    fact_text = extract_fact_section(full_text, gist, case_gist)
    if not fact_text:
        yield {"type": "error", "message": "事実セクションを抽出できませんでした。"}
        return

    # Generate both in parallel
    yield {"type": "status", "step": "analyzing"}
    timeline_result, relationship_result = await asyncio.gather(
        generate_fact_timeline(fact_text),
        generate_relationship_diagram(fact_text),
    )

    timeline_ok = bool(timeline_result.get("events")) and "error" not in timeline_result
    relationship_ok = bool(relationship_result.get("nodes")) and "error" not in relationship_result

    if not timeline_ok and not relationship_ok:
        yield {
            "type": "error",
            "message": "事実の可視化データを生成できませんでした。判決文の内容を確認してください。",
        }
        return

    # Yield results
    yield {"type": "timeline", "data": timeline_result}
    yield {"type": "relationships", "data": relationship_result}

    # Save to DB cache
    try:
        cache_data = json.dumps(
            {"timeline": timeline_result, "relationships": relationship_result},
            ensure_ascii=False,
        )
        if case:
            case.fact_viz_json = cache_data
            db.commit()
    except Exception as e:
        logger.warning("Failed to cache visualization for case %s: %s", case_id, e)

    yield {"type": "done"}
