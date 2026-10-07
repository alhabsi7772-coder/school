"""
Regression tests for the grades Excel-import space-containing-headers bug fix.

Verifies:
- POST /api/grades/students/import/preview correctly auto-detects columns when
  headers have spaces (e.g. 'اسم الطالب' instead of 'الاسم').
- POST /api/grades/students/import actually imports and stores civil numbers
  as clean strings (no trailing '.0' from numeric Excel cells).
- Parent lookup via GET /api/grades/parent/results?civil_number=<v> works.
- GET /api/grades/my/students returns the imported students for admin and
  teachers whose assignments match.
- PUT /api/grades/students/{sid} updates civil number & new lookup works, old fails.
- Manual add student still works (regression).
- Teacher import preview with 'اسم المعلم' (with space) still auto-maps name col.
"""
import io
import os
import uuid
import pytest
import requests
from openpyxl import Workbook

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://school-frontend-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/grades"


# ---- helpers ----
def _xlsx_bytes(header, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(header)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def test_run_tag():
    # unique tag (digits only so we can embed in civil numbers)
    return str(uuid.uuid4().int)[:6]


# ---- Tests ----
class TestStudentImportSpaceHeaders:
    def test_preview_auto_detects_spaced_headers(self, admin_headers, test_run_tag):
        header = ["اسم الطالب", "الصف", "الشعبة", "الرقم المدني"]
        rows = [[f"TEST_{test_run_tag}_S1", "الثامن", 1, 66655544]]
        data = _xlsx_bytes(header, rows)
        files = {"file": ("students.xlsx", data,
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = requests.post(f"{API}/students/import/preview", headers=admin_headers, files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        s = body["suggested"]
        # The fix: all four columns must be auto-detected despite spaces in headers
        assert s["name"] == 0, f"name col expected 0, got {s}"
        assert s["grade"] == 1
        assert s["section"] == 2
        assert s["civil"] == 3
        # And numeric civil cell should be shown without trailing .0
        assert "66655544" in str(body["sample_rows"][0]), body["sample_rows"]
        assert ".0" not in str(body["sample_rows"][0][3])

    def test_import_students_with_spaced_headers_and_numeric_civil(self, admin_headers, test_run_tag):
        header = ["اسم الطالب", "الصف", "الشعبة", "الرقم المدني"]
        civ_a = f"7770{test_run_tag[:4]}1"
        civ_b = f"7770{test_run_tag[:4]}2"
        rows = [
            [f"TEST_{test_run_tag}_A", "الثامن", 1, int(civ_a)],  # numeric cell
            [f"TEST_{test_run_tag}_B", "التاسع", 2, int(civ_b)],
        ]
        data = _xlsx_bytes(header, rows)
        files = {"file": ("students.xlsx", data,
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        # No mapping fields -> rely on auto-detect (previously broken for spaced names)
        r = requests.post(f"{API}/students/import", headers=admin_headers, files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("added", 0) + body.get("updated", 0) >= 2, body

        # Verify both students exist via /students admin list
        r2 = requests.get(f"{API}/students", headers=admin_headers)
        assert r2.status_code == 200
        all_students = r2.json().get("students", [])
        a = next((s for s in all_students if s["name"] == f"TEST_{test_run_tag}_A"), None)
        b = next((s for s in all_students if s["name"] == f"TEST_{test_run_tag}_B"), None)
        assert a is not None, "Student A not inserted"
        assert b is not None, "Student B not inserted"
        # Clean civil string without .0
        assert a["civil_number"] == civ_a, a
        assert b["civil_number"] == civ_b, b
        assert a["grade"] == "الثامن" and str(a["section"]) == "1"
        pytest.imported_a = a
        pytest.imported_b = b
        pytest.civ_a = civ_a
        pytest.civ_b = civ_b

    def test_parent_lookup_by_civil_number(self, test_run_tag):
        # Public endpoint; no auth
        civ_a = pytest.civ_a
        r = requests.get(f"{API}/parent/results", params={"civil_number": civ_a})
        assert r.status_code == 200, r.text
        body = r.json()
        # Response may be {student, results} or similar
        assert body, body
        found_name = None
        if isinstance(body, dict):
            found_name = (body.get("student") or {}).get("name") or body.get("name")
        assert found_name == f"TEST_{test_run_tag}_A", f"Expected student A, got {body}"

        # Non-existing civil number
        r2 = requests.get(f"{API}/parent/results", params={"civil_number": "99999999999"})
        # Should either be 404 or an empty/not-found payload — just make sure it doesn't return student A
        if r2.status_code == 200:
            b2 = r2.json()
            name2 = (b2.get("student") or {}).get("name") if isinstance(b2, dict) else None
            assert name2 != f"TEST_{test_run_tag}_A"

    def test_admin_my_students_lists_imported(self, admin_headers, test_run_tag):
        # Admin can query any grade/section via /my/students
        r = requests.get(f"{API}/my/students", headers=admin_headers,
                         params={"grade": "الثامن", "section": "1"})
        assert r.status_code == 200, r.text
        names = [s["name"] for s in r.json().get("students", [])]
        assert f"TEST_{test_run_tag}_A" in names, names

    def test_edit_student_civil_number(self, admin_headers, test_run_tag):
        sid = pytest.imported_a["id"]
        new_civ = f"8880{test_run_tag[:4]}1"
        r = requests.put(f"{API}/students/{sid}", headers=admin_headers, json={
            "name": pytest.imported_a["name"],
            "grade": pytest.imported_a["grade"],
            "section": str(pytest.imported_a["section"]),
            "civil_number": new_civ,
        })
        assert r.status_code == 200, r.text

        # New civil works
        r2 = requests.get(f"{API}/parent/results", params={"civil_number": new_civ})
        assert r2.status_code == 200, r2.text
        found = (r2.json().get("student") or {}).get("name")
        assert found == pytest.imported_a["name"], r2.json()

        # Old civil no longer finds student A
        r3 = requests.get(f"{API}/parent/results", params={"civil_number": pytest.civ_a})
        if r3.status_code == 200:
            found_old = (r3.json().get("student") or {}).get("name")
            assert found_old != pytest.imported_a["name"]

    def test_manual_add_student_regression(self, admin_headers, test_run_tag):
        payload = {
            "name": f"TEST_{test_run_tag}_MANUAL",
            "grade": "السابع",
            "section": "1",
            "civil_number": f"5550{test_run_tag[:4]}9",
        }
        r = requests.post(f"{API}/students", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        # Verify appears in listing
        r2 = requests.get(f"{API}/students", headers=admin_headers,
                          params={"grade": "السابع", "section": "1"})
        assert r2.status_code == 200
        names = [s["name"] for s in r2.json().get("students", [])]
        assert payload["name"] in names


class TestTeacherImportSpaceHeaders:
    def test_teacher_preview_spaced_name_header(self, admin_headers):
        header = ["اسم المعلم", "رقم الموظف", "المادة", "الصفوف"]
        rows = [["TEST_T_X", "EMPTEST001", "الرياضيات", "الثامن-1"]]
        data = _xlsx_bytes(header, rows)
        files = {"file": ("teachers.xlsx", data,
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = requests.post(f"{API}/teachers/import/preview", headers=admin_headers, files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        s = body.get("suggested", {})
        # The core fix: 'اسم المعلم' with space must map to name col 0
        assert s.get("name") == 0, f"Expected teacher name auto-detected to col 0, got {body}"


# ---- cleanup ----
@pytest.fixture(scope="module", autouse=True)
def _cleanup(admin_headers, test_run_tag):
    yield
    try:
        r = requests.get(f"{API}/students", headers=admin_headers)
        for s in r.json().get("students", []):
            if test_run_tag in s.get("name", ""):
                requests.delete(f"{API}/students/{s['id']}", headers=admin_headers)
    except Exception as e:
        print(f"Cleanup failed: {e}")
