"""End-to-end tests for the new match/matching question type feature."""
import os
import json
import uuid
import time
import pytest
import requests
from dotenv import load_dotenv
load_dotenv('/app/frontend/.env')
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def match_bank_questions(h):
    # find match-type questions in bank (grade 5 preferred)
    r = requests.get(f"{API}/question-bank", params={"grade": "الخامس", "type": "match", "limit": 50}, headers=h)
    assert r.status_code == 200, r.text
    qs = r.json().get("questions", [])
    if not qs:
        # try any grade
        r = requests.get(f"{API}/question-bank", params={"type": "match", "limit": 50}, headers=h)
        qs = r.json().get("questions", [])
    assert qs, "No match-type questions found in bank"
    # ensure they have pairs
    qs = [q for q in qs if isinstance(q.get("pairs"), list) and len(q["pairs"]) >= 2]
    assert qs, "No match questions with pairs found"
    return qs


class TestMatchBank:
    def test_bank_returns_match_with_pairs(self, match_bank_questions):
        q = match_bank_questions[0]
        assert q["type"] == "match"
        assert all("left" in p and "right" in p for p in q["pairs"])

    def test_create_quiz_from_bank_with_only_match(self, h, match_bank_questions):
        q = match_bank_questions[0]
        r = requests.post(f"{API}/question-bank/create-quiz",
                          json={"title": "TEST_match_quiz", "question_ids": [q["id"]]}, headers=h)
        assert r.status_code == 200, r.text
        quiz = r.json()
        assert len(quiz["questions"]) == 1
        assert quiz["questions"][0]["type"] == "match"
        assert quiz["questions"][0].get("pairs") == q["pairs"]
        pytest.quiz_id = quiz["id"]
        pytest.secret = quiz["settings"]["secret_code"]
        pytest.pairs = q["pairs"]


class TestMatchExamFlow:
    def test_activate_and_start(self, h):
        qid = pytest.quiz_id
        r = requests.post(f"{API}/quizzes/{qid}/activate", headers=h)
        assert r.status_code == 200
        r = requests.post(f"{API}/quizzes/{qid}/start", headers=h)
        assert r.status_code == 200

    def test_join_and_questions_hide_correct(self, h):
        qid = pytest.quiz_id
        r = requests.post(f"{API}/quiz/{qid}/join",
                         json={"student_name": "TEST_Student", "grade": "الخامس", "section": "1"})
        assert r.status_code == 200, r.text
        pytest.sub_id = r.json()["submission_id"]
        r = requests.get(f"{API}/quiz/{qid}/questions/{pytest.sub_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "active"
        q = data["questions"][0]
        assert q["type"] == "match"
        assert "left" in q and "right" in q
        # Correct pairing should not be inferable directly from position - right should be shuffled
        # (may occasionally match order by chance; check that no 'pairs' key is exposed)
        assert "pairs" not in q
        assert "correct_answer" not in q
        assert set(q["left"]) == set(p["left"] for p in pytest.pairs)
        assert set(q["right"]) == set(p["right"] for p in pytest.pairs)
        pytest.left_order = q["left"]

    def test_submit_partial_correct(self, h):
        qid = pytest.quiz_id
        sub_id = pytest.sub_id
        # Build answer where all but one is correct
        # pairs is a list [{left, right}], left_order is what student sees for lefts
        pair_map = {p["left"]: p["right"] for p in pytest.pairs}
        student_map = {}
        n = len(pytest.left_order)
        for i, left_text in enumerate(pytest.left_order):
            correct = pair_map[left_text]
            if i == 0 and n > 1:
                # deliberately wrong: pick a different right
                wrong = next(v for v in pair_map.values() if v != correct)
                student_map[str(i)] = wrong
            else:
                student_map[str(i)] = correct
        expected_correct = n - 1
        # find question id
        r = requests.get(f"{API}/quiz/{qid}/questions/{sub_id}")
        q_id = r.json()["questions"][0]["id"]
        r = requests.post(f"{API}/quiz/{qid}/submit/{sub_id}",
                         json={"answers": [{"question_id": q_id, "answer_text": json.dumps(student_map)}]})
        assert r.status_code == 200, r.text

        # Verify result / partial credit
        r = requests.get(f"{API}/quiz/{qid}/result/{sub_id}")
        assert r.status_code == 200
        res = r.json()
        assert res["submitted"] is True
        assert res["max_score"] > 0
        # Expect partial score = pts * (n-1)/n
        assert res["total_score"] < res["max_score"]
        assert res["total_score"] > 0
        ans = res["answers"][0]
        assert ans["question_type"] == "match"
        assert "pairs_result" in ans
        assert len(ans["pairs_result"]) == n
        correct_count = sum(1 for pr in ans["pairs_result"] if pr["correct"])
        assert correct_count == expected_correct
        # Wrong pair must expose correct_right
        wrong_pr = [pr for pr in ans["pairs_result"] if not pr["correct"]][0]
        assert wrong_pr["correct_right"]
        assert wrong_pr["student_right"]

    def test_all_correct_full_credit(self, h):
        qid = pytest.quiz_id
        # new submission
        r = requests.post(f"{API}/quiz/{qid}/join",
                         json={"student_name": "TEST_Student2", "grade": "الخامس", "section": "1"})
        sub_id = r.json()["submission_id"]
        r = requests.get(f"{API}/quiz/{qid}/questions/{sub_id}")
        q = r.json()["questions"][0]
        pair_map = {p["left"]: p["right"] for p in pytest.pairs}
        student_map = {str(i): pair_map[lt] for i, lt in enumerate(q["left"])}
        r = requests.post(f"{API}/quiz/{qid}/submit/{sub_id}",
                         json={"answers": [{"question_id": q["id"], "answer_text": json.dumps(student_map)}]})
        assert r.status_code == 200
        r = requests.get(f"{API}/quiz/{qid}/result/{sub_id}")
        res = r.json()
        assert res["total_score"] == res["max_score"]
        assert all(pr["correct"] for pr in res["answers"][0]["pairs_result"])

    def test_cleanup(self, h):
        requests.delete(f"{API}/quizzes/{pytest.quiz_id}", headers=h)


class TestRegressionMcq:
    def test_create_quiz_from_bank_mcq(self, h):
        r = requests.get(f"{API}/question-bank", params={"type": "mcq", "limit": 3}, headers=h)
        qs = r.json().get("questions", [])
        if not qs:
            pytest.skip("no mcq bank questions")
        r = requests.post(f"{API}/question-bank/create-quiz",
                          json={"title": "TEST_mcq_reg", "question_ids": [qs[0]["id"]]}, headers=h)
        assert r.status_code == 200
        quiz = r.json()
        assert quiz["questions"][0]["type"] == "mcq"
        requests.delete(f"{API}/quizzes/{quiz['id']}", headers=h)
