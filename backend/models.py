from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
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
