"""
Google File Search Store に判例データをバッチアップロードするスクリプト。

50件/ファイルにまとめて並列アップロード → 30,000件を数分で完了。

使い方:
  python -m scripts.upload_to_file_search create-store
  python -m scripts.upload_to_file_search upload --cases-per-file 50 --workers 20
  python -m scripts.upload_to_file_search verify
"""

import argparse
import json
import re
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from google import genai
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import settings
from backend.models import Base, Case

PROGRESS_FILE = Path(__file__).parent / ".upload_progress.json"
_progress_lock = threading.Lock()


def save_progress(progress: dict):
    PROGRESS_FILE.write_text(json.dumps(progress, ensure_ascii=False, indent=2))


def get_db() -> Session:
    engine = create_engine(
        f"sqlite:///{settings.db_path}",
        connect_args={"check_same_thread": False},
    )
    return sessionmaker(bind=engine)()


def get_client() -> genai.Client:
    if not settings.google_api_key:
        print("エラー: GOOGLE_API_KEY が設定されていません。")
        sys.exit(1)
    return genai.Client(api_key=settings.google_api_key)


def format_case_document(case) -> str:
    parts = []
    parts.append(f"事件番号: {case.case_number or '不明'}")
    parts.append(f"事件名: {case.case_name or '不明'}")
    parts.append(f"裁判所: {case.court_name or '不明'}")
    if case.decision_date:
        parts.append(f"判決日: {case.decision_date.isoformat()}")
    parts.append(f"結果: {case.result or '不明'}")
    if case.ref_law:
        clean_ref = re.sub(r"<[^>]+>", "", case.ref_law)
        parts.append(f"参照法令: {clean_ref}")
    if case.gist:
        parts.append(f"\n【判示事項】\n{case.gist}")
    if case.case_gist:
        parts.append(f"\n【裁判要旨】\n{case.case_gist}")
    return "\n".join(parts)


CASE_SEPARATOR = "\n\n" + "=" * 60 + "\n\n"


def build_batch_document(cases: list) -> str:
    """複数の判例を1つのテキスト文書にまとめる。"""
    return CASE_SEPARATOR.join(format_case_document(c) for c in cases)


def upload_batch_file(
    client, store_name: str, batch_idx: int, doc_text: str, case_count: int
) -> tuple[int, bool, str, int]:
    """バッチファイル1つをアップロード。(batch_idx, success, error, case_count)"""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            f.write(doc_text)
            tmp_path = f.name

        client.file_search_stores.upload_to_file_search_store(
            file=tmp_path,
            file_search_store_name=store_name,
            config={
                "display_name": f"cases_batch_{batch_idx:04d}",
                "chunking_config": {
                    "white_space_config": {
                        "max_tokens_per_chunk": 512,
                        "max_overlap_tokens": 100,
                    }
                },
            },
        )
        return (batch_idx, True, "", case_count)
    except Exception as e:
        return (batch_idx, False, str(e), case_count)
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


# ── Phase 1 ──────────────────────────────────────


def cmd_create_store(args):
    client = get_client()
    print("FileSearchStore を作成中...")
    store = client.file_search_stores.create(config={"display_name": "jp-legal-cases"})
    store_id = store.name.split("/")[-1] if "/" in store.name else store.name
    print(f"✅ ストア作成完了!")
    print(f"   名前: {store.name}")
    print(f"\n.envに設定:")
    print(f"   FILE_SEARCH_STORE_ID={store_id}")


# ── Phase 2: バッチ並列アップロード ──────────────────────────


def cmd_upload(args):
    if not settings.file_search_store_id:
        print("エラー: FILE_SEARCH_STORE_ID が設定されていません。")
        sys.exit(1)

    client = get_client()
    db = get_db()
    store_name = f"fileSearchStores/{settings.file_search_store_id}"
    cpf = args.cases_per_file
    workers = args.workers

    # 対象判例を取得
    cases = db.execute(
        select(Case)
        .where((Case.case_gist.isnot(None)) | (Case.gist.isnot(None)))
        .order_by(Case.id)
    ).scalars().all()
    db.close()

    total_cases = len(cases)

    # バッチに分割
    batches = []
    for i in range(0, total_cases, cpf):
        batch_cases = cases[i : i + cpf]
        doc_text = build_batch_document(batch_cases)
        batches.append((len(batches), doc_text, len(batch_cases)))

    print(f"判例総数: {total_cases}")
    print(f"バッチ数: {len(batches)} ({cpf}件/ファイル)")
    print(f"並列ワーカー: {workers}")
    print()

    uploaded_files = 0
    uploaded_cases = 0
    errors = 0
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(
                upload_batch_file, client, store_name, idx, doc_text, count
            ): idx
            for idx, doc_text, count in batches
        }

        for i, future in enumerate(as_completed(futures), 1):
            batch_idx, success, err_msg, count = future.result()

            if success:
                uploaded_files += 1
                uploaded_cases += count
            else:
                errors += 1
                if errors <= 5 or errors % 50 == 0:
                    print(f"  ❌ batch_{batch_idx}: {err_msg[:120]}")

            # 進捗表示 (10バッチごと or 最後)
            if i % 10 == 0 or i == len(batches):
                elapsed = time.time() - start_time
                rate = i / elapsed if elapsed > 0 else 0
                remaining = (len(batches) - i) / rate if rate > 0 else 0
                pct = i / len(batches) * 100
                print(
                    f"  [{i}/{len(batches)}] {pct:.1f}%"
                    f" | ✅{uploaded_cases}件({uploaded_files}ファイル) ❌{errors}"
                    f" | {rate:.1f}バッチ/秒"
                    f" | 残り {remaining:.0f}秒"
                )

    elapsed_total = time.time() - start_time
    save_progress({
        "uploaded_count": uploaded_cases,
        "uploaded_files": uploaded_files,
        "batch_mode": True,
        "cases_per_file": cpf,
    })

    print(f"\n✅ アップロード完了!")
    print(f"   判例: {uploaded_cases} 件")
    print(f"   ファイル: {uploaded_files} 個")
    print(f"   エラー: {errors} 個")
    print(f"   所要時間: {elapsed_total:.0f} 秒 ({elapsed_total/60:.1f} 分)")
    print(f"   速度: {uploaded_cases/elapsed_total:.0f} 件/秒")


# ── Phase 3 ──────────────────────────────────────


def cmd_verify(args):
    if not settings.file_search_store_id:
        print("エラー: FILE_SEARCH_STORE_ID が設定されていません。")
        sys.exit(1)

    client = get_client()
    store_name = f"fileSearchStores/{settings.file_search_store_id}"
    store = client.file_search_stores.get(name=store_name)

    active = int(store.active_documents_count or 0)
    pending = int(store.pending_documents_count or 0)
    failed = int(store.failed_documents_count or 0)
    size_mb = int(store.size_bytes or 0) / 1024 / 1024

    print(f"ストア: {store.name}")
    print(f"  アクティブ: {active} ファイル")
    print(f"  処理中: {pending} ファイル")
    print(f"  失敗: {failed} ファイル")
    print(f"  サイズ: {size_mb:.2f} MB")

    db = get_db()
    db_count = db.execute(
        select(func.count()).select_from(Case)
        .where((Case.case_gist.isnot(None)) | (Case.gist.isnot(None)))
    ).scalar()
    db.close()

    progress = {}
    if PROGRESS_FILE.exists():
        progress = json.loads(PROGRESS_FILE.read_text())

    cpf = progress.get("cases_per_file", 50)
    expected_files = (db_count + cpf - 1) // cpf

    print(f"\n  DB対象判例: {db_count} 件")
    print(f"  期待ファイル数: ~{expected_files}")

    if pending > 0:
        print(f"\n⚠️  {pending} ファイルが処理中です。")


# ── メイン ──────────────────────────────────────


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("create-store")

    up = sub.add_parser("upload")
    up.add_argument("--cases-per-file", type=int, default=50)
    up.add_argument("--workers", type=int, default=20)

    sub.add_parser("verify")

    args = parser.parse_args()
    {"create-store": cmd_create_store, "upload": cmd_upload, "verify": cmd_verify}[
        args.command
    ](args)


if __name__ == "__main__":
    main()
