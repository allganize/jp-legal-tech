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
        raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def _get_judge_case_samples(db: Session, judge_id: int, limit: int = 20) -> list[dict]:
    """판사의 판례 샘플을 가져온다 (ruling_gist가 있는 것 우선)."""
    results = db.execute(
        select(
            Case.case_number,
            Case.case_name,
            Case.case_type_name,
            Case.decision_date,
            Case.decision_type,
            Case.summary,
            Case.ruling_gist,
            Case.reference_articles,
            CaseJudge.role,
        )
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
        .order_by(
            # ruling_gist가 있는 것을 우선
            Case.ruling_gist.is_(None).asc(),
            Case.decision_date.desc(),
        )
        .limit(limit)
    ).all()

    return [
        {
            "case_number": r.case_number,
            "case_name": r.case_name,
            "case_type": r.case_type_name,
            "decision_date": r.decision_date.isoformat() if r.decision_date else None,
            "decision_type": r.decision_type,
            "summary": r.summary,
            "ruling_gist": r.ruling_gist,
            "reference_articles": r.reference_articles,
            "role": r.role,
        }
        for r in results
    ]


def _get_judge_citations(db: Session, judge_id: int) -> dict:
    """판사가 실제로 인용한 참조조문과 참조판례를 수집·정리한다."""
    results = db.execute(
        select(Case.reference_articles, Case.reference_cases)
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(
            CaseJudge.judge_id == judge_id,
            (Case.reference_articles.isnot(None)) | (Case.reference_cases.isnot(None)),
        )
    ).all()

    # 빈도 집계
    import re
    from collections import Counter

    article_counter: Counter[str] = Counter()
    case_counter: Counter[str] = Counter()

    for row in results:
        if row.reference_articles:
            # HTML 태그 제거 후 조문 분리
            clean = re.sub(r"<[^>]+>", " ", row.reference_articles)
            # [번호] 구분자 또는 / 또는 , 로 분리
            parts = re.split(r"\[?\d+\]|/|,", clean)
            for part in parts:
                part = part.strip()
                if len(part) > 3:
                    article_counter[part] += 1

        if row.reference_cases:
            clean = re.sub(r"<[^>]+>", " ", row.reference_cases)
            # 대법원 YYYY. MM. DD. 선고 XXXX다XXXX 판결 패턴 추출
            case_refs = re.findall(
                r"대법원\s+\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:선고|자)\s+\d{2,4}[가-힣]+\d+\s*(?:전원합의체\s+)?(?:판결|결정)",
                clean,
            )
            for ref in case_refs:
                ref = re.sub(r"\s+", " ", ref.strip())
                case_counter[ref] += 1

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
    """인용 데이터를 프롬프트에 삽입할 텍스트로 포맷한다."""
    lines = []
    if citations["articles"]:
        lines.append("### 이 판사가 실제로 인용한 조문 (빈도순)")
        for item in citations["articles"]:
            lines.append(f"- {item['article']} ({item['count']}회)")
    if citations["cases"]:
        lines.append("\n### 이 판사가 실제로 인용한 판례 (빈도순)")
        for item in citations["cases"]:
            lines.append(f"- {item['case']} ({item['count']}회)")
    return "\n".join(lines) if lines else "(인용 데이터 없음)"


def _get_case_count(db: Session, judge_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(CaseJudge).where(CaseJudge.judge_id == judge_id)
    ).scalar() or 0


PERSONA_SYSTEM_PROMPT = """당신은 대한민국 법률 전문가입니다. 제공된 판사의 판결 통계와 판결문 샘플을 분석하여 해당 판사의 성향 프로필을 작성하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{
  "tendency_summary": "판결 성향 요약. 이 판사의 전반적인 판결 철학, 경향, 특징을 3-5문장으로 서술",
  "key_legal_principles": ["이 판사가 판결에서 자주 다루거나 중시하는 법리 원칙 3-7개"],
  "frequently_cited": {
    "articles": ["판결에서 자주 인용되는 법 조문 (있는 경우)"],
    "cases": ["자주 참조하는 판례 (있는 경우)"]
  },
  "writing_style": "판결문 작성 스타일의 특징. 논리 전개 방식, 표현의 엄밀성, 판시 구조 등을 2-3문장으로 서술",
  "document_tips": "이 판사에게 제출할 법률 문서(소장, 준비서면 등) 작성 시 유의사항. 어떤 논리 구조, 증거 제시 방식, 법리 인용이 효과적일지 3-5개 항목으로 서술"
}"""


async def generate_judge_persona(db: Session, judge_id: int, force: bool = False) -> dict:
    """판사 페르소나를 생성하거나 캐시에서 반환한다."""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("판사를 찾을 수 없습니다.")

    current_count = _get_case_count(db, judge_id)
    if current_count < 3:
        raise ValueError(f"분석할 판례 데이터가 부족합니다. (현재 {current_count}건, 최소 3건 필요)")

    # 캐시 확인
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

    # 통계 + 판례 샘플 수집
    profile = get_judge_profile(db, judge_id)
    samples = _get_judge_case_samples(db, judge_id, limit=20)

    user_content = f"""## 판사 정보
- 이름: {judge.name}
- 소속: {judge.court_name or '미상'}
- 대법관 여부: {'예' if judge.is_supreme_court else '아니오'}
- 활동 기간: {judge.first_seen_date} ~ {judge.last_seen_date}
- 총 판결 수: {current_count}건

## 통계
- 사건종류 분포: {json.dumps(profile['case_type_distribution'], ensure_ascii=False)}
- 판결유형 분포: {json.dumps(profile['decision_type_distribution'], ensure_ascii=False)}
- 역할 분포: {json.dumps(profile['role_distribution'], ensure_ascii=False)}

## 판결문 샘플 ({len(samples)}건)
"""
    for i, s in enumerate(samples, 1):
        user_content += f"\n### 판례 {i}: {s['case_number']} ({s['case_type'] or '미분류'})\n"
        user_content += f"- 사건명: {s['case_name']}\n"
        user_content += f"- 선고일: {s['decision_date']}\n"
        user_content += f"- 판결유형: {s['decision_type']}\n"
        user_content += f"- 역할: {s['role']}\n"
        if s['summary']:
            user_content += f"- 판시사항: {s['summary'][:500]}\n"
        if s['ruling_gist']:
            user_content += f"- 판결요지: {s['ruling_gist'][:800]}\n"
        if s['reference_articles']:
            user_content += f"- 참조조문: {s['reference_articles'][:300]}\n"

    client = _get_client()
    async with _semaphore:
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=2000,
            system=PERSONA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

    result_text = response.content[0].text.strip()
    # JSON 블록 추출 (```json ... ``` 형태일 수 있음)
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1])

    persona = json.loads(result_text)

    # DB 저장 (upsert)
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


REVIEW_SYSTEM_TEMPLATE = """당신은 대한민국 법관 {judge_name}의 관점에서 법률 문서를 검토하는 역할입니다.
이 판사의 실제 판결 데이터를 기반으로 분석된 성향 프로필과 판결문 샘플을 참고하여,
해당 판사가 이 문서를 읽었을 때의 관점에서 피드백을 제공하세요.

## 판사 프로필
{persona_json}

## 대표 판결문 발췌
{ruling_samples}

## 이 판사가 과거 판결에서 실제로 인용한 조문 및 판례
아래는 {judge_name} 판사가 과거 판결에서 직접 인용한 법 조문과 판례입니다.
문서에서 관련 쟁점이 있다면, 이 판사에게 익숙한 아래 조문/판례를 활용하도록 권고하세요.
이 판사가 직접 인용한 근거를 사용하면 설득력이 크게 높아집니다.

{judge_citations}

## 검토 기준
다음 5가지 관점에서 문서를 분석하고 구체적인 피드백을 제공하세요:

### 1. 논리 구조
주장의 논리적 흐름과 구성이 명확한지, 삼단논법이 견고한지 평가합니다.

### 2. 법리 적용
인용된 법리가 정확하고 적절한지, 빠뜨린 중요 법리는 없는지 검토합니다.
**특히 이 판사가 과거에 직접 인용한 조문/판례 중 활용 가능한 것이 있다면 적극 권고하세요.**

### 3. 증거 활용
증거 제시 방식과 사실관계 정리가 설득력 있는지 평가합니다.

### 4. 설득력
전반적인 논증이 이 판사를 설득할 수 있는지, 약점은 없는지 분석합니다.

### 5. 이 판사의 관점에서
{judge_name} 판사가 특히 중시하는 법리와 논점이 충분히 다뤄졌는지,
판결 성향을 고려했을 때 보완이 필요한 부분을 구체적으로 제안합니다.
**이 판사가 과거 인용한 판례/조문 중 본 사건에 유리하게 원용할 수 있는 것을 구체적으로 제안하세요.**

각 항목에 대해 강점, 개선점, 구체적 수정 제안을 포함하세요.
마지막에 종합 평가와 핵심 수정 권고 3가지를 제시하세요.
핵심 수정 권고에는 가능하면 이 판사가 인용한 구체적 판례번호나 조문을 포함하세요.

## 출력 형식 규칙
- Markdown 형식으로 작성하되, 가독성을 최우선으로 하세요.
- ## 또는 ### 헤더로 각 섹션을 구분하세요.
- 본문은 일반 텍스트로 작성하세요. 볼드(**) 처리는 핵심 키워드나 법리명에만 최소한으로 사용하세요.
- 문단 사이에 빈 줄을 넣어 시각적으로 구분하세요.
- 나열할 때는 불릿(-) 또는 번호(1.) 리스트를 사용하세요.
- 전체를 볼드 처리하거나 하나의 긴 문단으로 작성하지 마세요."""


async def review_document_as_judge(
    db: Session, judge_id: int, document: str
) -> AsyncGenerator[str, None]:
    """판사 관점에서 문서를 리뷰한다 (스트리밍)."""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("판사를 찾을 수 없습니다.")

    # 페르소나 (캐시 또는 생성)
    persona = await generate_judge_persona(db, judge_id)
    persona_json = json.dumps(
        {k: v for k, v in persona.items() if k not in ("generated_at", "case_count", "is_cached")},
        ensure_ascii=False,
        indent=2,
    )

    # 대표 판결문 발췌
    samples = _get_judge_case_samples(db, judge_id, limit=5)
    ruling_samples = ""
    for i, s in enumerate(samples, 1):
        if s["ruling_gist"]:
            ruling_samples += f"\n[판례 {i}] {s['case_number']} - {s['case_name']}\n"
            ruling_samples += f"{s['ruling_gist'][:600]}\n"

    # 판사가 실제로 인용한 조문/판례 수집
    citations = _get_judge_citations(db, judge_id)
    judge_citations = _format_citations(citations)

    system_prompt = REVIEW_SYSTEM_TEMPLATE.format(
        judge_name=judge.name,
        persona_json=persona_json,
        ruling_samples=ruling_samples or "(판결문 발췌 없음)",
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
                    "content": f"다음 법률 문서를 검토해 주세요:\n\n{document}",
                }
            ],
        ) as stream:
            async for text in stream.text_stream:
                yield text


REVISE_SYSTEM_TEMPLATE = """당신은 대한민국 법관 {judge_name}의 판결 성향을 잘 아는 법률 문서 작성 전문가입니다.
원본 법률 문서와 해당 판사 관점에서의 검토 피드백이 주어집니다.
피드백을 반영하여 보완된 버전의 법률 문서를 작성하세요.

## 판사 프로필
{persona_json}

## 이 판사가 과거 판결에서 실제로 인용한 조문 및 판례
아래는 {judge_name} 판사가 직접 인용한 법적 근거입니다.
보완 문서에서 관련 쟁점을 논증할 때, 가능한 한 이 판사에게 익숙한 아래 조문/판례를 우선 활용하세요.
판사가 이미 알고 있고 직접 인용한 근거는 설득력이 훨씬 높습니다.

{judge_citations}

## 작성 규칙
1. 원본 문서의 기본 구조와 형식을 유지하세요.
2. 피드백에서 지적된 **개선점**과 **구체적 수정 제안**을 반영하세요.
3. 추가/수정된 부분은 【추가】 또는 【수정】 표시를 해주세요.
4. 삭제가 필요한 부분은 【삭제: 사유】로 표시하세요.
5. 법리 인용 시 위 '이 판사가 인용한 조문/판례' 목록에서 관련 있는 것을 우선 활용하세요.
6. 논리 구조를 이 판사의 성향에 맞게 보강하세요.
7. 실제 법원에 제출 가능한 수준의 완성도를 목표로 하세요.
8. Markdown 형식으로 작성하되, 문단 사이 빈 줄로 가독성을 확보하세요. 볼드는 핵심 키워드에만 최소한으로 사용하세요."""


async def revise_document_as_judge(
    db: Session, judge_id: int, document: str, feedback: str
) -> AsyncGenerator[str, None]:
    """리뷰 피드백을 반영하여 보완된 문서를 생성한다 (스트리밍)."""
    judge = db.get(Judge, judge_id)
    if not judge:
        raise ValueError("판사를 찾을 수 없습니다.")

    persona = await generate_judge_persona(db, judge_id)
    persona_json = json.dumps(
        {k: v for k, v in persona.items() if k not in ("generated_at", "case_count", "is_cached")},
        ensure_ascii=False,
        indent=2,
    )

    # 판사가 실제로 인용한 조문/판례 수집
    citations = _get_judge_citations(db, judge_id)
    judge_citations = _format_citations(citations)

    system_prompt = REVISE_SYSTEM_TEMPLATE.format(
        judge_name=judge.name,
        persona_json=persona_json,
        judge_citations=judge_citations,
    )

    user_content = f"""## 원본 법률 문서
{document}

## AI 검토 피드백
{feedback}

위 피드백을 반영하여 보완된 법률 문서를 작성해 주세요. 추가/수정된 부분에는 【추가】 또는 【수정】 표시를 해주세요."""

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
