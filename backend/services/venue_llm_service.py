import json
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from backend.services.llm_service import _get_client, _semaphore
from backend.services.venue_service import compare_courts
from backend.config import settings

VENUE_SYSTEM_PROMPT = """あなたは日本の訴訟戦略専門の弁護士です。
依頼人の事件類型と候補裁判所別の過去の判決統計に基づいて、最適な管轄裁判所を推薦します。

## 日本の裁判所体系
最高裁判所 → 高等裁判所 → 地方裁判所 → 簡易裁判所
※知的財産高等裁判所、家庭裁判所等の専門裁判所も考慮してください。

## 分析基準

### 1. 統計的有利性
- 各裁判所の認容率（原告勝訴率）と棄却率を比較します。
- 事件類型別の判決傾向の違いを分析します。

### 2. 統計的信頼度
- サンプルサイズ（総判決数）を必ず考慮します。
- 30件未満の場合、統計的信頼度が低いことを明示してください。
- 件数が少ない裁判所の高い認容率よりも、件数が多い裁判所の安定した認容率のほうが信頼できます。

### 3. 裁判部構成
- 当該裁判所の主要裁判官の傾向を分析します。
- 特に認容率が高い裁判官が活発に活動中かを確認します。

### 4. 総合推薦
- 最終推薦裁判所とその根拠を明確に提示します。
- 次善策も併せて言及し、各裁判所のリスクを説明します。

## 出力形式
- Markdown形式で作成してください。
- 各裁判所別分析 → 比較要約 → 最終推薦の順序で作成します。
- 核心数値（認容率、件数）は太字で強調してください。
- 推薦結果は確定的な判断ではなく、統計的参考資料であることを明示してください。"""


async def recommend_venue(
    db: Session,
    case_type: str,
    court_names: list[str] | None = None,
    case_description: str | None = None,
) -> AsyncGenerator[str, None]:
    """AIが最適な管轄裁判所を推薦する（ストリーミング）。"""
    # 比較対象裁判所がなければ、当該事件類型の上位裁判所を自動選択
    if not court_names:
        from backend.services.venue_service import list_courts
        courts = list_courts(db, case_type)
        court_names = [c["court_name"] for c in courts[:5]]

    if len(court_names) < 2:
        yield "比較する裁判所が2つ以上必要です。"
        return

    comparison = compare_courts(db, court_names, case_type)

    user_content = f"""## 分析依頼

**事件類型**: {case_type}
**比較対象裁判所**: {', '.join(court_names)}

## 裁判所別統計データ

"""
    for court in comparison["courts"]:
        user_content += f"""### {court['court_name']}
- 総判決数: {court['total_cases']}件
- 認容率: {court['acceptance_rate']}%
- 棄却率: {court['dismissal_rate']}%
- 判決期間: {court['date_range']['min']} ～ {court['date_range']['max']}
- 判決類型分布: {json.dumps(court['decision_type_distribution'], ensure_ascii=False)}
- 主要裁判官:
"""
        for j in court["top_judges"][:5]:
            user_content += f"  - {j['name']}（{j['case_count']}件、認容率 {j['acceptance_rate']}%）\n"
        user_content += "\n"

    if case_description:
        user_content += f"""## 事件概要
{case_description}

上記の事件概要を考慮し、最も有利な管轄裁判所を推薦してください。
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
        yield f"\n\n---\n⚠️ AI分析中にエラーが発生しました: {e}"
