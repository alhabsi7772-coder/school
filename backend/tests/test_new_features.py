"""Tests for new features: started_at/entry time, CSV export data, polling support"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def get_teacher_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "teacher123"})
    if res.status_code == 200:
        return res.json().get("token")
    return None

@pytest.fixture(scope="module")
def token():
    t = get_teacher_token()
    if not t:
        pytest.skip("Teacher login failed")
    return t

@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def test_quiz_and_submission(auth_headers):
    """Create quiz, add question, activate, join as student, submit"""
    # Create quiz
    res = requests.post(f"{BASE_URL}/api/quizzes", json={
        "title": "TEST_Features Quiz",
        "description": "",
        "settings": {"time_limit": None, "secret_code": "TST77", "show_results": True, "randomize_questions": False}
    }, headers=auth_headers)
    assert res.status_code == 200
    quiz = res.json()
    qid = quiz["id"]

    # Add question
    q_res = requests.post(f"{BASE_URL}/api/quizzes/{qid}/questions", json={
        "type": "mcq", "text": "What is 2+2?", "options": ["3","4","5"],
        "correct_answer": "4", "points": 1
    }, headers=auth_headers)
    assert q_res.status_code == 200

    # Activate (waiting)
    requests.post(f"{BASE_URL}/api/quizzes/{qid}/activate", headers=auth_headers)
    # Start (active)
    requests.post(f"{BASE_URL}/api/quizzes/{qid}/start", headers=auth_headers)

    # Join as student
    join_res = requests.post(f"{BASE_URL}/api/quiz/{qid}/join", json={
        "student_name": "TEST_Student", "grade": "10", "section": "A", "civil_id": ""
    })
    assert join_res.status_code == 200, f"Join failed: {join_res.text}"
    sub_id = join_res.json()["submission_id"]

    # Get questions
    q_res = requests.get(f"{BASE_URL}/api/quiz/{qid}/questions/{sub_id}")
    questions = q_res.json().get("questions", [])

    # Submit answers
    answers = [{"question_id": q["id"], "answer_text": "4"} for q in questions]
    submit_res = requests.post(f"{BASE_URL}/api/quiz/{qid}/submit/{sub_id}", json={"answers": answers})
    assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"

    yield {"quiz_id": qid, "sub_id": sub_id}

    # Cleanup
    requests.delete(f"{BASE_URL}/api/quizzes/{qid}", headers=auth_headers)


class TestStartedAt:
    """Test that started_at is stored and returned in results"""

    def test_results_returns_started_at(self, test_quiz_and_submission, auth_headers):
        qid = test_quiz_and_submission["quiz_id"]
        res = requests.get(f"{BASE_URL}/api/quizzes/{qid}/results", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        subs = data.get("submissions", [])
        assert len(subs) > 0, "No submissions found"
        sub = next((s for s in subs if s.get("student_name") == "TEST_Student"), None)
        assert sub is not None, "TEST_Student submission not found"
        assert "started_at" in sub, "started_at field missing"
        assert sub["started_at"] is not None, "started_at is None"
        print(f"PASS: started_at = {sub['started_at']}")

    def test_results_stats_present(self, test_quiz_and_submission, auth_headers):
        qid = test_quiz_and_submission["quiz_id"]
        res = requests.get(f"{BASE_URL}/api/quizzes/{qid}/results", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "stats" in data
        assert data["stats"]["total"] >= 1
        print(f"PASS: stats = {data['stats']}")


class TestStudentResultPolling:
    """Test student result endpoint for polling"""

    def test_student_result_endpoint(self, test_quiz_and_submission):
        qid = test_quiz_and_submission["quiz_id"]
        sub_id = test_quiz_and_submission["sub_id"]
        res = requests.get(f"{BASE_URL}/api/quiz/{qid}/result/{sub_id}")
        assert res.status_code == 200
        data = res.json()
        assert "is_graded" in data
        assert "submitted" in data
        assert data["submitted"] == True
        print(f"PASS: is_graded={data['is_graded']}, submitted={data['submitted']}")


class TestCSVExportData:
    """All fields needed for CSV export present in results"""

    def test_results_has_csv_fields(self, test_quiz_and_submission, auth_headers):
        qid = test_quiz_and_submission["quiz_id"]
        res = requests.get(f"{BASE_URL}/api/quizzes/{qid}/results", headers=auth_headers)
        assert res.status_code == 200
        subs = res.json().get("submissions", [])
        assert len(subs) > 0
        sub = subs[0]
        for field in ["student_name", "grade", "section", "started_at", "total_score", "max_score", "percentage", "is_graded"]:
            assert field in sub, f"Missing CSV field: {field}"
        print(f"PASS: All CSV fields present")
