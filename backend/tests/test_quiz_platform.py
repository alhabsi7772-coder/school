"""Backend tests for IT Quiz Platform (Al-Khairat School)"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def token():
    """Get teacher auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "teacher123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def quiz_id(auth):
    """Create a test quiz"""
    r = auth.post(f"{BASE_URL}/api/quizzes", json={
        "title": "TEST_Quiz Backend",
        "description": "Test description",
        "settings": {"secret_code": "TEST99", "time_limit": 30, "show_results": True}
    })
    assert r.status_code == 200
    return r.json()["id"]

# ===== AUTH TESTS =====

def test_login_success():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "teacher123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert "teacher_name" in data

def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "wrongpass"})
    assert r.status_code == 401

def test_get_profile(auth):
    r = auth.get(f"{BASE_URL}/api/auth/profile")
    assert r.status_code == 200
    data = r.json()
    assert "teacher_name" in data
    assert "school_name" in data
    assert "_id" not in data

def test_profile_requires_auth():
    r = requests.get(f"{BASE_URL}/api/auth/profile")
    assert r.status_code == 403

# ===== QUIZ CRUD =====

def test_list_quizzes(auth):
    r = auth.get(f"{BASE_URL}/api/quizzes")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_quiz(auth):
    r = auth.post(f"{BASE_URL}/api/quizzes", json={
        "title": "TEST_New Quiz",
        "settings": {"secret_code": "NEWTEST", "time_limit": 20}
    })
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "TEST_New Quiz"
    assert data["status"] == "draft"
    assert "id" in data
    # cleanup
    auth.delete(f"{BASE_URL}/api/quizzes/{data['id']}")

def test_get_quiz(auth, quiz_id):
    r = auth.get(f"{BASE_URL}/api/quizzes/{quiz_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == quiz_id

# ===== QUESTIONS =====

def test_add_mcq_question(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/questions", json={
        "type": "mcq",
        "text": "What is 2+2?",
        "options": ["1", "2", "4", "8"],
        "correct_answer": "4",
        "points": 1
    })
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "mcq"
    assert "id" in data

def test_add_true_false_question(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/questions", json={
        "type": "true_false",
        "text": "The sky is blue",
        "correct_answer": "صح",
        "points": 1
    })
    assert r.status_code == 200

def test_add_short_question(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/questions", json={
        "type": "short",
        "text": "Capital of Kuwait?",
        "correct_answer": "Kuwait City",
        "points": 2
    })
    assert r.status_code == 200

def test_add_long_question(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/questions", json={
        "type": "long",
        "text": "Explain the OSI model",
        "points": 5
    })
    assert r.status_code == 200

# ===== STUDENT FLOW =====

def test_activate_quiz(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/activate")
    assert r.status_code == 200

def test_student_join_by_code():
    r = requests.get(f"{BASE_URL}/api/quiz/join/TEST99")
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "title" in data
    assert data["status"] in ["waiting", "active"]

def test_invalid_code():
    r = requests.get(f"{BASE_URL}/api/quiz/join/BADCODE")
    assert r.status_code == 404

def test_student_join_quiz(quiz_id):
    r = requests.post(f"{BASE_URL}/api/quiz/{quiz_id}/join", json={
        "student_name": "TEST_Student",
        "grade": "10",
        "section": "A"
    })
    assert r.status_code == 200
    data = r.json()
    assert "submission_id" in data
    return data["submission_id"]

def test_quiz_status(quiz_id):
    r = requests.get(f"{BASE_URL}/api/quiz/{quiz_id}/status")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data

def test_start_quiz(auth, quiz_id):
    r = auth.post(f"{BASE_URL}/api/quizzes/{quiz_id}/start")
    assert r.status_code == 200

def test_get_questions_after_start(quiz_id):
    # First join to get sub_id
    r = requests.post(f"{BASE_URL}/api/quiz/{quiz_id}/join", json={
        "student_name": "TEST_Student2",
        "grade": "11",
        "section": "B"
    })
    assert r.status_code == 200
    sub_id = r.json()["submission_id"]
    
    r2 = requests.get(f"{BASE_URL}/api/quiz/{quiz_id}/questions/{sub_id}")
    assert r2.status_code == 200
    data = r2.json()
    assert data["status"] == "active"
    assert len(data["questions"]) > 0
    # Verify no correct_answer in response
    for q in data["questions"]:
        assert "correct_answer" not in q
    return sub_id, data["questions"]

def test_submit_answers(quiz_id):
    # Join first
    r = requests.post(f"{BASE_URL}/api/quiz/{quiz_id}/join", json={
        "student_name": "TEST_Submitter",
        "grade": "9",
        "section": "C"
    })
    sub_id = r.json()["submission_id"]
    
    # Get questions
    r2 = requests.get(f"{BASE_URL}/api/quiz/{quiz_id}/questions/{sub_id}")
    questions = r2.json().get("questions", [])
    
    # Submit answers
    answers = [{"question_id": q["id"], "answer_text": "test answer"} for q in questions]
    r3 = requests.post(f"{BASE_URL}/api/quiz/{quiz_id}/submit/{sub_id}", json={"answers": answers})
    assert r3.status_code == 200
    data = r3.json()
    assert "message" in data

def test_teacher_results(auth, quiz_id):
    r = auth.get(f"{BASE_URL}/api/quizzes/{quiz_id}/results")
    assert r.status_code == 200
    data = r.json()
    assert "quiz" in data
    assert "submissions" in data
    assert "stats" in data

def test_lobby(auth, quiz_id):
    r = auth.get(f"{BASE_URL}/api/quizzes/{quiz_id}/lobby")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_cleanup(auth, quiz_id):
    """Cleanup test quiz"""
    r = auth.delete(f"{BASE_URL}/api/quizzes/{quiz_id}")
    assert r.status_code == 200
