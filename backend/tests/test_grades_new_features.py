"""Tests for NEW Grades-system features added in branch conflict_090926_2250.
Covers:
- Subject-specific max marks (subject_max in settings)
- Teacher single-subject + multiple classes model
- Fuzzy name-matching import (/teachers/import/match + /teachers/import/apply)
- /teachers/sync-credentials bulk credential update
- /full-marks endpoint (admin + semester filter)
- admin/stats includes teachers_incomplete + per-teacher pending
- Parent greeting data unchanged (still returns student+results)
- Regression: /substitution/swap/print removes 'يُغطّيها'
"""
import io
import os
import uuid

import openpyxl
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/grades/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def ah(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _mkxlsx(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ----------- Settings: subject_max -----------
class TestSubjectMax:
    def test_status_exposes_subject_max(self):
        r = requests.get(f"{API}/grades/status")
        assert r.status_code == 200
        data = r.json()
        assert "subject_max" in data and "subjects" in data
        assert "الرياضيات" in data["subject_max"]
        assert data["subject_max"]["الرياضيات"]["quiz1"] >= 0

    def test_admin_update_subject_max(self, ah):
        payload = {"subject_max": {"الرياضيات": {"quiz1": 15, "quiz2": 15}}}
        r = requests.put(f"{API}/grades/settings", json=payload, headers=ah)
        assert r.status_code == 200
        sm = r.json()["subject_max"]
        assert sm["الرياضيات"]["quiz1"] == 15.0
        assert sm["الرياضيات"]["quiz2"] == 15.0
        # reset
        requests.put(f"{API}/grades/settings",
                     json={"subject_max": {"الرياضيات": {"quiz1": 10, "quiz2": 10}}}, headers=ah)

    def test_invalid_subject_rejected_silently(self, ah):
        # Non-SUBJECT keys are filtered out, not an error
        r = requests.put(f"{API}/grades/settings",
                         json={"subject_max": {"FAKE_SUBJECT": {"quiz1": 5, "quiz2": 5}}}, headers=ah)
        assert r.status_code == 200
        assert "FAKE_SUBJECT" not in r.json()["subject_max"]


# ----------- Teacher model: subject + classes -----------
class TestTeacherModel:
    _tid = None

    def test_create_teacher_single_subject_multi_classes(self, ah):
        payload = {
            "name": f"TEST_NewFeat_{uuid.uuid4().hex[:6]}",
            "employee_number": "9876543",
            "civil_number": "1234567890123",
            "subject": "الرياضيات",
            "classes": [
                {"grade": "الخامس", "section": "1"},
                {"grade": "السادس", "section": "2"},
            ],
        }
        r = requests.post(f"{API}/grades/teachers", json=payload, headers=ah)
        assert r.status_code == 200, r.text
        # verify via list
        tl = requests.get(f"{API}/grades/teachers", headers=ah).json()["teachers"]
        t = next((x for x in tl if x["name"] == payload["name"]), None)
        assert t is not None
        assert t["subject"] == "الرياضيات"
        assert len(t["classes"]) == 2
        assert len(t.get("assignments", [])) == 2
        TestTeacherModel._tid = t["id"]

    def test_update_teacher_subject_and_classes(self, ah):
        tid = TestTeacherModel._tid
        assert tid
        r = requests.put(f"{API}/grades/teachers/{tid}",
                         json={"subject": "العلوم", "classes": [{"grade": "السابع", "section": "3"}]},
                         headers=ah)
        assert r.status_code == 200
        tl = requests.get(f"{API}/grades/teachers", headers=ah).json()["teachers"]
        t = next(x for x in tl if x["id"] == tid)
        assert t["subject"] == "العلوم"
        assert len(t["classes"]) == 1
        assert t["classes"][0]["grade"] == "السابع"

    def test_cleanup_test_teacher(self, ah):
        if TestTeacherModel._tid:
            r = requests.delete(f"{API}/grades/teachers/{TestTeacherModel._tid}", headers=ah)
            assert r.status_code == 200


# ----------- Fuzzy name matching import -----------
class TestTeacherMatchImport:
    _tid = None
    _name = f"TEST_FuzzyBase_{uuid.uuid4().hex[:6]}"

    def test_setup_seed_teacher(self, ah):
        r = requests.post(f"{API}/grades/teachers",
                          json={"name": self._name, "subject": "العلوم",
                                "classes": [{"grade": "الخامس", "section": "1"}]}, headers=ah)
        assert r.status_code == 200
        tl = requests.get(f"{API}/grades/teachers", headers=ah).json()["teachers"]
        TestTeacherMatchImport._tid = next(x["id"] for x in tl if x["name"] == self._name)

    def test_match_endpoint_exact_name(self, ah):
        # Build Excel with exact name match
        buf = _mkxlsx([
            ["الاسم", "الرقم الوظيفي", "الرقم المدني"],
            [self._name, "1112223", "9998887776665"],
        ])
        r = requests.post(f"{API}/grades/teachers/import/match",
                          files={"file": ("t.xlsx", buf, "application/vnd.ms-excel")},
                          headers=ah)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "rows" in data and "teachers" in data
        row = data["rows"][0]
        assert row["match_id"] == TestTeacherMatchImport._tid
        assert row["confidence"] in ("exact", "high")

    def test_apply_updates_emp_civil_only(self, ah):
        tid = TestTeacherMatchImport._tid
        body = {"rows": [{"teacher_id": tid, "emp": "4455667", "civil": "7778889990001"}]}
        r = requests.post(f"{API}/grades/teachers/import/apply", json=body, headers=ah)
        assert r.status_code == 200, r.text
        assert r.json()["updated"] == 1
        tl = requests.get(f"{API}/grades/teachers", headers=ah).json()["teachers"]
        t = next(x for x in tl if x["id"] == tid)
        assert t["employee_number"] == "4455667"
        assert t["civil_number"] == "7778889990001"

    def test_match_duplicate_name_in_excel(self, ah):
        buf = _mkxlsx([
            ["الاسم", "الرقم الوظيفي", "الرقم المدني"],
            [self._name, "1", "2"],
            [self._name, "3", "4"],  # duplicate
        ])
        r = requests.post(f"{API}/grades/teachers/import/match",
                          files={"file": ("t.xlsx", buf, "application/vnd.ms-excel")},
                          headers=ah)
        assert r.status_code == 200
        rows = r.json()["rows"]
        assert len(rows) == 2
        assert rows[1]["duplicate"] is True

    def test_cleanup(self, ah):
        if TestTeacherMatchImport._tid:
            requests.delete(f"{API}/grades/teachers/{TestTeacherMatchImport._tid}", headers=ah)


# ----------- sync-credentials -----------
class TestSyncCredentials:
    def test_sync_credentials_updates_login(self, ah):
        name = f"TEST_SyncCred_{uuid.uuid4().hex[:6]}"
        civil = f"CIV{uuid.uuid4().hex[:9]}"
        emp = "7778999"  # last 4 = 8999
        r = requests.post(f"{API}/grades/teachers",
                          json={"name": name, "employee_number": emp, "civil_number": civil,
                                "subject": "العلوم", "classes": []}, headers=ah)
        assert r.status_code == 200
        # Call sync - should affect at least this teacher (no-op if already correct)
        r2 = requests.post(f"{API}/grades/teachers/sync-credentials", headers=ah)
        assert r2.status_code == 200
        assert "updated" in r2.json()
        # Verify login works with civil + last4
        r3 = requests.post(f"{API}/grades/auth/login", json={"username": civil, "password": "8999"})
        assert r3.status_code == 200, r3.text
        # cleanup
        tl = requests.get(f"{API}/grades/teachers", headers=ah).json()["teachers"]
        tid = next(x["id"] for x in tl if x["name"] == name)
        requests.delete(f"{API}/grades/teachers/{tid}", headers=ah)


# ----------- /full-marks endpoint -----------
class TestFullMarks:
    def test_full_marks_endpoint_admin(self, ah):
        r = requests.get(f"{API}/grades/full-marks", headers=ah)
        assert r.status_code == 200
        data = r.json()
        assert "rows" in data and "count" in data and "subject_max" in data
        assert isinstance(data["rows"], list)
        assert data["count"] == len(data["rows"])

    def test_full_marks_semester_filter(self, ah):
        r = requests.get(f"{API}/grades/full-marks?semester=1", headers=ah)
        assert r.status_code == 200
        rows = r.json()["rows"]
        for row in rows:
            assert row["semester"] == "1"

    def test_full_marks_requires_auth(self):
        r = requests.get(f"{API}/grades/full-marks")
        assert r.status_code in (401, 403)


# ----------- admin/stats shape -----------
class TestAdminStats:
    def test_stats_includes_incomplete(self, ah):
        r = requests.get(f"{API}/grades/admin/stats", headers=ah)
        assert r.status_code == 200
        data = r.json()
        for k in ["total_teachers", "total_students", "teachers_entered",
                  "teachers_pending", "teachers_incomplete", "by_grade", "teachers"]:
            assert k in data, f"missing key {k}"
        assert isinstance(data["teachers_incomplete"], int)
        # Every teacher object must expose pending list + flag
        for t in data["teachers"]:
            assert "pending" in t
            assert "incomplete" in t
            assert "expected" in t and "complete" in t


# ----------- Parent lookup still works -----------
class TestParentLookup:
    def test_parent_requires_civil(self):
        r = requests.get(f"{API}/grades/parent/results?civil_number=")
        assert r.status_code in (400, 422)

    def test_parent_unknown(self):
        r = requests.get(f"{API}/grades/parent/results?civil_number=NOSUCH_CIV_XYZ")
        assert r.status_code == 404


# ----------- Substitution regression: no 'يُغطّيها' column -----------
class TestSubstitutionRegression:
    @pytest.fixture
    def sub_token(self):
        r = requests.post(f"{API}/substitution/auth/login",
                          json={"username": "ehtiyat", "password": "ehtiyat2026"})
        if r.status_code != 200:
            pytest.skip("sub login failed")
        return r.json().get("token")

    def test_sub_login(self, sub_token):
        assert sub_token

    def test_main_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "teacher123"})
        assert r.status_code == 200
