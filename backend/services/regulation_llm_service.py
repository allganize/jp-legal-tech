"""규제 에이전트 — LLM 문서 생성 서비스."""

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Client, GeneratedDocument, RegulationItem
from backend.services.llm_service import _get_client

_semaphore = asyncio.Semaphore(3)

# ── 프롬프트 ──────────────────────────────────────────────────

RESEARCH_MEMO_PROMPT = """당신은 대한민국 법률 전문가이자 중소형 로펌의 시니어 변호사입니다.
제공된 규제 정보와 클라이언트 정보를 바탕으로 리서치 메모를 작성하세요.

## 리서치 메모 형식

### 1. 규제 개요
- 규제명, 소관부처, 시행 예정일
- 규제의 배경과 목적

### 2. 주요 내용 분석
- 핵심 조항별 상세 분석
- 기존 법령과의 관계 (상충·보완 관계)

### 3. 클라이언트 사업 영향
- 해당 클라이언트의 사업에 미치는 구체적 영향
- 영향받는 서비스/라이선스 별 분석
- 리스크 수준 평가 (높음/중간/낮음)

### 4. 대응 권고사항
- 단기 조치 (즉시~1개월)
- 중기 조치 (1~3개월)
- 장기 전략 (3개월 이상)

### 5. 참고 법령 및 판례
- 관련 법령 조문
- 유사 규제 선례

전문적이고 정확한 법률 문서 톤으로 한국어로 작성하세요."""

ADVISORY_LETTER_PROMPT = """당신은 대한민국 법률 전문가이자 중소형 로펌의 시니어 변호사입니다.
클라이언트에게 규제 변화를 안내하는 레터를 작성하세요.

## 클라이언트 안내 레터 형식

[로펌명: 법무법인 한빛]
[날짜]

[클라이언트 회사명] 귀중

제목: [규제명] 관련 안내

안녕하세요, 법무법인 한빛 [담당변호사]입니다.

### 1. 규제 변화 요약
- 무엇이 바뀌는지 비전문가도 이해할 수 있게 2-3문장으로 설명

### 2. 귀사 영향 분석
- 귀사의 사업(서비스/라이선스)에 미치는 구체적 영향
- 조치가 필요한 이유

### 3. 권장 조치 사항
- 즉시 필요한 조치
- 준비해야 할 사항 (일정 포함)

### 4. 향후 일정
- 시행 예정일, 유예기간, 과태료 등 핵심 일정

문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.
법무법인 한빛 [담당변호사] 드림

격식 있는 비즈니스 레터 톤으로 한국어로 작성하세요."""

NEWSLETTER_PROMPT = """당신은 대한민국 법률 전문가이자 중소형 로펌의 시니어 변호사입니다.
로펌의 뉴스레터에 실을 규제 동향 기사를 작성하세요.

## 뉴스레터 형식

### [헤드라인 — 눈길을 끄는 제목]

**핵심 요약** (2-3줄, 비전문가도 이해 가능하게)

### 무엇이 바뀌나요?
- 규제 변화의 핵심 내용을 일반인 눈높이로 설명
- 전문 용어 최소화, 필요 시 괄호 안에 설명 병기

### 누가 영향을 받나요?
- 영향받는 업종·서비스 유형
- 영향의 정도와 범위

### 주목할 포인트
- 실무적으로 중요한 2-3가지 포인트
- 놓치기 쉬운 세부사항

### 앞으로 지켜볼 것
- 향후 입법/시행 일정
- 추가 가이드라인 예고 여부

---
*본 뉴스레터는 법무법인 한빛에서 발행합니다. 법률자문이 필요하신 경우 담당 변호사에게 연락 바랍니다.*

전문적이면서도 읽기 쉬운 톤으로 한국어로 작성하세요."""


async def generate_regulation_document(
    db: Session,
    regulation_id: int,
    client_id: int | None,
    doc_type: str,
    force: bool = False,
) -> AsyncGenerator[str, None]:
    """규제 관련 문서를 생성한다 (스트리밍)."""
    reg = db.get(RegulationItem, regulation_id)
    if not reg:
        raise ValueError("규제 항목을 찾을 수 없습니다.")

    client = None
    if client_id:
        client = db.get(Client, client_id)
        if not client:
            raise ValueError("클라이언트를 찾을 수 없습니다.")

    # 캐시 확인
    if not force:
        cached = db.execute(
            select(GeneratedDocument).where(
                GeneratedDocument.regulation_id == regulation_id,
                GeneratedDocument.client_id == client_id,
                GeneratedDocument.doc_type == doc_type,
            )
        ).scalar_one_or_none()
        if cached:
            yield cached.content
            return

    # 프롬프트 선택
    prompts = {
        "research_memo": RESEARCH_MEMO_PROMPT,
        "advisory_letter": ADVISORY_LETTER_PROMPT,
        "newsletter": NEWSLETTER_PROMPT,
    }
    system_prompt = prompts.get(doc_type)
    if not system_prompt:
        raise ValueError(f"지원하지 않는 문서 유형: {doc_type}")

    # 사용자 메시지 구성
    user_content = f"""## 규제 정보
- 규제명: {reg.title}
- 소관부처: {reg.source}
- 카테고리: {reg.category}
- 유형: {reg.reg_type}
- 영향도: {reg.impact_level}
- 공포일: {reg.published_date}
- 시행예정일: {reg.effective_date or '미정'}
- 라이프사이클: {reg.lifecycle_stage}

### 요약
{reg.summary}

### 상세 내용
{reg.detail_text or '(상세 내용 없음)'}
"""

    if client:
        licenses = json.loads(client.licenses) if client.licenses else []
        services = json.loads(client.services) if client.services else []
        user_content += f"""
## 클라이언트 정보
- 회사명: {client.company_name}
- 업종: {client.industry}
- 보유 라이선스: {', '.join(licenses) if licenses else '없음'}
- 주요 서비스: {', '.join(services) if services else '없음'}
- 담당 변호사: {client.assigned_lawyer}
"""

    # LLM 스트리밍
    anthropic_client = _get_client()
    full_content = ""

    async with _semaphore:
        async with anthropic_client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            async for text in stream.text_stream:
                full_content += text
                yield text

    # 캐시 저장
    existing = db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.regulation_id == regulation_id,
            GeneratedDocument.client_id == client_id,
            GeneratedDocument.doc_type == doc_type,
        )
    ).scalar_one_or_none()

    if existing:
        existing.content = full_content
        existing.generated_at = datetime.now()
    else:
        db.add(GeneratedDocument(
            regulation_id=regulation_id,
            client_id=client_id,
            doc_type=doc_type,
            content=full_content,
        ))
    db.commit()
