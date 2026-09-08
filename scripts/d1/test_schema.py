from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SQL = ROOT / "prisma" / "d1" / "0001_initial.sql"
MANIFEST = ROOT / "prisma" / "d1" / "schema-manifest.json"


def run() -> None:
    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SQL.read_text(encoding="utf-8"))
    tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()
    assert len(tables) == 24, len(tables)
    assert not connection.execute("PRAGMA foreign_key_check").fetchall()
    cohort_fk = connection.execute("PRAGMA foreign_key_list(users)").fetchall()
    assert any(row[2] == "cohorts" and row[6] == "RESTRICT" and row[5] == "CASCADE" for row in cohort_fk), cohort_fk
    workflow_fk = connection.execute("PRAGMA foreign_key_list(workflows)").fetchall()
    assert any(row[2] == "users" and row[6] == "CASCADE" and row[5] == "CASCADE" for row in workflow_fk), workflow_fk

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert len(manifest["tables"]) == 24
    message_fields = {field["name"]: field for table in manifest["tables"] if table["name"] == "design_thread_messages" for field in table["fields"]}
    assert message_fields["attachments"] == {"name": "attachments", "type": "String", "array": True, "nullable": True, "prismaRequired": True}

    connection.execute("INSERT INTO cohorts (id, name, 교육시작일, 교육요일, 자료제출마감일, updatedAt) VALUES ('c1', '1기', 1767225600000, '월', 1768003200000, 1767225600000)")
    connection.execute("INSERT INTO users (id, email, password, 이름, 연락처, cohortId, updatedAt) VALUES ('u1', 'u@example.com', 'hash', '사용자', '010', 'c1', 1767225600000)")
    connection.execute("INSERT INTO workflows (id, userId, type, updatedAt) VALUES ('w1', 'u1', '명함', 1767225600000)")
    connection.execute("INSERT INTO design_threads (id, workflowId, updatedAt) VALUES ('t1', 'w1', 1767225600000)")
    connection.execute("INSERT INTO communication_threads (id, userId, title, updatedAt) VALUES ('ct1', 'u1', '문의', 1767225600000)")
    connection.execute("INSERT INTO design_thread_messages (id, threadId, authorId, authorType, authorName, messageType, content, attachments) VALUES ('m1', 't1', 'u1', 'user', '사용자', 'message', '내용', '[\"r2://a\"]')")
    assert connection.execute("SELECT json_extract(attachments, '$[0]') FROM design_thread_messages WHERE id = 'm1'").fetchone()[0] == "r2://a"
    connection.execute("INSERT INTO design_thread_messages (id, threadId, authorId, authorType, authorName, messageType, content, attachments) VALUES ('m-null', 't1', 'u1', 'user', '사용자', 'message', '내용', NULL)")
    assert connection.execute("SELECT attachments FROM design_thread_messages WHERE id = 'm-null'").fetchone()[0] is None
    try:
        connection.execute("INSERT INTO design_thread_messages (id, threadId, authorId, authorType, authorName, messageType, content, attachments) VALUES ('m2', 't1', 'u1', 'user', '사용자', 'message', '내용', '{\"url\":\"r2://a\"}')")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("JSON object accepted for scalar-list column")

    plan = connection.execute("EXPLAIN QUERY PLAN SELECT id FROM workflows WHERE userId = 'u1' AND status = '대기' AND (createdAt, id) > (0, '') ORDER BY createdAt, id LIMIT 20").fetchall()
    plan_text = " ".join(str(row) for row in plan)
    assert "workflows_user_status_created_id_keyset" in plan_text, plan_text
    for query, expected in [
        ("SELECT id FROM communication_threads WHERE userId = 'u1' ORDER BY lastReplyAt DESC, id DESC LIMIT 20", "communication_threads_user_last_reply_id_keyset"),
        ("SELECT id FROM communication_threads WHERE userId = 'u1' AND (lastReplyAt, id) < (0, 'zz') ORDER BY lastReplyAt DESC, id DESC LIMIT 20", "communication_threads_user_last_reply_id_keyset"),
    ]:
        communication_plan = connection.execute("EXPLAIN QUERY PLAN " + query).fetchall()
        communication_text = " ".join(str(row) for row in communication_plan)
        assert expected in communication_text and "TEMP B-TREE" not in communication_text, communication_text
    status_plan = connection.execute("EXPLAIN QUERY PLAN SELECT id FROM communication_threads WHERE status = 'open' ORDER BY lastReplyAt DESC, id DESC LIMIT 20").fetchall()
    status_text = " ".join(str(row) for row in status_plan)
    assert "communication_threads_status_last_reply_id_keyset" in status_text and "TEMP B-TREE" not in status_text, status_text
    connection.execute("DELETE FROM users WHERE id = 'u1'")
    assert connection.execute("SELECT COUNT(*) FROM workflows WHERE id = 'w1'").fetchone()[0] == 0
    assert connection.execute("SELECT COUNT(*) FROM communication_threads WHERE id = 'ct1'").fetchone()[0] == 0
    assert connection.execute("SELECT COUNT(*) FROM design_thread_messages WHERE id IN ('m1', 'm-null')").fetchone()[0] == 0
    print(f"schema ok: {len(tables)} tables, foreign keys valid, JSON array check valid, keyset indexes used")


if __name__ == "__main__":
    run()
