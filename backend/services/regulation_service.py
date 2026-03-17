"""규제 에이전트 — DB 조회 서비스."""

import json
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Client, ClientImpact, RegulationItem


def get_regulation_feed(
    db: Session,
    category: str | None = None,
    reg_type: str | None = None,
    impact_level: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = select(RegulationItem)
    count_query = select(func.count()).select_from(RegulationItem)

    if category:
        query = query.where(RegulationItem.category == category)
        count_query = count_query.where(RegulationItem.category == category)
    if reg_type:
        query = query.where(RegulationItem.reg_type == reg_type)
        count_query = count_query.where(RegulationItem.reg_type == reg_type)
    if impact_level:
        query = query.where(RegulationItem.impact_level == impact_level)
        count_query = count_query.where(RegulationItem.impact_level == impact_level)

    total = db.execute(count_query).scalar() or 0
    items = db.execute(
        query.order_by(RegulationItem.published_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [_reg_to_dict(r) for r in items],
    }


def get_regulation_detail(db: Session, regulation_id: int) -> dict | None:
    reg = db.get(RegulationItem, regulation_id)
    if not reg:
        return None
    d = _reg_to_dict(reg)
    d["detail_text"] = reg.detail_text
    return d


def get_regulation_impacts(db: Session, regulation_id: int) -> list[dict]:
    results = db.execute(
        select(ClientImpact, Client)
        .join(Client, ClientImpact.client_id == Client.id)
        .where(ClientImpact.regulation_id == regulation_id)
        .order_by(ClientImpact.impact_score.desc())
    ).all()

    return [
        {
            "client_id": impact.client_id,
            "company_name": client.company_name,
            "industry": client.industry,
            "licenses": json.loads(client.licenses) if client.licenses else [],
            "services": json.loads(client.services) if client.services else [],
            "assigned_lawyer": client.assigned_lawyer,
            "impact_score": impact.impact_score,
            "impact_reasons": json.loads(impact.impact_reasons),
            "action_type": impact.action_type,
        }
        for impact, client in results
    ]


def get_clients(db: Session) -> list[dict]:
    clients = db.execute(
        select(Client).order_by(Client.company_name)
    ).scalars().all()

    result = []
    for c in clients:
        impact_count = db.execute(
            select(func.count()).select_from(ClientImpact).where(ClientImpact.client_id == c.id)
        ).scalar() or 0
        urgent_count = db.execute(
            select(func.count()).select_from(ClientImpact)
            .where(ClientImpact.client_id == c.id, ClientImpact.action_type == "긴급 대응")
        ).scalar() or 0

        result.append({
            "id": c.id,
            "company_name": c.company_name,
            "industry": c.industry,
            "licenses": json.loads(c.licenses) if c.licenses else [],
            "services": json.loads(c.services) if c.services else [],
            "assigned_lawyer": c.assigned_lawyer,
            "impact_count": impact_count,
            "urgent_count": urgent_count,
        })
    return result


def get_weekly_briefing(db: Session) -> dict:
    """주간 브리핑 데이터를 생성한다."""
    # 최근 규제 기준 1주일
    today = date.today()
    week_ago = today - timedelta(days=7)

    # 카테고리별 건수
    all_regs = db.execute(select(RegulationItem)).scalars().all()
    category_counts: dict[str, int] = {}
    recent_regs: list[dict] = []
    for r in all_regs:
        cat = r.category
        category_counts[cat] = category_counts.get(cat, 0) + 1
        if r.published_date >= week_ago:
            recent_regs.append(_reg_to_dict(r))

    # 변호사별 액션 아이템
    lawyer_actions: dict[str, list[dict]] = {}
    impacts = db.execute(
        select(ClientImpact, Client, RegulationItem)
        .join(Client, ClientImpact.client_id == Client.id)
        .join(RegulationItem, ClientImpact.regulation_id == RegulationItem.id)
        .where(ClientImpact.action_type.in_(["긴급 대응", "통지 필요"]))
        .order_by(ClientImpact.impact_score.desc())
    ).all()

    for impact, client, reg in impacts:
        lawyer = client.assigned_lawyer
        if lawyer not in lawyer_actions:
            lawyer_actions[lawyer] = []
        lawyer_actions[lawyer].append({
            "client": client.company_name,
            "regulation": reg.title,
            "action_type": impact.action_type,
            "impact_score": impact.impact_score,
            "category": reg.category,
        })

    # 히트맵 데이터: 클라이언트 × 카테고리
    clients = db.execute(select(Client).order_by(Client.company_name)).scalars().all()
    categories = ["AI규제", "데이터보호", "금융규제", "전자금융"]
    heatmap: list[dict] = []
    for c in clients:
        row = {"client": c.company_name, "lawyer": c.assigned_lawyer}
        for cat in categories:
            # 해당 클라이언트가 해당 카테고리 규제에 대해 받은 최대 impact score
            max_score = db.execute(
                select(func.max(ClientImpact.impact_score))
                .join(RegulationItem, ClientImpact.regulation_id == RegulationItem.id)
                .where(
                    ClientImpact.client_id == c.id,
                    RegulationItem.category == cat,
                )
            ).scalar() or 0
            row[cat] = max_score
        heatmap.append(row)

    return {
        "category_counts": category_counts,
        "recent_regulations": recent_regs,
        "lawyer_actions": lawyer_actions,
        "heatmap": heatmap,
        "categories": categories,
    }


def _reg_to_dict(r: RegulationItem) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "source": r.source,
        "category": r.category,
        "reg_type": r.reg_type,
        "impact_level": r.impact_level,
        "summary": r.summary,
        "published_date": r.published_date.isoformat() if r.published_date else None,
        "effective_date": r.effective_date.isoformat() if r.effective_date else None,
        "lifecycle_stage": r.lifecycle_stage,
    }
