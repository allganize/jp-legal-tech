"""判決結果の分類ユーティリティ。

日本のデータは既にresultフィールドを持っているため、
複雑なテキスト解析は不要。resultの値を有利/不利に分類する。

分類:
  認容      — 原告請求認容
  一部認容  — 請求の一部のみ認容
  破棄差戻  — 上級審が原審を破棄し差し戻し
  破棄自判  — 上級審が原審を破棄し自ら判決
  取消      — 行政処分の取消
  変更      — 原判決の変更
  棄却      — 請求棄却
  却下      — 訴え却下
  上告棄却  — 上告を棄却（原審維持）
  上告不受理 — 上告を受理しない
"""

from backend.models import Case

# 有利/不利の分類セット
FAVORABLE_OUTCOMES = {"認容", "一部認容", "破棄差戻", "破棄自判", "取消", "変更"}
UNFAVORABLE_OUTCOMES = {"棄却", "却下", "上告棄却", "上告不受理"}


def classify_outcome(result: str | None) -> str | None:
    """resultの値を有利/不利/その他に分類する。

    Returns:
        "favorable" — 原告に有利な結果
        "unfavorable" — 原告に不利な結果
        None — 分類不能
    """
    if not result:
        return None
    result = result.strip()
    if result in FAVORABLE_OUTCOMES:
        return "favorable"
    if result in UNFAVORABLE_OUTCOMES:
        return "unfavorable"
    return None


def classify_case_outcome(case: Case) -> str | None:
    """Caseオブジェクトのresultフィールドを分類する。"""
    return classify_outcome(case.result)
