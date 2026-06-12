"""Tests for Question Bank feature - generate, list, filter, delete, create-quiz"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "teacher123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

created_question_ids = []

class TestQuestionBankList:
    """GET /api/question-bank"""

    def test_list_returns_200(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        print(f"Question bank list: {len(res.json())} questions")

    def test_list_without_auth_returns_403(self):
        res = requests.get(f"{BASE_URL}/api/question-bank")
        assert res.status_code in [401, 403, 422]
        print(f"Unauthenticated list returned: {res.status_code}")

    def test_list_filter_by_grade5(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers, params={"grade": "5"})
        assert res.status_code == 200
        data = res.json()
        for q in data:
            assert q["grade"] == "5"
        print(f"Grade 5 filter: {len(data)} questions")

    def test_list_filter_by_difficulty(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers, params={"difficulty": "easy"})
        assert res.status_code == 200
        data = res.json()
        for q in data:
            assert q["difficulty"] == "easy"
        print(f"Easy difficulty filter: {len(data)} questions")


class TestQuestionBankGenerate:
    """POST /api/question-bank/generate"""

    def test_generate_grade5(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/question-bank/generate",
            json={"grade": "5"},
            headers=auth_headers,
            timeout=60
        )
        assert res.status_code == 200, f"Generate failed: {res.text}"
        data = res.json()
        assert "questions" in data
        assert "count" in data
        assert data["count"] > 0
        # Store IDs for cleanup
        for q in data["questions"]:
            created_question_ids.append(q["id"])
        print(f"Generated {data['count']} questions for grade 5, topic: {data.get('topic')}")

    def test_generate_invalid_grade(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/question-bank/generate",
            json={"grade": "10"},
            headers=auth_headers,
            timeout=30
        )
        assert res.status_code in [400, 422]
        print(f"Invalid grade returned: {res.status_code}")

    def test_generated_questions_have_required_fields(self, auth_headers):
        # Use previously generated questions
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers, params={"grade": "5"})
        assert res.status_code == 200
        data = res.json()
        assert len(data) > 0, "No questions found after generation"
        q = data[0]
        assert "id" in q
        assert "text" in q
        assert "type" in q
        assert "difficulty" in q
        assert "grade" in q
        assert "points" in q
        print(f"Question fields verified: {list(q.keys())}")


class TestQuestionBankDelete:
    """DELETE /api/question-bank/{qid}"""

    def test_delete_question(self, auth_headers):
        # First get a question to delete
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        if not data:
            pytest.skip("No questions available to delete")
        
        qid = data[0]["id"]
        del_res = requests.delete(f"{BASE_URL}/api/question-bank/{qid}", headers=auth_headers)
        assert del_res.status_code == 200
        
        # Verify deletion
        res2 = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers)
        ids = [q["id"] for q in res2.json()]
        assert qid not in ids
        print(f"Deleted question {qid} successfully")

    def test_delete_nonexistent_returns_404(self, auth_headers):
        res = requests.delete(f"{BASE_URL}/api/question-bank/nonexistent-id-12345", headers=auth_headers)
        assert res.status_code == 404
        print(f"Delete nonexistent: {res.status_code}")


class TestCreateQuizFromBank:
    """POST /api/question-bank/create-quiz"""

    def test_create_quiz_from_bank(self, auth_headers):
        # Get available questions
        res = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        if len(data) < 2:
            pytest.skip("Not enough questions in bank")
        
        ids = [data[0]["id"], data[1]["id"]]
        quiz_res = requests.post(
            f"{BASE_URL}/api/question-bank/create-quiz",
            json={"title": "TEST_Quiz from Bank", "question_ids": ids},
            headers=auth_headers
        )
        assert quiz_res.status_code == 200, f"Create quiz failed: {quiz_res.text}"
        quiz = quiz_res.json()
        assert "id" in quiz
        assert quiz["title"] == "TEST_Quiz from Bank"
        assert "questions" in quiz
        assert len(quiz["questions"]) == 2
        assert quiz["status"] == "draft"
        print(f"Created quiz {quiz['id']} with {len(quiz['questions'])} questions")
        return quiz["id"]

    def test_create_quiz_empty_ids_returns_400(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/question-bank/create-quiz",
            json={"title": "Test", "question_ids": []},
            headers=auth_headers
        )
        assert res.status_code == 400
        print(f"Empty IDs returned: {res.status_code}")
