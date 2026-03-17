from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # 판례일련번호
    case_number: Mapped[str] = mapped_column(String, nullable=False)  # 사건번호
    case_name: Mapped[str | None] = mapped_column(String)  # 사건명
    court_name: Mapped[str | None] = mapped_column(String, index=True)  # 법원명
    case_type_code: Mapped[str | None] = mapped_column(String)  # 사건종류코드
    case_type_name: Mapped[str | None] = mapped_column(String, index=True)  # 사건종류명
    decision_date: Mapped[date | None] = mapped_column(Date, index=True)  # 선고일자
    decision_type: Mapped[str | None] = mapped_column(String)  # 판결유형
    pronouncement: Mapped[str | None] = mapped_column(String)  # 선고
    court_type_code: Mapped[str | None] = mapped_column(String)  # 법원종류코드
    data_source: Mapped[str | None] = mapped_column(String)  # 데이터출처명
    summary: Mapped[str | None] = mapped_column(Text)  # 판시사항
    ruling_gist: Mapped[str | None] = mapped_column(Text)  # 판결요지
    reference_articles: Mapped[str | None] = mapped_column(Text)  # 참조조문
    reference_cases: Mapped[str | None] = mapped_column(Text)  # 참조판례
    full_text: Mapped[str | None] = mapped_column(Text)  # 판례내용
    has_judge_info: Mapped[bool] = mapped_column(Boolean, default=False)
    detail_fetched: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    judges: Mapped[list["CaseJudge"]] = relationship(back_populates="case")


class Judge(Base):
    __tablename__ = "judges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    court_name: Mapped[str | None] = mapped_column(String)
    first_seen_date: Mapped[date | None] = mapped_column(Date)
    last_seen_date: Mapped[date | None] = mapped_column(Date)
    is_supreme_court: Mapped[bool] = mapped_column(Boolean, default=False)

    cases: Mapped[list["CaseJudge"]] = relationship(back_populates="judge")

    __table_args__ = (
        UniqueConstraint("name", "court_name", "first_seen_date", name="uq_judge_identity"),
    )


class CaseJudge(Base):
    __tablename__ = "case_judges"

    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"), primary_key=True)
    judge_id: Mapped[int] = mapped_column(Integer, ForeignKey("judges.id"), primary_key=True)
    role: Mapped[str | None] = mapped_column(String)  # 재판장, 주심, 배석

    case: Mapped["Case"] = relationship(back_populates="judges")
    judge: Mapped["Judge"] = relationship(back_populates="cases")


class JudgePersona(Base):
    __tablename__ = "judge_personas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    judge_id: Mapped[int] = mapped_column(Integer, ForeignKey("judges.id"), unique=True, index=True)
    persona_text: Mapped[str] = mapped_column(Text, nullable=False)  # JSON 문자열
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    case_count_at_gen: Mapped[int] = mapped_column(Integer, default=0)

    judge: Mapped["Judge"] = relationship()


class CollectionProgress(Base):
    __tablename__ = "collection_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phase: Mapped[str] = mapped_column(String, nullable=False)  # search, detail, parse
    query: Mapped[str] = mapped_column(String, nullable=False)
    page: Mapped[int] = mapped_column(Integer, default=0)
    total_pages: Mapped[int | None] = mapped_column(Integer)
    total_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending/in_progress/completed
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


# ── 규제 에이전트 모델 ──────────────────────────────────────────


class RegulationItem(Base):
    __tablename__ = "regulation_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String)  # 과학기술정보통신부, 금융위원회 등
    category: Mapped[str] = mapped_column(String, index=True)  # AI규제, 데이터보호, 금융규제, 전자금융
    reg_type: Mapped[str] = mapped_column(String)  # 입법예고, 가이드라인, 제재사례, 시행령
    impact_level: Mapped[str] = mapped_column(String)  # 높음, 중간, 낮음
    summary: Mapped[str] = mapped_column(Text)
    detail_text: Mapped[str | None] = mapped_column(Text)
    published_date: Mapped[date] = mapped_column(Date)
    effective_date: Mapped[date | None] = mapped_column(Date)
    lifecycle_stage: Mapped[str] = mapped_column(String)  # 입법예고, 시행령공포, 시행, 폐지
    reference_url: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    impacts: Mapped[list["ClientImpact"]] = relationship(back_populates="regulation")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String)  # 핀테크, AI/SaaS, 마이데이터, 가상자산, 데이터
    licenses: Mapped[str | None] = mapped_column(Text)  # JSON array
    services: Mapped[str | None] = mapped_column(Text)  # JSON array
    assigned_lawyer: Mapped[str] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    impacts: Mapped[list["ClientImpact"]] = relationship(back_populates="client")


class ClientImpact(Base):
    __tablename__ = "client_impacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    regulation_id: Mapped[int] = mapped_column(Integer, ForeignKey("regulation_items.id"), index=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), index=True)
    impact_score: Mapped[int] = mapped_column(Integer)  # 0-100
    impact_reasons: Mapped[str] = mapped_column(Text)  # JSON array of reason strings
    action_type: Mapped[str] = mapped_column(String)  # 검토 필요, 통지 필요, 긴급 대응
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    regulation: Mapped["RegulationItem"] = relationship(back_populates="impacts")
    client: Mapped["Client"] = relationship(back_populates="impacts")

    __table_args__ = (
        UniqueConstraint("regulation_id", "client_id", name="uq_regulation_client"),
    )


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    regulation_id: Mapped[int] = mapped_column(Integer, ForeignKey("regulation_items.id"))
    client_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("clients.id"))
    doc_type: Mapped[str] = mapped_column(String)  # research_memo, advisory_letter, newsletter
    content: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
