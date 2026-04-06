"""事実関係類似判例検索サービス — Google File Search API連携。"""

import asyncio
import json
import logging
import re
from collections.abc import AsyncGenerator

import anthropic
from google import genai
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Case

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(3)


# ── Pydantic モデル ──────────────────────────────────────


class SearchFilters(BaseModel):
    court_name: str | None = None
    trial_type: str | None = None
    year_from: int | None = None
    year_to: int | None = None


class CitedChunk(BaseModel):
    case_id: str
    case_number: str
    case_name: str | None = None
    court_name: str | None = None
    decision_date: str | None = None
    result: str | None = None
    chunk_text: str


class SimilarCaseResult(BaseModel):
    query: str
    total_found: int
    cases: list[CitedChunk]
    analysis: str | None = None


class TimelineEvent(BaseModel):
    case_id: str
    case_number: str
    date: str
    court_name: str | None = None
    result: str | None = None
    fact_summary: str
    relevance: str


# ── クライアント ──────────────────────────────────────


def _get_client() -> genai.Client:
    if not settings.google_api_key:
        raise ValueError("GOOGLE_API_KEYが設定されていません。")
    return genai.Client(api_key=settings.google_api_key)


def _get_anthropic_client() -> anthropic.AsyncAnthropic:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEYが設定されていません。")
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def _claude_analyze(query: str, cases_summary: str) -> str:
    """Claude Opus 4.6 extended thinking で判例分析を行う。"""
    try:
        client = _get_anthropic_client()
        response = await client.messages.create(
            model="claude-opus-4-20250514",
            max_tokens=16000,
            thinking={
                "type": "enabled",
                "budget_tokens": 10000,
            },
            messages=[{
                "role": "user",
                "content": f"""あなたは日本の判例分析の専門家です。以下の検索クエリに対して、見つかった判例の分析を行ってください。

## 検索クエリ
{query}

## 見つかった判例
{cases_summary}

## 分析指示
1. 各判例とクエリの事実関係の類似点を具体的に説明してください
2. 判例の法的意義と実務への示唆を述べてください
3. 関連する法律条文や判例法理に言及してください
4. Markdown形式で構造化して回答してください"""
            }],
        )
        # Extract text blocks (skip thinking blocks)
        text_parts = [block.text for block in response.content if block.type == "text"]
        return "\n".join(text_parts)
    except Exception as e:
        logger.warning("Claude analysis failed, falling back to Gemini: %s", e)
        return ""


def _store_name() -> str:
    return f"fileSearchStores/{settings.file_search_store_id}"


def _build_metadata_filter(filters: SearchFilters | None) -> str | None:
    """SearchFiltersからGoogle File Searchのmetadata_filterクエリを構築する。"""
    if not filters:
        return None
    parts = []
    if filters.court_name:
        parts.append(f'court_name="{filters.court_name}"')
    if filters.trial_type:
        parts.append(f'trial_type="{filters.trial_type}"')
    if filters.year_from:
        parts.append(f"decision_year >= {filters.year_from}")
    if filters.year_to:
        parts.append(f"decision_year <= {filters.year_to}")
    return " AND ".join(parts) if parts else None


def _enrich_with_db(db: Session, case_ids: list[str]) -> dict[str, Case]:
    """case_idリストからSQLiteの判例詳細を取得する。"""
    if not case_ids:
        return {}
    cases = db.execute(select(Case).where(Case.id.in_(case_ids))).scalars().all()
    return {str(c.id): c for c in cases}


# ── 類似判例検索 ──────────────────────────────────────


SEARCH_SYSTEM_PROMPT = """あなたは日本法の判例検索アシスタントです。
ユーザーが提供する事実関係に基づいて、FileSearchツールを使い類似判例を検索してください。

重要な指示：
- 可能な限り多くの類似判例を見つけてください。
- 検索で見つかった全ての関連判例の事件番号を漏れなく列挙してください。
- 事実関係の類似点を具体的に説明してください。
- 回答はMarkdown形式で作成してください。"""


def _build_filter_instructions(filters: SearchFilters | None) -> str:
    if not filters:
        return ""
    parts = []
    if filters.court_name:
        parts.append(f"裁判所: {filters.court_name}")
    if filters.trial_type:
        parts.append(f"事件種類: {filters.trial_type}")
    if filters.year_from:
        parts.append(f"{filters.year_from}年以降")
    if filters.year_to:
        parts.append(f"{filters.year_to}年以前")
    return f"\n\n検索条件: {', '.join(parts)}の判例に絞ってください。" if parts else ""


def _extract_keywords(query: str) -> list[str]:
    """検索クエリから主要キーワードを抽出する。"""
    # 一般的な助詞・動詞を除外してキーワードを抽出
    stopwords = {"の", "が", "を", "に", "は", "で", "と", "した", "する", "れた", "された", "について", "における", "から", "まで", "ため", "こと", "もの", "ある", "いる", "おける", "よる", "対する", "関する", "事案", "判例", "検索", "類似"}
    # 2文字以上のカタカナ・漢字の連続を抽出
    tokens = re.findall(r"[\u4e00-\u9fff\u30a0-\u30ff]{2,}", query)
    return [t for t in tokens if t not in stopwords]


async def _file_search_call(client, query_text: str) -> tuple[list[str], str]:
    """1回のFile Search。(grounding chunkテキストのリスト, AI応答テキスト)"""
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=query_text,
        config=types.GenerateContentConfig(
            system_instruction=SEARCH_SYSTEM_PROMPT,
            tools=[types.Tool(file_search=types.FileSearch(
                file_search_store_names=[_store_name()],
            ))],
        ),
    )

    chunk_texts = []
    if response.candidates:
        grounding = getattr(response.candidates[0], "grounding_metadata", None)
        if grounding:
            for chunk in (getattr(grounding, "grounding_chunks", []) or []):
                ctx = getattr(chunk, "retrieved_context", None)
                if ctx:
                    chunk_texts.append(getattr(ctx, "text", "") or "")

    return chunk_texts, response.text or ""


def _sqlite_keyword_search(db: Session, keywords: list[str], limit: int = 20) -> list[Case]:
    """SQLiteでキーワードのLIKE検索を実行し、追加候補を取得する。"""
    if not keywords:
        return []

    # case_gist/gistに主要キーワードが2つ以上含まれる判例を検索
    conditions = []
    for kw in keywords[:5]:  # 上位5キーワード
        conditions.append(
            (Case.case_gist.isnot(None) & Case.case_gist.contains(kw))
            | (Case.gist.isnot(None) & Case.gist.contains(kw))
        )

    if len(conditions) < 2:
        return []

    from sqlalchemy import and_, or_
    # 少なくとも2つのキーワードにマッチ — OR組み合わせで実装
    from itertools import combinations
    combo_conditions = []
    for combo in combinations(conditions, min(2, len(conditions))):
        combo_conditions.append(and_(*combo))

    query = (
        select(Case)
        .where(or_(*combo_conditions))
        .order_by(Case.decision_date.desc())
        .limit(limit)
    )
    return list(db.execute(query).scalars().all())


async def search_similar_cases(
    db: Session,
    query: str,
    filters: SearchFilters | None = None,
    top_k: int = 10,
) -> SimilarCaseResult:
    """File Search + SQLiteキーワード検索のハイブリッド検索。"""
    if not settings.file_search_store_id:
        raise ValueError("FILE_SEARCH_STORE_IDが設定されていません。")

    client = _get_client()
    filter_instructions = _build_filter_instructions(filters)

    # ── Pass 1: File Search (2回、異なる視点) ──
    prompts = [
        f"以下の事実関係に類似する判例を検索してください。事実の類似性を重視し、関連する判例を全て挙げてください。{filter_instructions}\n\n{query}",
        f"以下の事実関係に関連する法的争点に基づいて、類似判例をさらに検索してください。損害賠償、差別、契約解除、不法行為など様々な観点で探してください。{filter_instructions}\n\n{query}",
    ]

    all_chunk_texts: list[str] = []
    first_analysis = ""

    for i, prompt in enumerate(prompts):
        async with _semaphore:
            chunk_texts, analysis_text = await _file_search_call(client, prompt)
        all_chunk_texts.extend(chunk_texts)
        if i == 0:
            first_analysis = analysis_text

    # ── Pass 2: chunkテキストから関連する事件番号だけを抽出 (Gemini構造化出力) ──
    combined_chunks = "\n---\n".join(all_chunk_texts)
    if combined_chunks:
        extract_prompt = f"""以下の判例データの中から、「{query}」に事実関係が類似する判例の事件番号だけを全て抽出してください。
無関係な判例は除外してください。事件番号のみをJSON配列で返してください。

判例データ:
{combined_chunks[:15000]}"""

        async with _semaphore:
            extract_response = client.models.generate_content(
                model=settings.gemini_model,
                contents=extract_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

        file_search_case_numbers = []
        try:
            parsed = json.loads(extract_response.text or "[]")
            if isinstance(parsed, list):
                file_search_case_numbers = [str(x) for x in parsed if x]
        except (json.JSONDecodeError, TypeError):
            # フォールバック: 全事件番号を抽出
            for m in re.finditer(r"事件番号:\s*(.+?)(?:\n|$)", combined_chunks):
                file_search_case_numbers.append(m.group(1).strip())
    else:
        file_search_case_numbers = []

    # ── Pass 3: SQLiteキーワード補充検索 ──
    keywords = _extract_keywords(query)
    keyword_cases = _sqlite_keyword_search(db, keywords, limit=30)

    # ── フィルター条件構築 ──
    def _matches_filters(case: Case) -> bool:
        if not filters:
            return True
        if filters.court_name and case.court_name != filters.court_name:
            return False
        if filters.trial_type and case.trial_type != filters.trial_type:
            return False
        if case.decision_date:
            if filters.year_from and case.decision_date.year < filters.year_from:
                return False
            if filters.year_to and case.decision_date.year > filters.year_to:
                return False
        elif filters.year_from or filters.year_to:
            return False  # 日付なしのケースはフィルター指定時に除外
        return True

    # ── 結果統合 ──
    seen_ids: set[str] = set()
    cited_chunks: list[CitedChunk] = []

    # File Search結果を優先
    if file_search_case_numbers:
        cases_found = db.execute(
            select(Case).where(Case.case_number.in_(file_search_case_numbers))
        ).scalars().all()
        for case in cases_found:
            if not _matches_filters(case):
                continue
            cid = str(case.id)
            if cid not in seen_ids:
                seen_ids.add(cid)
                cited_chunks.append(CitedChunk(
                    case_id=cid,
                    case_number=case.case_number or "",
                    case_name=case.case_name,
                    court_name=case.court_name,
                    decision_date=case.decision_date.isoformat() if case.decision_date else None,
                    result=case.result,
                    chunk_text=(case.case_gist or case.gist or "")[:300],
                ))

    # SQLiteキーワード検索結果を追加
    for case in keyword_cases:
        if not _matches_filters(case):
            continue
        cid = str(case.id)
        if cid not in seen_ids:
            seen_ids.add(cid)
            cited_chunks.append(CitedChunk(
                case_id=cid,
                case_number=case.case_number or "",
                case_name=case.case_name,
                court_name=case.court_name,
                decision_date=case.decision_date.isoformat() if case.decision_date else None,
                result=case.result,
                chunk_text=(case.case_gist or case.gist or "")[:300],
            ))

    # ── Claude Opus 4.6 extended thinking で深層分析 ──
    final_cases = cited_chunks[:top_k]
    cases_summary = "\n".join(
        f"- {c.case_number} ({c.court_name}, {c.decision_date}): {c.chunk_text[:150]}"
        for c in final_cases
    )
    claude_analysis = await _claude_analyze(query, cases_summary)

    return SimilarCaseResult(
        query=query,
        total_found=len(cited_chunks),
        cases=final_cases,
        analysis=claude_analysis or first_analysis or None,
    )


# ── 検索 + AI分析ストリーミング ──────────────────────────────


async def search_and_analyze(
    db: Session,
    query: str,
    filters: SearchFilters | None = None,
    top_k: int = 10,
) -> AsyncGenerator[str, None]:
    """類似判例を検索し、AI分析をSSEストリーミングで返す。"""
    try:
        # まず検索を実行
        result = await search_similar_cases(db, query, filters, top_k)

        # 検索結果をJSON形式で最初に送信
        cases_data = [c.model_dump() for c in result.cases]
        yield json.dumps({"type": "cases", "data": cases_data}, ensure_ascii=False)

        # AI分析テキストを文単位でストリーミング
        if result.analysis:
            text = result.analysis
            # 句点(。)・改行で区切って自然なチャンクに
            sentences = re.split(r"(?<=[。\n])", text)
            for sentence in sentences:
                if sentence:
                    yield sentence
        elif result.cases:
            yield "検索結果が見つかりました。上記の判例をご確認ください。"
        else:
            yield "該当する類似判例が見つかりませんでした。検索条件を変更してお試しください。"

    except Exception as e:
        yield json.dumps({"type": "error", "message": f"検索中にエラーが発生しました: {e}"}, ensure_ascii=False)


# ── タイムライン生成 ──────────────────────────────────────


TIMELINE_SYSTEM_PROMPT = """あなたは日本の判例分析の専門家です。
与えられた判例データから、事実関係のタイムラインを生成してください。

各イベントには以下を含めてください：
- 判決日（date）
- 事実関係の要約（fact_summary）- 100文字以内
- 検索クエリとの関連性の説明（relevance）- 50文字以内"""


async def generate_case_timeline(
    db: Session,
    case_ids: list[str],
    query: str = "",
) -> list[TimelineEvent]:
    """選択された判例からタイムラインイベントを生成する。"""
    if not case_ids:
        return []

    cases = db.execute(
        select(Case).where(Case.id.in_(case_ids)).order_by(Case.decision_date)
    ).scalars().all()

    # 日付がないケースを除外
    cases = [c for c in cases if c.decision_date]

    if not cases:
        return []

    # Gemini structured outputでタイムラインを生成
    case_texts = []
    for c in cases:
        text = f"事件番号: {c.case_number}\ncase_id: {c.id}\n裁判所: {c.court_name}\n判決日: {c.decision_date}\n結果: {c.result}\n"
        if c.case_gist:
            text += f"裁判要旨: {c.case_gist[:500]}\n"
        elif c.gist:
            text += f"判示事項: {c.gist[:500]}\n"
        case_texts.append(text)

    prompt = f"""以下の判例について、タイムラインイベントをJSON配列で生成してください。

検索クエリ: {query}

判例データ:
{"---".join(case_texts)}

各イベントのJSON形式:
{{"case_id": "...", "case_number": "...", "date": "YYYY-MM-DD", "court_name": "...", "result": "...", "fact_summary": "...", "relevance": "..."}}"""

    client = _get_client()
    async with _semaphore:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=TIMELINE_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

    # レスポンスをパース
    try:
        events_data = json.loads(response.text)
        if isinstance(events_data, list):
            return [TimelineEvent(**e) for e in events_data]
        return []
    except (json.JSONDecodeError, TypeError, KeyError):
        pass

    # フォールバック: DBデータから直接タイムラインを生成
    return [
        TimelineEvent(
            case_id=str(c.id),
            case_number=c.case_number or "",
            date=c.decision_date.isoformat() if c.decision_date else "",
            court_name=c.court_name,
            result=c.result,
            fact_summary=(c.case_gist or c.gist or "")[:100],
            relevance="データベースから取得",
        )
        for c in cases
        if c.decision_date
    ]


# ── ストア状態 ──────────────────────────────────────


async def get_store_status() -> dict:
    """FileSearchStoreの状態を返す。"""
    if not settings.file_search_store_id:
        return {"status": "not_configured", "message": "FILE_SEARCH_STORE_IDが未設定です"}

    client = _get_client()
    store = client.file_search_stores.get(name=_store_name())
    return {
        "store_id": settings.file_search_store_id,
        "display_name": store.display_name,
        "active_documents": int(store.active_documents_count or 0),
        "pending_documents": int(store.pending_documents_count or 0),
        "failed_documents": int(store.failed_documents_count or 0),
        "size_bytes": int(store.size_bytes or 0),
        "status": "ready" if int(store.active_documents_count or 0) > 0 else "empty",
    }


# ── フィルタオプション ──────────────────────────────────────


def get_filter_options(db: Session) -> dict:
    """検索フィルタの選択肢を返す。"""
    courts = [
        r[0]
        for r in db.execute(
            select(Case.court_name)
            .where(Case.court_name.isnot(None))
            .group_by(Case.court_name)
            .order_by(func.count().desc())
            .limit(50)
        ).all()
    ]

    trial_types = [
        r[0]
        for r in db.execute(
            select(Case.trial_type)
            .where(Case.trial_type.isnot(None))
            .group_by(Case.trial_type)
            .order_by(func.count().desc())
        ).all()
    ]

    year_range = db.execute(
        select(
            func.min(func.strftime("%Y", Case.decision_date)),
            func.max(func.strftime("%Y", Case.decision_date)),
        ).where(Case.decision_date.isnot(None))
    ).one()

    return {
        "courts": courts,
        "trial_types": trial_types,
        "year_range": {
            "min": int(year_range[0]) if year_range[0] else 1950,
            "max": int(year_range[1]) if year_range[1] else 2025,
        },
    }
