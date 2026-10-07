"""Tests for hidden-unicode sanitization in Grades System (iteration 24).

Covers:
- Students bulk import strips \u200f/\u200b/\ufeff from name & civil_number
- Teachers import preview+commit strip hidden unicode marks
- Manual add/update student & teacher sanitize civil/employee numbers
- Parent lookup by civil number works even when user types the "clean" civil num
"""
import io
import os
import re
import uuid

import openpyxl
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
INVIS_RE = re.compile(r"[\u200b-\u200f\u202a-\u202e\ufeff]")


def _make_xlsx(headers, rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/grades/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def unique_suffix():
    return uuid.uuid4().hex[:6]


created_student_ids = []
created_teacher_ids = []


def test_student_bulk_import_strips_hidden_unicode(headers, unique_suffix):
    civil_clean = f"28{unique_suffix}01234"
    name_clean = f"TEST_طالب_{unique_suffix}"
    # Wrap with RTL marks + ZWSP + BOM
    name_dirty = f"\u200f{name_clean}\u200e"
    civil_dirty = f"\ufeff\u200f{civil_clean}\u200b"
    xlsx = _make_xlsx(
        ["اسم الطالب", "الصف", "الشعبة", "الرقم المدني"],
        [[name_dirty, "الخامس", "1", civil_dirty]],
    )
    files = {"file": ("students.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/grades/students/import", headers=headers, files=files, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("added", 0) + body.get("updated", 0) >= 1

    # Verify persisted record is clean
    lst = requests.get(f"{API}/grades/students?grade=الخامس&section=1", headers=headers, timeout=15).json()["students"]
    match = [s for s in lst if s["civil_number"] == civil_clean]
    assert match, f"Student with clean civil {civil_clean} not found. names={[s['name'] for s in lst]}"
    s = match[0]
    assert s["name"] == name_clean, f"Name not sanitized: {repr(s['name'])}"
    assert not INVIS_RE.search(s["name"])
    assert not INVIS_RE.search(s["civil_number"])
    created_student_ids.append(s["id"])


def test_parent_lookup_with_clean_civil_number(unique_suffix):
    civil_clean = f"28{unique_suffix}01234"
    r = requests.get(f"{API}/grades/parent/results", params={"civil_number": civil_clean}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["student"]["civil_number"] == civil_clean


def test_parent_lookup_with_dirty_input_still_finds(unique_suffix):
    """User might paste a civil with hidden chars — endpoint sanitizes query too."""
    civil_clean = f"28{unique_suffix}01234"
    dirty = f"\u200f{civil_clean}\ufeff"
    r = requests.get(f"{API}/grades/parent/results", params={"civil_number": dirty}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["student"]["civil_number"] == civil_clean


def test_teachers_import_preview_and_commit_sanitize(headers, unique_suffix):
    name = f"TEST_معلم_{unique_suffix}"
    emp = f"EMP{unique_suffix}"
    civil = f"29{unique_suffix}99999"
    xlsx = _make_xlsx(
        ["الاسم", "الرقم الوظيفي", "الرقم المدني"],
        [[f"\u200f{name}\u200e", f"\u200f{emp}", f"\ufeff{civil}\u200b"]],
    )
    files = {"file": ("teachers.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    # Preview
    r = requests.post(f"{API}/grades/teachers/import/preview", headers=headers, files=files, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    sample = body["sample_rows"][0]
    for cell in sample:
        assert not INVIS_RE.search(cell), f"preview sample still has hidden chars: {repr(cell)}"

    # Commit (the actual import endpoint)
    files = {"file": ("teachers.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/grades/teachers/import", headers=headers, files=files, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("added", 0) + r.json().get("updated", 0) >= 1

    # Verify teacher saved clean
    teachers = requests.get(f"{API}/grades/teachers", headers=headers, timeout=15).json()["teachers"]
    t = next((x for x in teachers if x["name"] == name), None)
    assert t, f"Teacher {name} not found"
    assert t["employee_number"] == emp
    assert t["civil_number"] == civil
    assert not INVIS_RE.search(t["username"])
    created_teacher_ids.append(t["id"])

    # Teacher login with civil number as username
    pw = emp[-4:] if sum(c.isdigit() for c in emp) >= 4 else "123456"
    # emp is EMP{6hex} -> digits count = depends; let's compute based on code logic
    digits = "".join(c for c in emp if c.isdigit())
    expected_pw = digits[-4:] if len(digits) >= 4 else "123456"
    login = requests.post(f"{API}/grades/auth/login",
                         json={"username": civil, "password": expected_pw}, timeout=15)
    assert login.status_code == 200, f"Teacher login failed: {login.text}"


def test_manual_add_student_sanitizes(headers, unique_suffix):
    civil = f"30{unique_suffix}11111"
    # The manual add goes through Pydantic StudentCreate; user types clean,
    # but endpoint still calls cell_str() for safety. Test with dirty input.
    dirty = f"\u200f{civil}\ufeff"
    r = requests.post(f"{API}/grades/students", headers=headers,
                     json={"name": f"TEST_manual_{unique_suffix}", "grade": "السادس", "section": "2",
                           "civil_number": dirty}, timeout=15)
    assert r.status_code == 200, r.text
    # Parent lookup with clean value should work
    r = requests.get(f"{API}/grades/parent/results", params={"civil_number": civil}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["student"]["civil_number"] == civil
    # Capture id
    lst = requests.get(f"{API}/grades/students?grade=السادس&section=2", headers=headers, timeout=15).json()["students"]
    sid = next(s["id"] for s in lst if s["civil_number"] == civil)
    created_student_ids.append(sid)


def test_edit_student_civil_number_sanitizes(headers, unique_suffix):
    assert created_student_ids, "Need student from previous test"
    sid = created_student_ids[-1]
    new_civil = f"31{unique_suffix}22222"
    r = requests.put(f"{API}/grades/students/{sid}", headers=headers,
                    json={"civil_number": f"\u200f{new_civil}\u200e"}, timeout=15)
    assert r.status_code == 200, r.text
    r = requests.get(f"{API}/grades/parent/results", params={"civil_number": new_civil}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["student"]["civil_number"] == new_civil


def test_teacher_login_regression(headers):
    """Admin login still works (regression)."""
    r = requests.post(f"{API}/grades/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200


def test_cleanup(headers):
    """Delete test-created teachers and students."""
    for sid in created_student_ids:
        requests.delete(f"{API}/grades/students/{sid}", headers=headers, timeout=15)
    for tid in created_teacher_ids:
        requests.delete(f"{API}/grades/teachers/{tid}", headers=headers, timeout=15)
