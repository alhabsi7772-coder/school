"""
Backend regression tests for the new authentication, admin panel,
data isolation, app-settings, theme-related (none backend), and quiz/project
lifecycle features added in this iteration.

Run:
    pytest /app/backend/tests/test_auth_admin_isolation.py -v \
        --junitxml=/app/test_reports/pytest/pytest_auth_admin.xml
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://school-frontend-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"username": "admin", "password": "teacher123"}
T1 = {"username": "teacher1", "password": "khairat1"}
T2 = {"username": "teacher2", "password": "khairat2"}


# --------- shared session / fixtures ---------

def _login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=15)
    return r


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    r = _login(**ADMIN)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def teacher1_token():
    r = _login(**T1)
    assert r.status_code == 200, f"teacher1 login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def teacher2_token():
    r = _login(**T2)
    assert r.status_code == 200, f"teacher2 login failed: {r.status_code} {r.text}"
    return r.json()["token"]


# --------- Auth / login ---------

class TestLogin:
    def test_admin_login_returns_role_admin(self):
        r = _login(**ADMIN)
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "admin"
        assert body["username"] == "admin"
        assert isinstance(body["token"], str) and len(body["token"]) > 20

    def test_teacher_login_returns_role_teacher(self):
        r = _login(**T1)
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "teacher"
        assert body["username"] == "teacher1"

    def test_wrong_password_arabic_error(self):
        r = _login("teacher2", "wrong-password-xyz")
        assert r.status_code == 401
        detail = r.json().get("detail", "")
        # Arabic message
        assert "اسم المستخدم" in detail or "كلمة المرور" in detail

    def test_unknown_username_401(self):
        r = _login(f"ghost_{uuid.uuid4().hex[:6]}", "whatever")
        assert r.status_code == 401

    def test_failure_counter_clears_on_success(self):
        # 2 bad attempts then a good one — should NOT lock teacher2
        for _ in range(2):
            assert _login("teacher2", "bad-pass").status_code == 401
        ok = _login(**T2)
        assert ok.status_code == 200, f"teacher2 was locked or login failed: {ok.text}"


# --------- App settings (was previously broken) ---------

class TestAppSettings:
    def test_app_settings_public_no_auth(self):
        r = requests.get(f"{API}/app-settings", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "student_mode" in data
        assert data["student_mode"] in ("dark", "light")


# --------- Data isolation ---------

class TestIsolation:
    def test_teacher_quiz_not_visible_to_admin(self, admin_token, teacher1_token):
        title = f"TEST_ISO_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/quizzes", json={"title": title, "description": "iso"},
                          headers=_auth(teacher1_token), timeout=15)
        assert r.status_code == 200, r.text
        qid = r.json()["id"]

        # admin GET list — must NOT contain it
        r = requests.get(f"{API}/quizzes", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        admin_titles = [q["title"] for q in r.json()]
        assert title not in admin_titles

        # admin direct GET by id — 404
        r = requests.get(f"{API}/quizzes/{qid}", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 404

        # Cleanup
        requests.delete(f"{API}/quizzes/{qid}", headers=_auth(teacher1_token), timeout=15)

    def test_teacher_project_not_visible_to_admin(self, admin_token, teacher1_token):
        title = f"TEST_PRJ_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/projects", json={"title": title, "description": "iso"},
                          headers=_auth(teacher1_token), timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        r = requests.get(f"{API}/projects", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        admin_titles = [p["title"] for p in r.json()]
        assert title not in admin_titles

        requests.delete(f"{API}/projects/{pid}", headers=_auth(teacher1_token), timeout=15)

    def test_question_bank_isolation(self, admin_token, teacher1_token):
        r_admin = requests.get(f"{API}/question-bank", headers=_auth(admin_token), timeout=15)
        r_t1 = requests.get(f"{API}/question-bank", headers=_auth(teacher1_token), timeout=15)
        assert r_admin.status_code == 200
        assert r_t1.status_code == 200
        admin_ids = {q.get("id") for q in r_admin.json()}
        t1_ids = {q.get("id") for q in r_t1.json()}
        assert admin_ids.isdisjoint(t1_ids), "Question bank items leaking across owners"

    def test_teacher_cannot_call_admin_endpoint(self, teacher1_token):
        r = requests.get(f"{API}/admin/teachers", headers=_auth(teacher1_token), timeout=15)
        assert r.status_code == 403


# --------- Admin teacher CRUD ---------

class TestAdminTeacherCRUD:
    def test_list_returns_seed_teachers(self, admin_token):
        r = requests.get(f"{API}/admin/teachers", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        usernames = [t["username"] for t in r.json()]
        for u in ["admin", "teacher1", "teacher2", "teacher3"]:
            assert u in usernames, f"Missing seeded {u}"

    def test_create_login_disable_enable_delete_flow(self, admin_token):
        uname = f"test{uuid.uuid4().hex[:6]}"
        pwd = "secret123"
        # CREATE
        r = requests.post(f"{API}/admin/teachers",
                          json={"username": uname, "password": pwd, "teacher_name": "اختبار"},
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        new_id = body["id"]
        assert body["username"] == uname
        assert body["role"] == "teacher"
        assert body["is_active"] is True
        assert "password_hash" not in body
        assert body["quiz_count"] == 0

        try:
            # LOGIN as new teacher
            r = _login(uname, pwd)
            assert r.status_code == 200, r.text

            # RESET PASSWORD
            new_pwd = "newpass456"
            r = requests.put(f"{API}/admin/teachers/{new_id}",
                             json={"new_password": new_pwd, "teacher_name": "اختبار محدّث"},
                             headers=_auth(admin_token), timeout=15)
            assert r.status_code == 200
            # Old password fails
            assert _login(uname, pwd).status_code == 401
            # New password works
            assert _login(uname, new_pwd).status_code == 200

            # DISABLE
            r = requests.put(f"{API}/admin/teachers/{new_id}",
                             json={"is_active": False},
                             headers=_auth(admin_token), timeout=15)
            assert r.status_code == 200
            r = _login(uname, new_pwd)
            assert r.status_code == 403
            assert "تم تعطيل" in r.json().get("detail", "")

            # RE-ENABLE
            r = requests.put(f"{API}/admin/teachers/{new_id}",
                             json={"is_active": True},
                             headers=_auth(admin_token), timeout=15)
            assert r.status_code == 200
            assert _login(uname, new_pwd).status_code == 200
        finally:
            # DELETE
            r = requests.delete(f"{API}/admin/teachers/{new_id}",
                                headers=_auth(admin_token), timeout=15)
            assert r.status_code == 200
            # Confirm deletion: login fails (account gone)
            assert _login(uname, "newpass456").status_code == 401

    def test_duplicate_username_rejected(self, admin_token):
        r = requests.post(f"{API}/admin/teachers",
                          json={"username": "teacher1", "password": "anyvalid", "teacher_name": "x"},
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400
        assert "موجود" in r.json().get("detail", "")

    def test_arabic_username_rejected(self, admin_token):
        r = requests.post(f"{API}/admin/teachers",
                          json={"username": "معلم", "password": "secret123", "teacher_name": "x"},
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400

    def test_short_password_rejected(self, admin_token):
        r = requests.post(f"{API}/admin/teachers",
                          json={"username": f"u{uuid.uuid4().hex[:5]}", "password": "12", "teacher_name": "x"},
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400

    def test_admin_cannot_be_disabled_or_deleted(self, admin_token):
        # Find admin id
        r = requests.get(f"{API}/admin/teachers", headers=_auth(admin_token), timeout=15)
        admin_doc = next(t for t in r.json() if t["username"] == "admin")
        admin_id = admin_doc["id"]

        r = requests.put(f"{API}/admin/teachers/{admin_id}",
                         json={"is_active": False},
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400

        r = requests.delete(f"{API}/admin/teachers/{admin_id}",
                            headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400


# --------- Profile isolation per account ---------

class TestProfileIsolation:
    def test_teacher_profile_update_does_not_affect_admin(self, admin_token, teacher1_token):
        # snapshot admin
        r_admin_before = requests.get(f"{API}/auth/profile", headers=_auth(admin_token), timeout=10)
        assert r_admin_before.status_code == 200
        admin_name_before = r_admin_before.json().get("teacher_name")

        new_name = f"T1_NAME_{uuid.uuid4().hex[:5]}"
        r = requests.put(f"{API}/auth/profile", json={"teacher_name": new_name},
                         headers=_auth(teacher1_token), timeout=10)
        assert r.status_code == 200

        # Verify teacher1
        r_t1 = requests.get(f"{API}/auth/profile", headers=_auth(teacher1_token), timeout=10)
        assert r_t1.status_code == 200
        assert r_t1.json()["teacher_name"] == new_name

        # Verify admin unchanged
        r_admin_after = requests.get(f"{API}/auth/profile", headers=_auth(admin_token), timeout=10)
        assert r_admin_after.json().get("teacher_name") == admin_name_before


# --------- Quiz full lifecycle regression for a teacher ---------

class TestQuizLifecycle:
    def test_quiz_full_flow(self, teacher1_token):
        # create
        r = requests.post(f"{API}/quizzes",
                          json={"title": f"TEST_LIFE_{uuid.uuid4().hex[:6]}", "description": "regression",
                                "settings": {"secret_code": "LIFE99", "show_results": True,
                                             "randomize_questions": False, "home_exam": False}},
                          headers=_auth(teacher1_token), timeout=15)
        assert r.status_code == 200, r.text
        qid = r.json()["id"]

        try:
            # add a question
            r = requests.post(f"{API}/quizzes/{qid}/questions",
                              json={"type": "mcq", "text": "2+2=?",
                                    "options": ["1", "2", "3", "4"], "correct_answer": "4", "points": 1.0},
                              headers=_auth(teacher1_token), timeout=15)
            assert r.status_code == 200, r.text

            # activate + start
            for ep in ["activate", "start"]:
                r = requests.post(f"{API}/quizzes/{qid}/{ep}",
                                  headers=_auth(teacher1_token), timeout=15)
                assert r.status_code == 200, f"{ep}: {r.text}"

            # Get the access code
            r = requests.get(f"{API}/quizzes/{qid}", headers=_auth(teacher1_token), timeout=15)
            assert r.status_code == 200
            qdoc = r.json()
            code = qdoc.get("access_code") or qdoc.get("settings", {}).get("secret_code") or "LIFE99"

            # Student joins via code lookup (public)
            r = requests.get(f"{API}/quiz/join/{code}", timeout=15)
            assert r.status_code == 200, r.text
            assert r.json().get("id") == qid or r.json().get("quiz_id") == qid

            # Student creates a submission
            r = requests.post(f"{API}/quiz/{qid}/join",
                              json={"student_name": "TEST Student", "grade": "12", "section": "A"},
                              timeout=15)
            assert r.status_code == 200, r.text
            sub_id = r.json()["submission_id"]

            # Student fetches questions
            r = requests.get(f"{API}/quiz/{qid}/questions/{sub_id}", timeout=15)
            assert r.status_code == 200
            questions = r.json().get("questions") or r.json()
            assert len(questions) >= 1
            qq_id = questions[0]["id"]

            # Student submits
            r = requests.post(f"{API}/quiz/{qid}/submit/{sub_id}",
                              json={"answers": [{"question_id": qq_id, "answer_text": "4"}]},
                              timeout=15)
            assert r.status_code == 200

            # Teacher results
            r = requests.get(f"{API}/quizzes/{qid}/results", headers=_auth(teacher1_token), timeout=15)
            assert r.status_code == 200
            results = r.json()
            # endpoint returns either a list or {quiz, stats, submissions}
            subs = results.get("submissions") if isinstance(results, dict) else results
            assert isinstance(subs, list) and len(subs) >= 1

            # close + reset
            for ep in ["close", "reset"]:
                r = requests.post(f"{API}/quizzes/{qid}/{ep}",
                                  headers=_auth(teacher1_token), timeout=15)
                assert r.status_code == 200, f"{ep}: {r.text}"
        finally:
            requests.delete(f"{API}/quizzes/{qid}", headers=_auth(teacher1_token), timeout=15)


# --------- Project lifecycle regression ---------

class TestProjectLifecycle:
    def test_project_create_submit_view(self, teacher1_token):
        r = requests.post(f"{API}/projects",
                          json={"title": f"TEST_PRJ_{uuid.uuid4().hex[:6]}", "description": "regression"},
                          headers=_auth(teacher1_token), timeout=15)
        assert r.status_code == 200, r.text
        prj = r.json()
        pid = prj["id"]
        code = prj.get("access_code") or prj.get("code")
        assert code, f"Project did not return an access code: {prj}"

        try:
            # public info
            r = requests.get(f"{API}/project/{code}/info", timeout=15)
            assert r.status_code == 200

            # public submit
            tiny = "VGVzdCBmaWxl"  # base64("Test file")
            r = requests.post(f"{API}/project/{code}/submit",
                              json={"student_name": "TEST_S", "grade": "12", "section": "A",
                                    "files": [{"filename": "a.txt", "content_type": "text/plain",
                                               "data_base64": tiny, "size_bytes": 9}]},
                              timeout=20)
            assert r.status_code == 200, r.text

            # teacher sees submissions
            r = requests.get(f"{API}/projects/{pid}/submissions",
                             headers=_auth(teacher1_token), timeout=15)
            assert r.status_code == 200
            assert len(r.json()) >= 1
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=_auth(teacher1_token), timeout=15)
