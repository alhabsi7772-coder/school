"""Tests for the new independent Grades system (/api/grades/*)."""
import io
import os
import uuid
import pytest
import requests
import openpyxl

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/grades"


# ---------- helpers ----------
def make_excel(headers, rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "admin"
    assert data.get("token")
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- auth ----------
class TestAuth:
    def test_status_public(self):
        r = requests.get(f"{API}/status")
        assert r.status_code == 200
        j = r.json()
        assert "site_closed" in j and "grades_locked" in j

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_me_returns_admin(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "admin"
        assert u["username"] == "admin"
        assert "_id" not in u
        assert "password_hash" not in u

    def test_teachers_requires_admin(self):
        r = requests.get(f"{API}/teachers")
        assert r.status_code in (401, 403)


# ---------- import preview / confirm (teachers) ----------
class TestTeachersImport:
    def test_preview_with_non_standard_headers(self, admin_headers):
        xlsx = make_excel(
            ["اسم المعلم الكامل", "الرقم الوظيفي", "الرقم المدني"],
            [
                ["TEST_معلم أحمد", "E10001", "C20001"],
                ["TEST_معلم خالد", "E10002", "C20002"],
            ],
        )
        r = requests.post(
            f"{API}/teachers/import/preview",
            headers=admin_headers,
            files={"file": ("teachers.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total_rows"] == 2
        assert len(j["headers"]) == 3
        assert len(j["sample_rows"]) == 2
        assert "suggested" in j
        # emp/civil suggestions should be found; name may be None because header is "اسم المعلم الكامل"
        assert j["suggested"]["emp"] == 1
        assert j["suggested"]["civil"] == 2

    def test_import_without_name_col_fails(self, admin_headers):
        # Custom non-standard header where auto-detect can't find name
        xlsx = make_excel(
            ["colA", "colB", "colC"],
            [["TEST_معلم1", "E9001", "C9001"]],
        )
        r = requests.post(
            f"{API}/teachers/import",
            headers=admin_headers,
            files={"file": ("t.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r.status_code == 400

    def test_import_with_explicit_mapping(self, admin_headers):
        unique = uuid.uuid4().hex[:6]
        xlsx = make_excel(
            ["كولمن-A", "كولمن-B", "كولمن-C"],
            [
                [f"TEST_معلم_{unique}_1", f"EMP_{unique}_1", f"CIV_{unique}_1"],
                [f"TEST_معلم_{unique}_2", f"EMP_{unique}_2", f"CIV_{unique}_2"],
            ],
        )
        r = requests.post(
            f"{API}/teachers/import",
            headers=admin_headers,
            files={"file": ("t.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"name_col": "0", "emp_col": "1", "civil_col": "2"},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["added"] + j["updated"] == 2

        # verify persistence via list
        r2 = requests.get(f"{API}/teachers", headers=admin_headers)
        assert r2.status_code == 200
        names = [t["name"] for t in r2.json()["teachers"]]
        assert f"TEST_معلم_{unique}_1" in names
        assert f"TEST_معلم_{unique}_2" in names
        # confirm emp/civil fields saved
        target = next(t for t in r2.json()["teachers"] if t["name"] == f"TEST_معلم_{unique}_1")
        assert target["employee_number"] == f"EMP_{unique}_1"
        assert target["civil_number"] == f"CIV_{unique}_1"


# ---------- import preview / confirm (students) ----------
class TestStudentsImport:
    def test_preview_students(self, admin_headers):
        xlsx = make_excel(
            ["الاسم", "الصف", "الشعبة", "الرقم المدني"],
            [["TEST_طالب1", "الخامس", "1", "S30001"]],
        )
        r = requests.post(
            f"{API}/students/import/preview",
            headers=admin_headers,
            files={"file": ("s.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["suggested"]["name"] == 0
        assert j["suggested"]["grade"] == 1
        assert j["suggested"]["section"] == 2
        assert j["suggested"]["civil"] == 3

    def test_import_students_with_mapping(self, admin_headers):
        unique = uuid.uuid4().hex[:6]
        xlsx = make_excel(
            ["X", "Y", "Z", "W"],
            [
                [f"TEST_طالب_{unique}_1", "الخامس", "1", f"CIV_S_{unique}_1"],
                [f"TEST_طالب_{unique}_2", "السادس", "2", f"CIV_S_{unique}_2"],
            ],
        )
        r = requests.post(
            f"{API}/students/import",
            headers=admin_headers,
            files={"file": ("s.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"name_col": "0", "grade_col": "1", "section_col": "2", "civil_col": "3"},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["added"] + j["updated"] == 2

        # verify list contains them
        r2 = requests.get(f"{API}/students", headers=admin_headers)
        assert r2.status_code == 200
        recs = r2.json()["students"]
        got = [s for s in recs if s["name"].startswith(f"TEST_طالب_{unique}")]
        assert len(got) == 2
        assert all("_id" not in s for s in got)


# ---------- CRUD teachers/students ----------
class TestCrud:
    def test_add_teacher_and_delete(self, admin_headers):
        unique = uuid.uuid4().hex[:6]
        r = requests.post(
            f"{API}/teachers",
            headers=admin_headers,
            json={"name": f"TEST_add_{unique}", "employee_number": f"EMPADD{unique}", "civil_number": ""},
        )
        assert r.status_code == 200, r.text
        # find id
        r2 = requests.get(f"{API}/teachers", headers=admin_headers)
        t = next(x for x in r2.json()["teachers"] if x["name"] == f"TEST_add_{unique}")
        # login as this teacher with default password
        rlogin = requests.post(f"{API}/auth/login", json={"username": f"EMPADD{unique}", "password": "123456"})
        assert rlogin.status_code == 200, rlogin.text
        assert rlogin.json()["role"] == "teacher"
        # delete
        rd = requests.delete(f"{API}/teachers/{t['id']}", headers=admin_headers)
        assert rd.status_code == 200

    def test_add_student_and_delete(self, admin_headers):
        unique = uuid.uuid4().hex[:6]
        r = requests.post(
            f"{API}/students",
            headers=admin_headers,
            json={"name": f"TEST_stu_{unique}", "grade": "الخامس", "section": "1", "civil_number": f"CIV{unique}"},
        )
        assert r.status_code == 200
        r2 = requests.get(f"{API}/students", headers=admin_headers)
        s = next(x for x in r2.json()["students"] if x["name"] == f"TEST_stu_{unique}")
        rd = requests.delete(f"{API}/students/{s['id']}", headers=admin_headers)
        assert rd.status_code == 200

    def test_delete_students_all_route_not_shadowed(self, admin_headers):
        # This confirms that DELETE /students/all is not treated as delete_student("all")
        # First seed a couple of students
        for i in range(2):
            requests.post(f"{API}/students", headers=admin_headers, json={
                "name": f"TEST_all_del_{i}_{uuid.uuid4().hex[:4]}", "grade": "الخامس", "section": "1", "civil_number": ""
            })
        r = requests.delete(f"{API}/students/all", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # after delete-all, list should be empty
        r2 = requests.get(f"{API}/students", headers=admin_headers)
        assert r2.status_code == 200
        assert len(r2.json()["students"]) == 0


# ---------- teacher assign + score entry + parent lookup ----------
class TestTeacherFlow:
    def test_full_flow(self, admin_headers):
        u = uuid.uuid4().hex[:6]
        # create teacher
        emp = f"EMPFLOW{u}"
        requests.post(f"{API}/teachers", headers=admin_headers,
                      json={"name": f"TEST_flowT_{u}", "employee_number": emp, "civil_number": ""})
        tlist = requests.get(f"{API}/teachers", headers=admin_headers).json()["teachers"]
        teacher = next(t for t in tlist if t["name"] == f"TEST_flowT_{u}")
        # create student
        civil = f"CIVFLOW{u}"
        requests.post(f"{API}/students", headers=admin_headers,
                      json={"name": f"TEST_flowS_{u}", "grade": "الخامس", "section": "1", "civil_number": civil})
        slist = requests.get(f"{API}/students", headers=admin_headers).json()["students"]
        student = next(s for s in slist if s["name"] == f"TEST_flowS_{u}")
        # assign
        assn = {"assignments": [{"grade": "الخامس", "section": "1", "subject": "الرياضيات"}]}
        r = requests.put(f"{API}/teachers/{teacher['id']}", headers=admin_headers, json=assn)
        assert r.status_code == 200
        # teacher login
        rl = requests.post(f"{API}/auth/login", json={"username": emp, "password": "123456"})
        assert rl.status_code == 200
        t_headers = {"Authorization": f"Bearer {rl.json()['token']}"}
        # assignments
        r = requests.get(f"{API}/my/assignments", headers=t_headers)
        assert r.status_code == 200
        assert len(r.json()["assignments"]) == 1
        # save score
        payload = {"student_id": student["id"], "grade": "الخامس", "section": "1",
                   "subject": "الرياضيات", "semester": "1", "quiz1": 9, "quiz2": 8.5}
        r = requests.put(f"{API}/my/scores", headers=t_headers, json=payload)
        assert r.status_code == 200, r.text
        # fetch back
        r = requests.get(f"{API}/my/scores", headers=t_headers,
                         params={"grade": "الخامس", "section": "1", "subject": "الرياضيات", "semester": "1"})
        assert r.status_code == 200
        s = r.json()["scores"][student["id"]]
        assert s["quiz1"] == 9
        assert s["quiz2"] == 8.5

        # score for a section teacher is NOT assigned to → forbidden
        bad = {**payload, "grade": "السادس"}
        rbad = requests.put(f"{API}/my/scores", headers=t_headers, json=bad)
        assert rbad.status_code == 403

        # parent lookup by civil
        rp = requests.get(f"{API}/parent/results", params={"civil_number": civil})
        assert rp.status_code == 200, rp.text
        pj = rp.json()
        assert pj["student"]["id"] == student["id"]
        assert len(pj["results"]) >= 1
        assert pj["results"][0]["total"] == 17.5

        # parent lookup wrong civil
        rp2 = requests.get(f"{API}/parent/results", params={"civil_number": "NOPE_XYZ"})
        assert rp2.status_code == 404

        # admin stats
        rs = requests.get(f"{API}/admin/stats", headers=admin_headers)
        assert rs.status_code == 200
        j = rs.json()
        assert j["total_teachers"] >= 1
        assert j["teachers_entered"] >= 1

        # cleanup
        requests.delete(f"{API}/teachers/{teacher['id']}", headers=admin_headers)
        requests.delete(f"{API}/students/{student['id']}", headers=admin_headers)


# ---------- smoke: existing modules still work ----------
class TestSmokeExistingModules:
    def test_teacher_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "teacher123"})
        assert r.status_code == 200, r.text
        assert r.json().get("token")

    def test_substitution_login(self):
        r = requests.post(f"{BASE_URL}/api/substitution/auth/login",
                          json={"username": "ehtiyat", "password": "ehtiyat2026"})
        assert r.status_code == 200, r.text
        assert r.json().get("token")
