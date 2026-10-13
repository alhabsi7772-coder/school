"""Tests for review iteration 25 — grades parent_closed, grade_subject_max, project allow_link."""
import os
import re
import time
import pytest
import requests

def _load_frontend_env():
    try:
        for ln in open('/app/frontend/.env'):
            if ln.startswith('REACT_APP_BACKEND_URL='):
                return ln.split('=', 1)[1].strip()
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or _load_frontend_env() or '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"


# ---------- Grades admin / parent ----------
@pytest.fixture(scope="module")
def grades_admin_token():
    r = requests.post(f"{API}/grades/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def grades_hdr(grades_admin_token):
    return {"Authorization": f"Bearer {grades_admin_token}"}


class TestGradesParentClosed:
    def test_toggle_parent_closed_and_public_status(self, grades_hdr):
        # Open settings read
        s = requests.get(f"{API}/grades/settings", headers=grades_hdr).json()
        initial = bool(s.get("parent_closed"))

        # Close parent
        r = requests.put(f"{API}/grades/settings", json={"parent_closed": True}, headers=grades_hdr)
        assert r.status_code == 200
        assert r.json()["parent_closed"] is True

        # Public status reflects it
        st = requests.get(f"{API}/grades/status").json()
        assert st["parent_closed"] is True

        # Parent results blocked
        rr = requests.get(f"{API}/grades/parent/results", params={"civil_number": "12345678"})
        assert rr.status_code == 403
        assert "مغلق" in rr.text

        # Reopen
        r2 = requests.put(f"{API}/grades/settings", json={"parent_closed": False}, headers=grades_hdr)
        assert r2.status_code == 200
        assert r2.json()["parent_closed"] is False
        assert requests.get(f"{API}/grades/status").json()["parent_closed"] is False

        # Restore to initial if it was True (shouldn't be, but safety)
        if initial:
            requests.put(f"{API}/grades/settings", json={"parent_closed": True}, headers=grades_hdr)


class TestGradeSubjectMax:
    def test_per_grade_max_persists_and_isolated(self, grades_hdr):
        # Save السابع / الرياضيات = 15/5
        payload = {"grade_subject_max": {"السابع": {"الرياضيات": {"quiz1": 15, "quiz2": 5}}}}
        r = requests.put(f"{API}/grades/settings", json=payload, headers=grades_hdr)
        assert r.status_code == 200
        gsm = r.json().get("grade_subject_max") or {}
        assert gsm["السابع"]["الرياضيات"]["quiz1"] == 15
        assert gsm["السابع"]["الرياضيات"]["quiz2"] == 5
        # Other grades for Math remain default (10/10)
        assert gsm["السادس"]["الرياضيات"]["quiz1"] == 10
        assert gsm["السادس"]["الرياضيات"]["quiz2"] == 10

        # Re-read via GET
        s = requests.get(f"{API}/grades/settings", headers=grades_hdr).json()
        gsm2 = s["grade_subject_max"]
        assert gsm2["السابع"]["الرياضيات"] == {"quiz1": 15.0, "quiz2": 5.0}
        assert gsm2["الخامس"]["الرياضيات"]["quiz1"] == 10

        # Restore السابع الرياضيات to 10/10
        r3 = requests.put(f"{API}/grades/settings",
                          json={"grade_subject_max": {"السابع": {"الرياضيات": {"quiz1": 10, "quiz2": 10}}}},
                          headers=grades_hdr)
        assert r3.status_code == 200
        assert r3.json()["grade_subject_max"]["السابع"]["الرياضيات"]["quiz1"] == 10


# ---------- Projects: allow_link ----------
@pytest.fixture(scope="module")
def teacher_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="module")
def t_hdr(teacher_token):
    return {"Authorization": f"Bearer {teacher_token}"}


class TestProjectAllowLink:
    created_ids = []

    def test_create_without_allow_link(self, t_hdr):
        r = requests.post(f"{API}/projects",
                          json={"title": "TEST_proj_no_link", "description": "d"},
                          headers=t_hdr)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p.get("allow_link") is False
        assert p.get("code")
        TestProjectAllowLink.created_ids.append(p["id"])

        # Info has allow_link false
        info = requests.get(f"{API}/project/{p['code']}/info").json()
        assert info.get("allow_link") is False

        # Submit without files or link -> 400
        r2 = requests.post(f"{API}/project/{p['code']}/submit",
                           json={"student_name": "s", "grade": "السابع", "section": "1",
                                 "files": [], "link": "https://example.com"})
        assert r2.status_code == 400  # link ignored, no files

    def test_create_with_allow_link_and_submit_variants(self, t_hdr):
        r = requests.post(f"{API}/projects",
                          json={"title": "TEST_proj_link", "allow_link": True},
                          headers=t_hdr)
        assert r.status_code == 200
        p = r.json()
        assert p["allow_link"] is True
        TestProjectAllowLink.created_ids.append(p["id"])
        code = p["code"]

        info = requests.get(f"{API}/project/{code}/info").json()
        assert info["allow_link"] is True

        # Submit only with link
        r1 = requests.post(f"{API}/project/{code}/submit",
                           json={"student_name": "TEST s1", "grade": "السابع", "section": "1",
                                 "files": [], "link": "https://github.com/test"})
        assert r1.status_code == 200, r1.text

        # Submit with only files (tiny base64)
        r2 = requests.post(f"{API}/project/{code}/submit",
                           json={"student_name": "TEST s2", "grade": "السابع", "section": "1",
                                 "files": [{"filename": "a.txt", "content_type": "text/plain",
                                            "data_base64": "aGVsbG8=", "size_bytes": 5}],
                                 "link": ""})
        assert r2.status_code == 200

        # Submit with neither -> 400
        r3 = requests.post(f"{API}/project/{code}/submit",
                           json={"student_name": "x", "grade": "السابع", "section": "1",
                                 "files": [], "link": ""})
        assert r3.status_code == 400

        # Invalid link
        r4 = requests.post(f"{API}/project/{code}/submit",
                           json={"student_name": "x", "grade": "السابع", "section": "1",
                                 "files": [], "link": "not-a-url"})
        assert r4.status_code == 400

        # Teacher sees submissions with link item
        subs = requests.get(f"{API}/projects/{p['id']}/submissions", headers=t_hdr).json()
        assert "submissions" in subs
        links = [s for s in subs["submissions"] if s.get("link")]
        assert any(s["link"] == "https://github.com/test" for s in links)

    def test_cleanup(self, t_hdr):
        for pid in TestProjectAllowLink.created_ids:
            requests.delete(f"{API}/projects/{pid}", headers=t_hdr)


# ---------- /api/grades/my/scores returns quiz*_max per grade ----------
class TestMyScoresMax:
    def test_my_scores_returns_quiz_max(self, grades_hdr):
        # Admin can call my/scores (any grade/section/subject/semester)
        r = requests.get(f"{API}/grades/my/scores",
                         params={"grade": "السابع", "section": "1", "subject": "الرياضيات", "semester": "1"},
                         headers=grades_hdr)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "quiz1_max" in d and "quiz2_max" in d
        # Default (we restored to 10)
        assert d["quiz1_max"] == 10.0
        assert d["quiz2_max"] == 10.0
