"""
Test the fix for quiz -> gradebook sync scoring bug.

Bug: apply-quiz used to PERCENTAGE-SCALE the student's score to the column's max
     (e.g. 100% on a 1-point quiz became 10 in column d1 max=10).
Fix: transfer the RAW total_score from the submission, capped at column max, and
     re-applying MUST replace (not add/keep stale).
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def teacher_headers():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token
    return {"Authorization": f"Bearer {token}"}


def _create_quiz(headers, title, questions):
    """Create a quiz with the given list of questions [{points, correct_answer}]. Returns (qid, secret_code)."""
    code = "TST" + os.urandom(3).hex().upper()
    r = requests.post(f"{API}/quizzes", json={"title": title, "settings": {"secret_code": code}}, headers=headers)
    assert r.status_code == 200, r.text
    qid = r.json()["id"]
    for idx, qd in enumerate(questions):
        r = requests.post(
            f"{API}/quizzes/{qid}/questions",
            json={
                "type": "mcq",
                "text": f"سؤال {idx+1}؟",
                "options": ["أ", "ب", "ج", "د"],
                "correct_answer": qd["correct_answer"],
                "points": qd["points"],
                "time_limit": 60,
            },
            headers=headers,
        )
        assert r.status_code == 200, r.text
    assert requests.post(f"{API}/quizzes/{qid}/activate", headers=headers).status_code == 200
    assert requests.post(f"{API}/quizzes/{qid}/start", headers=headers).status_code == 200
    return qid, code


def _submit_as_student(qid, student_name, answers_by_text):
    """Join quiz then submit answers. answers_by_text: dict {question_text: answer_text}."""
    r = requests.post(f"{API}/quiz/{qid}/join", json={"student_name": student_name, "grade": "الخامس", "section": "3"})
    assert r.status_code == 200, r.text
    sid = r.json()["submission_id"]
    r = requests.get(f"{API}/quiz/{qid}/questions/{sid}")
    assert r.status_code == 200
    qs = r.json()["questions"]
    answers = []
    for q in qs:
        if q["text"] in answers_by_text:
            answers.append({"question_id": q["id"], "answer_text": answers_by_text[q["text"]]})
    r = requests.post(f"{API}/quiz/{qid}/submit/{sid}", json={"answers": answers})
    assert r.status_code == 200, r.text
    return sid


@pytest.fixture(scope="module")
def gradebook(teacher_headers):
    # cleanup any leftover TEST gradebooks
    for g in requests.get(f"{API}/gradebooks", headers=teacher_headers).json():
        if g.get("section") == "TEST":
            requests.delete(f"{API}/gradebooks/{g['id']}", headers=teacher_headers)
    r = requests.post(
        f"{API}/gradebooks",
        json={"grade": "الخامس", "section": "TEST", "students": ["أحمد بن محمد التجريبي"]},
        headers=teacher_headers,
    )
    assert r.status_code == 200, r.text
    gb = r.json()
    yield gb
    requests.delete(f"{API}/gradebooks/{gb['id']}", headers=teacher_headers)


def _apply_and_get_score(headers, gid, qid, student_name_hint, semester="1", column="d1"):
    m = requests.post(f"{API}/gradebooks/{gid}/match-quiz", json={"quiz_id": qid}, headers=headers)
    assert m.status_code == 200, m.text
    mm = m.json()
    mappings = [{"submission_id": p["id"], "student_id": p["matched_student_id"]}
                for p in mm["proposals"] if p["matched_student_id"]]
    assert mappings, f"no matched student in proposals: {mm}"
    r = requests.post(
        f"{API}/gradebooks/{gid}/apply-quiz",
        json={"quiz_id": qid, "semester": semester, "column": column, "mappings": mappings},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    gb2 = requests.get(f"{API}/gradebooks/{gid}", headers=headers).json()
    student_id = mappings[0]["student_id"]
    return gb2["scores"].get(semester, {}).get(student_id, {}).get(column)


def test_raw_score_not_percentage_scaled(teacher_headers, gradebook):
    """1-point quiz, student gets 100% -> stored score in d1 (max=10) must be 1, NOT 10."""
    qid, _ = _create_quiz(teacher_headers, "اختبار نقطة واحدة", [{"points": 1, "correct_answer": "أ"}])
    _submit_as_student(qid, "أحمد التجريبي", {"سؤال 1؟": "أ"})
    stored = _apply_and_get_score(teacher_headers, gradebook["id"], qid, "أحمد", column="d1")
    assert stored == 1, f"Expected raw score 1, got {stored} (percentage-scaling bug not fixed)"
    requests.delete(f"{API}/quizzes/{qid}", headers=teacher_headers)


def test_re_apply_replaces_previous_value(teacher_headers, gradebook):
    """Second quiz with different raw score to SAME column must REPLACE the old value."""
    # First: raw=1
    q1, _ = _create_quiz(teacher_headers, "الاختبار الأول للاستبدال", [{"points": 1, "correct_answer": "أ"}])
    _submit_as_student(q1, "أحمد التجريبي", {"سؤال 1؟": "أ"})
    s1 = _apply_and_get_score(teacher_headers, gradebook["id"], q1, "أحمد", column="d1")
    assert s1 == 1, f"pre-condition failed, got {s1}"

    # Second: two questions -> 8pts correct + 2pts wrong -> raw=8, max_score=10
    q2, _ = _create_quiz(
        teacher_headers,
        "الاختبار الثاني للاستبدال",
        [{"points": 8, "correct_answer": "أ"}, {"points": 2, "correct_answer": "ب"}],
    )
    _submit_as_student(q2, "أحمد التجريبي", {"سؤال 1؟": "أ", "سؤال 2؟": "ج"})  # 8 correct, 2 wrong
    s2 = _apply_and_get_score(teacher_headers, gradebook["id"], q2, "أحمد", column="d1")
    assert s2 == 8, f"Expected replaced score 8, got {s2} (replace bug or scaling bug)"

    requests.delete(f"{API}/quizzes/{q1}", headers=teacher_headers)
    requests.delete(f"{API}/quizzes/{q2}", headers=teacher_headers)


def test_score_capped_at_column_max(teacher_headers, gradebook):
    """Raw score 15 into d1 (max=10) must be capped at 10."""
    qid, _ = _create_quiz(teacher_headers, "اختبار الاقتصاص", [{"points": 15, "correct_answer": "أ"}])
    _submit_as_student(qid, "أحمد التجريبي", {"سؤال 1؟": "أ"})
    stored = _apply_and_get_score(teacher_headers, gradebook["id"], qid, "أحمد", column="d1")
    assert stored == 10, f"Expected cap at column max 10, got {stored}"
    requests.delete(f"{API}/quizzes/{qid}", headers=teacher_headers)


def test_partial_score_not_scaled_q_column(teacher_headers, gradebook):
    """Raw=3 out of quiz max=10, column q1 max=5 -> stored=3 (not scaled to 5*0.3=1.5, not 5)."""
    qid, _ = _create_quiz(
        teacher_headers,
        "اختبار العمود القصير",
        [{"points": 3, "correct_answer": "أ"}, {"points": 7, "correct_answer": "ب"}],
    )
    _submit_as_student(qid, "أحمد التجريبي", {"سؤال 1؟": "أ", "سؤال 2؟": "ج"})  # 3 correct, 7 wrong -> raw=3
    stored = _apply_and_get_score(teacher_headers, gradebook["id"], qid, "أحمد", column="q1")
    assert stored == 3, f"Expected raw 3 in q1, got {stored}"
    requests.delete(f"{API}/quizzes/{qid}", headers=teacher_headers)
