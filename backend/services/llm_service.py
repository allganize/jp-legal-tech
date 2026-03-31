import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import datetime

import anthropic
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Case, CaseJudge, Judge, JudgePersona
from backend.services.judge_service import get_judge_profile

_semaphore = asyncio.Semaphore(3)


def _get_client() -> anthropic.AsyncAnthropic:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEYが設定されていません。")
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def _get_judge_case_samples(db: Session, judge_id: int, limit: int = 20) -> list[dict]:
    """裁判官の判例サンプルを取得する（case_gistがあるものを優先）。"""
    results = db.execute(
        select(
            Case.case_number,
            Case.case_name,
            Case.trial_type,
            Case.decision_date,
            Case.result_type,
            Case.gist,
            Case.case_gist,
            Case.ref_law,
            CaseJudge.role,
        )
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
        .order_by(
            # case_gistがあるものを優先
            Case.case_gist.is_(None).asc(),
            Case.decision_date.desc(),
        )
        .limit(limit)
    ).all()

    return [
        {
            "case_number": r.case_number,
            "case_name": r.case_name,
            "trial_type": r.trial_type,
            "decision_date": r.decision_date.isoformat() if r.decision_date else None,
            "result_type": r.result_type,
            "gist": r.gist,
            "case_gist": r.case_gist,
            "ref_law": r.ref_law,
            "role": r.role,
        }
        for r in results
    ]


def _get_judge_citations(db: Session, judge_id: int) -> dict:
    """裁判官が実際に引用した参照条文と参照判例を収集・整理する。"""
    results = db.execute(
        select(Case.ref_law, Case.reference_cases)
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(
            CaseJudge.judge_id == judge_id,
            (Case.ref_law.isnot(None)) | (Case.reference_cases.isnot(None)),
        )
    ).all()

    # 頻度集計
    import re
    from collections import Counter

    article_counter: Counter[str] = Counter()
    case_counter: Counter[str] = Counter()

    for row in results:
        if row.ref_law:
            # HTMLタグ除去後、条文を分離
            clean = re.sub(r"<[^>]+>", " ", row.ref_law)
            # 日本の法律条文パターン抽出
            articles = re.findall(
                r"([\u4E00-\u9FFF]+法[\u4E00-\u9FFF]*\s*(?:第?\s*\d+条(?:の\d+)?(?:第?\s*\d+項)?))",
                clean,
            )
            for art in articles:
                art = art.strip()
                if len(art) > 3:
                    article_counter[art] += 1

            # パターンにマッチしない場合、区切り文字で分割
            if not articles:
                parts = re.split(r"[/,、・]", clean)
                for part in parts:
                    part = part.strip()
                    if len(part) > 3:
                        article_counter[part] += 1

        if row.reference_cases:
            clean = re.sub(r"<[^>]+>", " ", row.reference_cases)
            # 日本の判例引用パターン抽出
            case_refs = re.findall(
                r"最(?:高裁|判|決).*?(?:平成|令和|昭和)\d+年.*?(?:第?\d+号)",
                clean,
            )
            for ref in case_refs:
                ref = re.sub(r"\s+", " ", ref.strip())
                case_counter[ref] += 1

            # パターンにマッチしない場合、全体を1件として扱う
            if not case_refs:
                parts = re.split(r"[/,、]", clean)
                for part in parts:
                    part = part.strip()
                    if len(part) > 5:
                        case_counter[part] += 1

    return {
        "articles": [
            {"article": art, "count": cnt}
            for art, cnt in article_counter.most_common(20)
        ],
        "cases": [
            {"case": cas, "count": cnt}
            for cas, cnt in case_counter.most_common(20)
        ],
    }


def _format_citations(citations: dict) -> str:
    """引用データをプロンプトに挿入するテキストにフォーマットする。"""
    lines = []
    if citations["articles"]:
        lines.append("### この裁判官が実際に引用した法条文（頻度順）")
        for item in citations["articles"]:
            lines.append(f"- {item['article']}（{item['count']}回）")
    if citations["cases"]:
        lines.append("\n### この裁判官が実際に引用した判例（頻度順）")
        for item in citations["cases"]:
            lines.append(f"- {item['case']}（{item['count']}回）")
    return "\n".join(lines) if lines else "（引用データなし）"


def _get_case_count(db: Session, judge_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(CaseJudge).where(CaseJudge.judge_id == judge_id)
    ).scalar() or 0


PERSONA_SYSTEM_PROMPT = """あなたは日本の法律専門家です。提供された裁判官の判決統計と判決文サンプルを分析し、当該裁判官の傾向プロファイルを作成してください。

必ず以下のJSON形式のみで回答してください。他のテキストは含めないでください：
{
  "tendency_summary": "判決傾向の要約。この裁判官の全般的な判決哲学、傾向、特徴を3〜5文で記述",
  "key_legal_principles": ["この裁判官が判決で頻繁に取り上げ、または重視する法理原則を3〜7個"],
  "frequently_cited": {
    "articles": ["判決で頻繁に引用される法条文（ある場合）"],
    "cases": ["頻繁に参照する判例（ある場合）"]
  },
  "writing_style": "判決文の作成スタイルの特徴。論理展開の方法、表現の厳密性、判示の構造などを2〜3文で記述",
  "document_tips": "この裁判官に提出する法律文書（訴状、準備書面等）作成時の留意事項。どのような論理構造、証拠提示方法、法理引用が効果的か3〜5項目で記述"
}"""


async def generate_judge_persona(db: Session, judge_id: int, force: bool = False) -> dict:
    """裁判官ペルソナを生成するか、キャッシュから返す。"""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("裁判官が見つかりません。")

    current_count = _get_case_count(db, judge_id)
    if current_count < 3:
        raise ValueError(f"分析する判例データが不足しています。（現在{current_count}件、最低3件必要）")

    # キャッシュ確認
    if not force:
        cached = db.execute(
            select(JudgePersona).where(JudgePersona.judge_id == judge_id)
        ).scalar_one_or_none()
        if cached and (current_count - cached.case_count_at_gen < 5):
            persona = json.loads(cached.persona_text)
            persona["generated_at"] = cached.generated_at.isoformat()
            persona["case_count"] = current_count
            persona["is_cached"] = True
            return persona

    # 統計 + 判例サンプル収集
    profile = get_judge_profile(db, judge_id)
    samples = _get_judge_case_samples(db, judge_id, limit=20)

    user_content = f"""## 裁判官情報
- 氏名: {judge.name}
- 所属: {judge.court_name or '不明'}
- 最高裁判事: {'はい' if judge.is_supreme_court else 'いいえ'}
- 活動期間: {judge.first_seen_date} ～ {judge.last_seen_date}
- 総判決数: {current_count}件

## 統計
- 事件種類分布: {json.dumps(profile['case_type_distribution'], ensure_ascii=False)}
- 判決類型分布: {json.dumps(profile['result_type_distribution'], ensure_ascii=False)}
- 役割分布: {json.dumps(profile['role_distribution'], ensure_ascii=False)}

## 判決文サンプル（{len(samples)}件）
"""
    for i, s in enumerate(samples, 1):
        user_content += f"\n### 判例 {i}: {s['case_number']}（{s['trial_type'] or '未分類'}）\n"
        user_content += f"- 事件名: {s['case_name']}\n"
        user_content += f"- 判決日: {s['decision_date']}\n"
        user_content += f"- 判決類型: {s['result_type']}\n"
        user_content += f"- 役割: {s['role']}\n"
        if s['gist']:
            user_content += f"- 判示事項: {s['gist'][:500]}\n"
        if s['case_gist']:
            user_content += f"- 裁判要旨: {s['case_gist'][:800]}\n"
        if s['ref_law']:
            user_content += f"- 参照条文: {s['ref_law'][:300]}\n"

    client = _get_client()
    async with _semaphore:
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=2000,
            system=PERSONA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

    result_text = response.content[0].text.strip()
    # JSONブロック抽出（```json ... ``` 形式の場合）
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1])

    persona = json.loads(result_text)

    # DB保存（upsert）
    existing = db.execute(
        select(JudgePersona).where(JudgePersona.judge_id == judge_id)
    ).scalar_one_or_none()

    if existing:
        existing.persona_text = json.dumps(persona, ensure_ascii=False)
        existing.generated_at = datetime.now()
        existing.case_count_at_gen = current_count
    else:
        db.add(JudgePersona(
            judge_id=judge_id,
            persona_text=json.dumps(persona, ensure_ascii=False),
            generated_at=datetime.now(),
            case_count_at_gen=current_count,
        ))
    db.commit()

    persona["generated_at"] = datetime.now().isoformat()
    persona["case_count"] = current_count
    persona["is_cached"] = False
    return persona


REVIEW_SYSTEM_TEMPLATE = """あなたは日本の裁判官{judge_name}の観点から法律文書を検討する役割です。
この裁判官の実際の判決データに基づいて分析された傾向プロファイルと判決文サンプルを参考にし、
当該裁判官がこの文書を読んだ場合の観点からフィードバックを提供してください。

## 裁判官プロファイル
{persona_json}

## 代表的な判決文抜粋
{ruling_samples}

## この裁判官が過去の判決で実際に引用した条文および判例
以下は{judge_name}裁判官が過去の判決で直接引用した法条文と判例です。
文書に関連する争点がある場合、この裁判官に馴染みのある以下の条文・判例の活用を勧告してください。
この裁判官が直接引用した根拠を使用すれば、説得力が大幅に高まります。

{judge_citations}

## 検討基準
以下の5つの観点から文書を分析し、具体的なフィードバックを提供してください：

### 1. 論理構造
主張の論理的な流れと構成が明確か、三段論法が堅固かを評価します。

### 2. 法理適用
引用された法理が正確かつ適切か、見落とした重要な法理はないかを検討します。
**特にこの裁判官が過去に直接引用した条文・判例の中で活用可能なものがあれば、積極的に勧告してください。**

### 3. 証拠活用
証拠の提示方法と事実関係の整理が説得力があるかを評価します。

### 4. 説得力
全般的な論証がこの裁判官を説得できるか、弱点はないかを分析します。

### 5. この裁判官の観点から
{judge_name}裁判官が特に重視する法理と論点が十分に扱われているか、
判決傾向を考慮した場合に補完が必要な部分を具体的に提案します。
**この裁判官が過去に引用した判例・条文の中で、本件に有利に援用できるものを具体的に提案してください。**

各項目について、強み、改善点、具体的な修正提案を含めてください。
最後に総合評価と核心的な修正勧告3つを提示してください。
核心的な修正勧告には、可能であればこの裁判官が引用した具体的な判例番号や条文を含めてください。

## 出力形式ルール
- Markdown形式で作成し、可読性を最優先にしてください。
- ## または ### ヘッダーで各セクションを区分してください。
- 本文は通常のテキストで作成してください。太字（**）は核心キーワードや法理名にのみ最小限で使用してください。
- 段落間に空行を入れて視覚的に区分してください。
- 列挙する際はバレット（-）または番号（1.）リストを使用してください。
- 全体を太字にしたり、ひとつの長い段落にしないでください。"""


async def review_document_as_judge(
    db: Session, judge_id: int, document: str
) -> AsyncGenerator[str, None]:
    """裁判官の観点から文書をレビューする（ストリーミング）。"""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("裁判官が見つかりません。")

    # ペルソナ（キャッシュまたは生成）
    persona = await generate_judge_persona(db, judge_id)
    persona_json = json.dumps(
        {k: v for k, v in persona.items() if k not in ("generated_at", "case_count", "is_cached")},
        ensure_ascii=False,
        indent=2,
    )

    # 代表的な判決文抜粋
    samples = _get_judge_case_samples(db, judge_id, limit=5)
    ruling_samples = ""
    for i, s in enumerate(samples, 1):
        if s["case_gist"]:
            ruling_samples += f"\n[判例 {i}] {s['case_number']} - {s['case_name']}\n"
            ruling_samples += f"{s['case_gist'][:600]}\n"

    # 裁判官が実際に引用した条文・判例を収集
    citations = _get_judge_citations(db, judge_id)
    judge_citations = _format_citations(citations)

    system_prompt = REVIEW_SYSTEM_TEMPLATE.format(
        judge_name=judge.name,
        persona_json=persona_json,
        ruling_samples=ruling_samples or "（判決文抜粋なし）",
        judge_citations=judge_citations,
    )

    client = _get_client()
    async with _semaphore:
        async with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"以下の法律文書を検討してください：\n\n{document}",
                }
            ],
        ) as stream:
            async for text in stream.text_stream:
                yield text


REVISE_SYSTEM_TEMPLATE = """あなたは日本の裁判官{judge_name}の判決傾向を熟知した法律文書作成の専門家です。
原本の法律文書と当該裁判官の観点からの検討フィードバックが与えられます。
フィードバックを反映した補完版の法律文書を作成してください。

## 裁判官プロファイル
{persona_json}

## この裁判官が過去の判決で実際に引用した条文および判例
以下は{judge_name}裁判官が直接引用した法的根拠です。
補完文書で関連争点を論証する際、可能な限りこの裁判官に馴染みのある以下の条文・判例を優先的に活用してください。
裁判官が既に知っており直接引用した根拠は、説得力がはるかに高くなります。

{judge_citations}

## 作成規則
1. 原本文書の基本構造と形式を維持してください。
2. フィードバックで指摘された**改善点**と**具体的な修正提案**を反映してください。
3. 追加・修正された部分は【追加】または【修正】の表示をしてください。
4. 削除が必要な部分は【削除：理由】で表示してください。
5. 法理引用時は上記「この裁判官が引用した条文・判例」リストから関連のあるものを優先活用してください。
6. 論理構造をこの裁判官の傾向に合わせて補強してください。
7. 実際に裁判所に提出可能な水準の完成度を目標にしてください。
8. Markdown形式で作成し、段落間の空行で可読性を確保してください。太字は核心キーワードにのみ最小限で使用してください。"""


async def revise_document_as_judge(
    db: Session, judge_id: int, document: str, feedback: str
) -> AsyncGenerator[str, None]:
    """レビューフィードバックを反映した補完文書を生成する（ストリーミング）。"""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("裁判官が見つかりません。")

    persona = await generate_judge_persona(db, judge_id)
    persona_json = json.dumps(
        {k: v for k, v in persona.items() if k not in ("generated_at", "case_count", "is_cached")},
        ensure_ascii=False,
        indent=2,
    )

    # 裁判官が実際に引用した条文・判例を収集
    citations = _get_judge_citations(db, judge_id)
    judge_citations = _format_citations(citations)

    system_prompt = REVISE_SYSTEM_TEMPLATE.format(
        judge_name=judge.name,
        persona_json=persona_json,
        judge_citations=judge_citations,
    )

    user_content = f"""## 原本法律文書
{document}

## AI検討フィードバック
{feedback}

上記フィードバックを反映した補完版の法律文書を作成してください。追加・修正された部分には【追加】または【修正】の表示をしてください。"""

    client = _get_client()
    async with _semaphore:
        async with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
