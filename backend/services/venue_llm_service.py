import json
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from backend.services.llm_service import _get_client, _semaphore
from backend.services.venue_service import compare_courts
from backend.config import settings

VENUE_SYSTEM_PROMPT = """당신은 대한민국 소송 전략 전문 변호사입니다.
의뢰인의 사건 유형과 후보 법원별 과거 판결 통계를 기반으로, 최적의 관할 법원을 추천합니다.

## 분석 기준

### 1. 통계적 유리성
- 각 법원의 인용률(원고 승소율)과 기각률을 비교합니다.
- 사건유형별 판결 경향의 차이를 분석합니다.

### 2. 통계적 신뢰도
- 샘플 크기(총 판결 수)를 반드시 고려합니다.
- 30건 미만인 경우 통계적 신뢰도가 낮음을 명시하세요.
- 건수가 적은 법원의 높은 인용률보다, 건수가 많은 법원의 안정적인 인용률이 더 신뢰할 수 있습니다.

### 3. 재판부 구성
- 해당 법원의 주요 판사 성향을 분석합니다.
- 특히 인용률이 높은 판사가 활발히 활동 중인지 확인합니다.

### 4. 종합 추천
- 최종 추천 법원과 그 근거를 명확히 제시합니다.
- 차선책도 함께 언급하고, 각 법원의 리스크를 설명합니다.

## 출력 형식
- Markdown 형식으로 작성하세요.
- 각 법원별 분석 → 비교 요약 → 최종 추천 순서로 작성합니다.
- 핵심 수치(인용률, 건수)는 볼드로 강조하세요.
- 추천 결과는 확정적 판단이 아닌 통계적 참고 자료임을 명시하세요."""


async def recommend_venue(
    db: Session,
    case_type: str,
    court_names: list[str] | None = None,
    case_description: str | None = None,
) -> AsyncGenerator[str, None]:
    """AI가 최적 관할 법원을 추천한다 (스트리밍)."""
    # 비교 대상 법원이 없으면 해당 사건유형의 상위 법원을 자동 선택
    if not court_names:
        from backend.services.venue_service import list_courts
        courts = list_courts(db, case_type)
        court_names = [c["court_name"] for c in courts[:5]]

    if len(court_names) < 2:
        yield "비교할 법원이 2개 이상 필요합니다."
        return

    comparison = compare_courts(db, court_names, case_type)

    user_content = f"""## 분석 요청

**사건 유형**: {case_type}
**비교 대상 법원**: {', '.join(court_names)}

## 법원별 통계 데이터

"""
    for court in comparison["courts"]:
        user_content += f"""### {court['court_name']}
- 총 판결 수: {court['total_cases']}건
- 인용률: {court['acceptance_rate']}%
- 기각률: {court['dismissal_rate']}%
- 판결 기간: {court['date_range']['min']} ~ {court['date_range']['max']}
- 판결유형 분포: {json.dumps(court['decision_type_distribution'], ensure_ascii=False)}
- 주요 판사:
"""
        for j in court["top_judges"][:5]:
            user_content += f"  - {j['name']} ({j['case_count']}건, 인용률 {j['acceptance_rate']}%)\n"
        user_content += "\n"

    if case_description:
        user_content += f"""## 사건 개요
{case_description}

위 사건 개요를 고려하여 가장 유리한 관할 법원을 추천해 주세요.
"""

    try:
        client = _get_client()
        async with _semaphore:
            async with client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=4000,
                system=VENUE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
    except Exception as e:
        yield f"\n\n---\n⚠️ AI 분석 중 오류가 발생했습니다: {e}"
