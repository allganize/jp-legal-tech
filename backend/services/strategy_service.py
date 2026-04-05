"""Strategy simulation AI service using Anthropic Claude API."""

import asyncio
import json
import logging
import re
from collections.abc import AsyncIterator

import anthropic
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Judge, JudgePersona
from backend.services.judge_service import get_judge_profile

logger = logging.getLogger(__name__)
_semaphore = asyncio.Semaphore(3)

MAX_TOKENS_JSON = 4096
MAX_TOKENS_BRIEF = 8192


def _get_client() -> anthropic.AsyncAnthropic:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEYが設定されていません。")
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def _build_judge_info(db: Session, judge_id: int) -> str | None:
    """Build judge context string from real case data."""
    judge = db.get(Judge, judge_id)
    if not judge:
        return None

    profile = get_judge_profile(db, judge_id)

    # Try to get persona
    persona = db.query(JudgePersona).filter(JudgePersona.judge_id == judge_id).first()
    persona_text = ""
    if persona and persona.persona_text:
        try:
            persona_data = json.loads(persona.persona_text)
            if isinstance(persona_data, dict):
                persona_text = persona_data.get("summary", "")
        except (json.JSONDecodeError, TypeError):
            pass

    info_parts = [
        f"裁判官: {judge.name} ({judge.court_name or '不明'})",
        f"担当件数: {profile.get('case_count', 0)}件",
    ]

    # Add case type distribution
    type_dist = profile.get("case_type_distribution", [])
    if type_dist:
        dist_str = ", ".join(f"{t['type']}:{t['count']}件" for t in type_dist[:5])
        info_parts.append(f"事件種別分布: {dist_str}")

    # Add result distribution
    result_dist = profile.get("result_type_distribution", [])
    if result_dist:
        dist_str = ", ".join(f"{r['type']}:{r['count']}件" for r in result_dist[:5])
        info_parts.append(f"判決結果分布: {dist_str}")

    if persona_text:
        info_parts.append(f"判決傾向: {persona_text[:200]}")

    return "\n".join(info_parts)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _parse_json_response(text: str) -> dict:
    """Parse JSON from AI response, stripping code fences if present."""
    cleaned = _strip_code_fences(text)
    return json.loads(cleaned)


async def extract_issues(
    db: Session,
    overview: str,
    case_type: str,
    party_position: str,
    judge_id: int | None = None,
) -> dict:
    """Analyze a case and extract 12 legal issues using Claude.

    Returns dict with "issues" list and "total_precedents" count.
    """
    client = _get_client()

    judge_info = _build_judge_info(db, judge_id) if judge_id else None

    system_prompt = """あなたは日本の訴訟戦略分析AIです。与えられた案件情報を基に、類似判例から主要な法的争点を抽出し、重要度順にランク付けしてください。

出力は以下のJSON形式で12件の争点を返してください:
{
  "issues": [
    {
      "rank": 1,
      "name": "争点名（日本語、20字以内）",
      "category": "故意|過失|因果関係|損害賠償|証拠|手続",
      "score": 0-100の整数,
      "frequency": 0-100の整数,
      "win_rate": 0-100の数値,
      "lose_rate": 0-100の数値,
      "other_rate": 0-100の数値
    }
  ],
  "total_precedents": 判例総数の整数
}

JSONのみを返してください。説明は不要です。"""

    user_content = f"""案件種別: {case_type}
当事者立場: {party_position}
案件概要: {overview}"""

    if judge_info:
        user_content += f"\n\n裁判官情報: {judge_info}"

    for attempt in range(2):
        try:
            async with _semaphore:
                response = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=MAX_TOKENS_JSON,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                )
            text = response.content[0].text
            result = _parse_json_response(text)

            if "issues" not in result or "total_precedents" not in result:
                raise ValueError("Missing required keys in response")

            # Ensure win_rate + lose_rate + other_rate ~= 100 for each issue
            for issue in result["issues"]:
                total = issue.get("win_rate", 0) + issue.get("lose_rate", 0) + issue.get("other_rate", 0)
                if total == 0:
                    issue["other_rate"] = 100.0

            return result

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning("extract_issues attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                continue
            raise

    raise RuntimeError("extract_issues failed after retries")


async def generate_strategies(
    db: Session,
    overview: str,
    selected_issues: list[dict],
    party_position: str,
    judge_id: int | None = None,
) -> dict:
    """Generate attack and defense strategies based on selected issues.

    Returns dict with "attacks" and "defenses" lists.
    """
    client = _get_client()

    judge_info = _build_judge_info(db, judge_id) if judge_id else None

    system_prompt = """あなたは日本の訴訟戦略立案AIです。争点に基づき、相手方の予想攻撃戦略と自己の防御戦略を生成してください。

出力は以下のJSON形式:
{
  "attacks": [
    {"title": "攻撃戦略名", "description": "2-3文の説明", "strength_pct": 0-100, "score_pct": 0-100, "precedent_count": 整数}
  ],
  "defenses": [
    {"title": "防御戦略名", "description": "2-3文の説明", "strength_pct": 0-100, "score_pct": 0-100, "precedent_count": 整数}
  ]
}

攻撃は3件、防御は4件を生成してください。JSONのみを返してください。"""

    issues_text = "\n".join(
        f"- {issue.get('name', '')} (カテゴリ: {issue.get('category', '')}, スコア: {issue.get('score', '')})"
        for issue in selected_issues
    )

    user_content = f"""当事者立場: {party_position}
案件概要: {overview}

選択された争点:
{issues_text}"""

    if judge_info:
        user_content += f"\n\n裁判官情報: {judge_info}"

    for attempt in range(2):
        try:
            async with _semaphore:
                response = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=MAX_TOKENS_JSON,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                )
            text = response.content[0].text
            result = _parse_json_response(text)

            if "attacks" not in result or "defenses" not in result:
                raise ValueError("Missing required keys in response")

            return result

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning("generate_strategies attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                continue
            raise

    raise RuntimeError("generate_strategies failed after retries")


async def generate_brief_stream(
    overview: str,
    issues: list[dict],
    strategies: list[dict],
    party_position: str,
) -> AsyncIterator[dict]:
    """Stream a Japanese legal brief using Claude streaming.

    Yields dicts with type: text/section_start/section_complete/done.
    """
    client = _get_client()

    system_prompt = """あなたは日本の法律文書作成AIです。準備書面を生成してください。

各セクションの開始時に [SECTION_START:N:タイトル] マーカーを、終了時に [SECTION_END:N] マーカーを挿入してください。

5つのセクションを生成してください:
[SECTION_START:0:表題・当事者]
[SECTION_START:1:請求の趣旨]
[SECTION_START:2:事案の概要]
[SECTION_START:3:争点に対する主張]
[SECTION_START:4:証拠説明]

文体: である体（フォーマル法律文書）"""

    issues_text = "\n".join(
        f"- {issue.get('name', '')} (カテゴリ: {issue.get('category', '')})"
        for issue in issues
    )

    strategies_text = "\n".join(
        f"- [{s.get('side', '')}] {s.get('title', '')}: {s.get('description', '')}"
        for s in strategies
    )

    user_content = f"""当事者立場: {party_position}
案件概要: {overview}

争点:
{issues_text}

戦略:
{strategies_text}

上記に基づき、準備書面を生成してください。"""

    buffer = ""

    async with _semaphore:
        async with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=MAX_TOKENS_BRIEF,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            async for raw_text in stream.text_stream:
                buffer += raw_text

                while True:
                    start_match = re.search(
                        r"\[SECTION_START:(\d+):([^\]]+)\]", buffer
                    )
                    end_match = re.search(r"\[SECTION_END:(\d+)\]", buffer)

                    if start_match and (not end_match or start_match.start() <= end_match.start()):
                        before = buffer[: start_match.start()]
                        if before.strip():
                            yield {"type": "text", "content": before}

                        section_index = int(start_match.group(1))
                        section_title = start_match.group(2)
                        yield {
                            "type": "section_start",
                            "section_index": section_index,
                            "section_title": section_title,
                        }
                        buffer = buffer[start_match.end():]

                    elif end_match:
                        before = buffer[: end_match.start()]
                        if before.strip():
                            yield {"type": "text", "content": before}

                        section_index = int(end_match.group(1))
                        yield {
                            "type": "section_complete",
                            "section_index": section_index,
                        }
                        buffer = buffer[end_match.end():]

                    else:
                        partial_match = re.search(r"\[(?:SECTION_(?:START|END))?[^\]]*$", buffer)
                        if partial_match:
                            safe_text = buffer[: partial_match.start()]
                            if safe_text:
                                yield {"type": "text", "content": safe_text}
                            buffer = buffer[partial_match.start():]
                        else:
                            if buffer:
                                yield {"type": "text", "content": buffer}
                            buffer = ""
                        break

    # Flush remaining buffer
    if buffer.strip():
        yield {"type": "text", "content": buffer}

    yield {"type": "done"}


async def generate_review(
    overview: str,
    brief_content: str,
    strategies: list[dict],
) -> dict:
    """Generate Red Team review with counterarguments and responses.

    Returns dict with counterarguments, responses, readiness_score, critical_weakness.
    """
    client = _get_client()

    system_prompt = """あなたは相手方弁護士の立場で反論を生成するレッドチームAIです。

出力は以下のJSON形式:
{
  "counterarguments": [
    {"title": "反論タイトル", "description": "2-3文", "strength": "strong|medium|weak", "precedent_ref": "判例参照", "citation_rate": "類似事件のNN%で引用"}
  ],
  "responses": [
    {"title": "対応戦略タイトル", "description": "2-3文", "effectiveness": "high|medium|low", "precedent_ref": "証拠参照"}
  ],
  "readiness_score": 0-100の整数,
  "critical_weakness": "最も急務な課題（1文）"
}

反論4件、対応4件を生成してください。JSONのみを返してください。"""

    strategies_text = "\n".join(
        f"- [{s.get('side', '')}] {s.get('title', '')}: {s.get('description', '')}"
        for s in strategies
    )

    user_content = f"""案件概要: {overview}

準備書面の内容:
{brief_content}

戦略:
{strategies_text}

上記の準備書面と戦略に基づき、レッドチームレビューを実施してください。"""

    for attempt in range(2):
        try:
            async with _semaphore:
                response = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=MAX_TOKENS_JSON,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                )
            text = response.content[0].text
            result = _parse_json_response(text)

            if "counterarguments" not in result or "responses" not in result:
                raise ValueError("Missing required keys in response")
            if "readiness_score" not in result:
                result["readiness_score"] = 50
            if "critical_weakness" not in result:
                result["critical_weakness"] = None

            return result

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning("generate_review attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                continue
            raise

    raise RuntimeError("generate_review failed after retries")
