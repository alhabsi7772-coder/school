"""Tests for grades teachers refactor: subject/classes, import-sub idempotency, excel matching, edit."""
import io
import os
import pytest
import requests
import openpyxl

def _load_frontend_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("REACT_APP_BACKEND_URL")

BASE_URL = _load_frontend_env().rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/grades/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def created_ids():
    # collect ids of TEST_ teachers/students to cleanup at module end
    ids = {"teachers": [], "students": []}
    yield ids
    for tid in ids["teachers"]:
        try:
            requests.delete(f"{API}/grades/teachers/{tid}", headers={"Authorization": f"Bearer {ids['token']}"})
        except Exception:
            pass


def test_list_teachers_has_subject_and_classes(headers):
    r = requests.get(f"{API}/grades/teachers", headers=headers)
    assert r.status_code == 200
    teachers = r.json()["teachers"]
    assert len(teachers) >= 49, f"Expected >=49 imported teachers, got {len(teachers)}"
    t = teachers[0]
    assert "subject" in t and "classes" in t
    # assignments should be derived from subject x classes
    assert "assignments" in t


def test_import_substitution_idempotent(headers):
    r1 = requests.post(f"{API}/grades/teachers/import-substitution", headers=headers)
    assert r1.status_code == 200
    data1 = r1.json()
    # second run
    r2 = requests.post(f"{API}/grades/teachers/import-substitution", headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    # second run should add 0
    assert data2["added"] == 0, f"Duplicate created on rerun: {data2}"
    assert data2["updated"] >= 1


def _make_xlsx(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["الاسم", "الرقم الوظيفي", "الرقم المدني"])
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def test_excel_import_matches_by_name_no_duplicates(headers, admin_token, created_ids):
    created_ids["token"] = admin_token
    # get an existing teacher
    teachers = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    existing_name = teachers[0]["name"]
    # Vary Arabic: replace ا with أ, add extra space
    varied = existing_name.replace("ا", "أ", 1) + "  "
    unique_name = "TEST_معلم_وحيد_للاختبار"
    dup_name = unique_name  # duplicate within file
    xlsx = _make_xlsx([
        [varied, "EMP_TEST_001", "CIVIL_TEST_001"],  # should match existing -> update
        [unique_name, "EMP_TEST_002", "CIVIL_TEST_002"],  # new
        [dup_name, "EMP_TEST_003", "CIVIL_TEST_003"],  # duplicate in file -> skipped
    ])
    r = requests.post(f"{API}/grades/teachers/import",
                      headers=headers,
                      files={"file": ("test.xlsx", xlsx, "application/octet-stream")})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["added"] == 1, f"expected 1 added, got {data}"
    assert data["updated"] == 1, f"expected 1 updated, got {data}"
    assert data["skipped"] == 1, f"expected 1 skipped (duplicate in file), got {data}"

    # verify update persisted (employee_number set on existing)
    teachers_after = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    match = next((t for t in teachers_after if t["name"] == existing_name), None)
    assert match is not None
    assert match.get("employee_number") == "EMP_TEST_001"

    # collect created test teacher for cleanup
    new_t = next((t for t in teachers_after if t["name"] == unique_name), None)
    assert new_t is not None
    created_ids["teachers"].append(new_t["id"])


def test_update_teacher_subject_classes_rebuilds_assignments(headers, created_ids):
    tid = created_ids["teachers"][0]
    payload = {
        "subject": "الرياضيات",
        "classes": [{"grade": "الخامس", "section": "1"}, {"grade": "السادس", "section": "2"}],
    }
    r = requests.put(f"{API}/grades/teachers/{tid}", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    # verify
    teachers = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    t = next(x for x in teachers if x["id"] == tid)
    assert t["subject"] == "الرياضيات"
    assert len(t["classes"]) == 2
    assert len(t["assignments"]) == 2
    assert all(a["subject"] == "الرياضيات" for a in t["assignments"])


def test_update_teacher_duplicate_name_rejected(headers, created_ids):
    tid = created_ids["teachers"][0]
    # try to rename to an existing teacher name
    teachers = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    other = next(t for t in teachers if t["id"] != tid)
    r = requests.put(f"{API}/grades/teachers/{tid}", headers=headers, json={"name": other["name"]})
    assert r.status_code == 400
    assert "يوجد معلم" in r.json().get("detail", "")


def test_add_teacher_duplicate_rejected(headers, created_ids):
    teachers = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    existing_name = teachers[0]["name"]
    r = requests.post(f"{API}/grades/teachers", headers=headers,
                      json={"name": existing_name, "subject": "العلوم", "classes": []})
    assert r.status_code == 400


def test_add_teacher_success_and_login(headers, created_ids):
    payload = {
        "name": "TEST_معلم_تجريبي_٢",
        "employee_number": "TEST_EMP_9999",
        "subject": "العلوم",
        "classes": [{"grade": "السابع", "section": "3"}],
    }
    r = requests.post(f"{API}/grades/teachers", headers=headers, json=payload)
    assert r.status_code == 200
    # find new teacher
    teachers = requests.get(f"{API}/grades/teachers", headers=headers).json()["teachers"]
    new_t = next((t for t in teachers if t["name"] == payload["name"]), None)
    assert new_t is not None
    created_ids["teachers"].append(new_t["id"])
    # login as new teacher
    login = requests.post(f"{API}/grades/auth/login",
                         json={"username": "TEST_EMP_9999", "password": "123456"})
    assert login.status_code == 200, login.text
    tk = login.json()["token"]
    # my/assignments returns the class
    r = requests.get(f"{API}/grades/my/assignments", headers={"Authorization": f"Bearer {tk}"})
    assert r.status_code == 200
    assignments = r.json()["assignments"]
    assert len(assignments) == 1
    assert assignments[0]["subject"] == "العلوم"
    assert assignments[0]["grade"] == "السابع"
    assert str(assignments[0]["section"]) == "3"


def test_cleanup(headers, created_ids):
    for tid in list(created_ids["teachers"]):
        r = requests.delete(f"{API}/grades/teachers/{tid}", headers=headers)
        assert r.status_code == 200
    created_ids["teachers"].clear()
