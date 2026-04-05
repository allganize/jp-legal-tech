import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # lawsuit_id
    case_number: Mapped[str] = mapped_column(String, nullable=False)  # 事件番号 (例: 令和1(あ)1751)
    case_name: Mapped[str | None] = mapped_column(String)  # 事件名
    court_name: Mapped[str | None] = mapped_column(String, index=True)  # 裁判所名
    trial_type: Mapped[str | None] = mapped_column(String, index=True)  # SupremeCourt/HighCourt/LowerCourt/IPCase/AdministrativeCase/LaborCase
    decision_date: Mapped[date | None] = mapped_column(Date, index=True)  # 判決日
    result_type: Mapped[str | None] = mapped_column(String)  # 判決/決定
    result: Mapped[str | None] = mapped_column(String)  # 棄却/破棄差戻/認容 等
    gist: Mapped[str | None] = mapped_column(Text)  # 判示事項
    case_gist: Mapped[str | None] = mapped_column(Text)  # 裁判要旨
    ref_law: Mapped[str | None] = mapped_column(Text)  # 参照条文
    reference_cases: Mapped[str | None] = mapped_column(Text)  # 参照判例 (contentsから抽出)
    full_text: Mapped[str | None] = mapped_column(Text)  # 判決文全文
    article_info: Mapped[str | None] = mapped_column(String)  # 判例集掲載情報
    detail_page_link: Mapped[str | None] = mapped_column(String)  # courts.go.jp URL
    full_pdf_link: Mapped[str | None] = mapped_column(String)  # PDF URL
    original_court_name: Mapped[str | None] = mapped_column(String)  # 原審裁判所
    original_case_number: Mapped[str | None] = mapped_column(String)  # 原審事件番号
    has_judge_info: Mapped[bool] = mapped_column(Boolean, default=False)
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

    case_id: Mapped[str] = mapped_column(String, ForeignKey("cases.id"), primary_key=True)
    judge_id: Mapped[int] = mapped_column(Integer, ForeignKey("judges.id"), primary_key=True)
    role: Mapped[str | None] = mapped_column(String)  # 裁判長, 陪席

    case: Mapped["Case"] = relationship(back_populates="judges")
    judge: Mapped["Judge"] = relationship(back_populates="cases")


class JudgePersona(Base):
    __tablename__ = "judge_personas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    judge_id: Mapped[int] = mapped_column(Integer, ForeignKey("judges.id"), unique=True, index=True)
    persona_text: Mapped[str] = mapped_column(Text, nullable=False)  # JSON文字列
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    case_count_at_gen: Mapped[int] = mapped_column(Integer, default=0)

    judge: Mapped["Judge"] = relationship()


class StrategySession(Base):
    __tablename__ = "strategy_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_type: Mapped[str] = mapped_column(String, nullable=False)  # civil/criminal/administrative
    party_position: Mapped[str] = mapped_column(String, nullable=False)  # plaintiff/defendant
    overview: Mapped[str] = mapped_column(Text, nullable=False)
    judge_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("judges.id"), nullable=True)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    step1_data: Mapped[str | None] = mapped_column(Text)  # JSON
    step2_data: Mapped[str | None] = mapped_column(Text)  # JSON
    step3_data: Mapped[str | None] = mapped_column(Text)  # JSON
    step4_data: Mapped[str | None] = mapped_column(Text)  # JSON
    step5_data: Mapped[str | None] = mapped_column(Text)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    judge: Mapped["Judge | None"] = relationship()
    issues: Mapped[list["StrategyIssue"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    items: Mapped[list["StrategyItem"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    briefs: Mapped[list["StrategyBrief"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    review_items: Mapped[list["StrategyReviewItem"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class StrategyIssue(Base):
    __tablename__ = "strategy_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("strategy_sessions.id"), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    frequency: Mapped[int] = mapped_column(Integer, default=0)
    win_rate: Mapped[float] = mapped_column(Float, default=0.0)
    lose_rate: Mapped[float] = mapped_column(Float, default=0.0)
    other_rate: Mapped[float] = mapped_column(Float, default=0.0)
    selected: Mapped[bool] = mapped_column(Boolean, default=True)

    session: Mapped["StrategySession"] = relationship(back_populates="issues")


class StrategyItem(Base):
    __tablename__ = "strategy_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("strategy_sessions.id"), nullable=False)
    side: Mapped[str] = mapped_column(String, nullable=False)  # attack/defense
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    strength_pct: Mapped[int] = mapped_column(Integer, default=0)
    score_pct: Mapped[int] = mapped_column(Integer, default=0)
    precedent_count: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["StrategySession"] = relationship(back_populates="items")


class StrategyBrief(Base):
    __tablename__ = "strategy_briefs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("strategy_sessions.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending/generating/completed/error
    document_type: Mapped[str] = mapped_column(String, default="準備書面")
    full_content: Mapped[str | None] = mapped_column(Text)
    court_name: Mapped[str | None] = mapped_column(String)
    party_side: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    session: Mapped["StrategySession"] = relationship(back_populates="briefs")
    sections: Mapped[list["StrategyBriefSection"]] = relationship(back_populates="brief", cascade="all, delete-orphan")


class StrategyBriefSection(Base):
    __tablename__ = "strategy_brief_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brief_id: Mapped[int] = mapped_column(Integer, ForeignKey("strategy_briefs.id"), nullable=False)
    section_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="pending")

    brief: Mapped["StrategyBrief"] = relationship(back_populates="sections")


class StrategyReviewItem(Base):
    __tablename__ = "strategy_review_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("strategy_sessions.id"), nullable=False)
    side: Mapped[str] = mapped_column(String, nullable=False)  # counterargument/response
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    strength: Mapped[str | None] = mapped_column(String)  # strong/medium/weak
    effectiveness: Mapped[str | None] = mapped_column(String)  # high/medium/low
    precedent_ref: Mapped[str | None] = mapped_column(String)
    citation_rate: Mapped[str | None] = mapped_column(String)
    pair_index: Mapped[int | None] = mapped_column(Integer)

    session: Mapped["StrategySession"] = relationship(back_populates="review_items")
