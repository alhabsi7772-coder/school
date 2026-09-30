"""Smoke test suite for imported school platform (Jan 2026 review).

Covers three sub-systems that were imported from GitHub:
  1. Quiz / Teacher portal   (/api/auth/login, /api/quizzes, /api/quiz/join)
  2. Substitution system     (/api/substitution/*)
  3. Grades system           (/api/grades/*)

Uses current credentials from /app/memory/test_credentials.md and .env.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

TEACHER_ADMIN = ("admin", "teacher123")
TEACHER_1     = ("teacher1", "khairat1")
SUB_ADMIN     = ("subadmin", "sub12345")
GRADES_ADMIN  = ("admin", "admin123")


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def teacher_admin_token():
    r = requests.post(f"{API}/auth/login",
                      json={"username": TEACHER_ADMIN[0], "password": TEACHER_ADMIN[1]},
                      timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def teacher_token():
    r = requests.post(f"{API}/auth/login",
                      json={"username": TEACHER_1[0], "password": TEACHER_1[1]},
                      timeout=15)
    if r.status_code != 200:
        pytest.skip(f"teacher1 login failed ({r.status_code}): {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def sub_token():
    r = requests.post(f"{API}/substitution/auth/login",
                      json={"username": SUB_ADMIN[0], "password": SUB_ADMIN[1]},
                      timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def grades_admin_token():
    r = requests.post(f"{API}/grades/auth/login",
                      json={"username": GRADES_ADMIN[0], "password": GRADES_ADMIN[1]},
                      timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ==================== Quiz platform ====================
class TestQuizPlatform:
    def test_login_admin(self, teacher_admin_token):
        assert isinstance(teacher_admin_token, str) and len(teacher_admin_token) > 0

    def test_profile(self, teacher_admin_token):
        r = requests.get(f"{API}/auth/profile", headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("role") == "admin"

    def test_app_settings(self, teacher_admin_token):
        r = requests.get(f"{API}/app-settings", headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_list_quizzes(self, teacher_admin_token):
        r = requests.get(f"{API}/quizzes", headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_create_activate_join_flow(self, teacher_admin_token):
        secret = f"T{uuid.uuid4().hex[:5]}"
        payload = {
            "title": f"TEST_Smoke_{uuid.uuid4().hex[:6]}",
            "description": "smoke",
            "settings": {"secret_code": secret, "show_results": True,
                         "home_exam": False, "randomize_questions": False},
        }
        r = requests.post(f"{API}/quizzes", json=payload,
                          headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        qid = r.json()["id"]

        try:
            # add question
            q = {"text": "1+1=", "type": "mcq",
                 "options": ["1", "2", "3"], "correct_answer": "2", "points": 1}
            r = requests.post(f"{API}/quizzes/{qid}/questions",
                              json=q, headers=_hdr(teacher_admin_token), timeout=15)
            assert r.status_code == 200, r.text

            # activate
            r = requests.post(f"{API}/quizzes/{qid}/activate",
                              headers=_hdr(teacher_admin_token), timeout=15)
            assert r.status_code == 200, r.text

            # public join info by code
            r = requests.get(f"{API}/quiz/join/{secret}", timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["id"] == qid

            # student joins
            r = requests.post(f"{API}/quiz/{qid}/join",
                              json={"student_name": f"TEST_stu_{uuid.uuid4().hex[:5]}",
                                    "grade": "10", "section": "1"},
                              timeout=15)
            assert r.status_code == 200, r.text
            assert r.json().get("submission_id")
        finally:
            requests.delete(f"{API}/quizzes/{qid}",
                            headers=_hdr(teacher_admin_token), timeout=15)

    def test_question_bank_meta(self, teacher_admin_token):
        r = requests.get(f"{API}/question-bank/meta",
                         headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_gradebooks_list(self, teacher_admin_token):
        r = requests.get(f"{API}/gradebooks",
                         headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_projects_list(self, teacher_admin_token):
        r = requests.get(f"{API}/projects",
                         headers=_hdr(teacher_admin_token), timeout=15)
        assert r.status_code == 200, r.text


# ==================== Substitution ====================
class TestSubstitution:
    def test_login(self, sub_token):
        assert sub_token

    def test_me(self, sub_token):
        r = requests.get(f"{API}/substitution/auth/me",
                         headers=_hdr(sub_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_settings(self, sub_token):
        r = requests.get(f"{API}/substitution/settings",
                         headers=_hdr(sub_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_teachers_list(self, sub_token):
        r = requests.get(f"{API}/substitution/teachers",
                         headers=_hdr(sub_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "teachers" in d and isinstance(d["teachers"], list)

    def test_supervision_get(self, sub_token):
        r = requests.get(f"{API}/substitution/supervision",
                         headers=_hdr(sub_token), timeout=15)
        assert r.status_code == 200, r.text


# ==================== Grades ====================
class TestGrades:
    def test_login(self, grades_admin_token):
        assert grades_admin_token

    def test_me(self, grades_admin_token):
        r = requests.get(f"{API}/grades/auth/me",
                         headers=_hdr(grades_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("role") == "admin"

    def test_status(self):
        r = requests.get(f"{API}/grades/status", timeout=15)
        assert r.status_code == 200, r.text

    def test_settings(self, grades_admin_token):
        r = requests.get(f"{API}/grades/settings",
                         headers=_hdr(grades_admin_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_teachers_list(self, grades_admin_token):
        r = requests.get(f"{API}/grades/teachers",
                         headers=_hdr(grades_admin_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_students_list(self, grades_admin_token):
        r = requests.get(f"{API}/grades/students",
                         headers=_hdr(grades_admin_token), timeout=15)
        assert r.status_code == 200, r.text
