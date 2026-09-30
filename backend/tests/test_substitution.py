"""Tests for the substitution (نظام حصص الاحتياط) module."""
import os
import io
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env
    try:
        for line in open("/app/frontend/.env"):
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

SUB_USER = "ehtiyat"
SUB_PWD = "ehtiyat2026"
ADMIN_USER = "admin"
ADMIN_PWD = "teacher123"

TEST_DATE = "2026-09-13"      # Sunday (school day)
FRIDAY_DATE = "2026-09-11"    # Friday (non-school)
MONDAY_DATE = "2026-09-14"    # Monday


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def sub_token():
    r = requests.post(f"{BASE_URL}/api/substitution/auth/login",
                      json={"username": SUB_USER, "password": SUB_PWD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": ADMIN_USER, "password": ADMIN_PWD}, timeout=15)
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def H(sub_token):
    return {"Authorization": f"Bearer {sub_token}"}


@pytest.fixture(scope="module")
def teachers(H):
    r = requests.get(f"{BASE_URL}/api/substitution/teachers", headers=H, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["teachers"]


# ---------- auth ----------
class TestAuth:
    def test_login_ok(self, sub_token):
        assert isinstance(sub_token, str) and len(sub_token) > 20

    def test_login_wrong_pwd(self):
        r = requests.post(f"{BASE_URL}/api/substitution/auth/login",
                          json={"username": SUB_USER, "password": "wrong-xyz"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, H):
        r = requests.get(f"{BASE_URL}/api/substitution/auth/me", headers=H, timeout=15)
        assert r.status_code == 200
        assert r.json().get("username") == SUB_USER

    def test_admin_token_rejected(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/substitution/auth/me",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 401

    def test_no_token(self):
        r = requests.get(f"{BASE_URL}/api/substitution/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ---------- teachers ----------
class TestTeachers:
    def test_list_49_and_quota_sum(self, teachers):
        active = [t for t in teachers if t.get("active", True)]
        assert len(active) >= 49, f"expected >=49 active, got {len(active)}"
        # sum quota over the 49 seeded (first 49 by order)
        seeded = sorted(teachers, key=lambda t: t.get("order", 0))[:49]
        total = sum(t.get("quota", 0) for t in seeded)
        assert total == 960, f"quota sum={total}"

    def test_schema(self, teachers):
        t = teachers[0]
        for k in ("id", "name", "subject", "quota", "schedule", "absences", "subs"):
            assert k in t, f"missing {k}"
        sched = t["schedule"]
        assert len(sched) == 5
        for day, cells in sched.items():
            assert len(cells) == 8


# ---------- day / absent ----------
class TestDay:
    def test_set_absent_ok(self, H, teachers):
        # pick two teachers who have at least one class on Sunday (الأحد)
        picks = [t for t in teachers if any(t["schedule"].get("الأحد") or [])][:2]
        assert len(picks) == 2
        ids = [t["id"] for t in picks]
        r = requests.put(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/absent",
                         headers=H, json={"teacher_ids": ids}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["absent"]) == 2
        for a in data["absent"]:
            assert len(a["periods"]) == 8
        # persistent
        r2 = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}", headers=H, timeout=15)
        assert r2.status_code == 200
        assert len(r2.json()["absent"]) == 2

    def test_friday_rejected(self, H, teachers):
        r = requests.put(f"{BASE_URL}/api/substitution/day/{FRIDAY_DATE}/absent",
                         headers=H, json={"teacher_ids": [teachers[0]["id"]]}, timeout=15)
        assert r.status_code == 400

    def test_candidates(self, H, teachers):
        # get current day to know absent + a period with class
        day = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}", headers=H, timeout=15).json()
        absent_id = day["absent"][0]["id"]
        period_obj = next(p for p in day["absent"][0]["periods"] if p.get("class"))
        period = period_obj["period"]
        r = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/candidates",
                         headers=H, params={"absent_id": absent_id, "period": period}, timeout=15)
        assert r.status_code == 200, r.text
        cands = r.json()
        assert isinstance(cands, list) and len(cands) > 0
        # sorted: free first
        frees = [c for c in cands if c["free"]]
        assert frees, "no free candidates"
        assert cands[0]["free"] is True
        # None of the frees have a class at that period on that day
        tmap = {t["id"]: t for t in teachers}
        for c in frees:
            slot = (tmap[c["id"]]["schedule"].get(day["day_name"]) or [None]*8)[period-1]
            assert slot is None, f"{c['name']} not actually free"
            assert c["id"] not in [a["id"] for a in day["absent"]]
        for k in ("least_quota", "least_subs", "same_class"):
            assert k in frees[0]

    def test_assign_and_negative(self, H, teachers):
        day = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}", headers=H, timeout=15).json()
        absent_id = day["absent"][0]["id"]
        period_obj = next(p for p in day["absent"][0]["periods"] if p.get("class"))
        period = period_obj["period"]
        cands = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/candidates",
                             headers=H, params={"absent_id": absent_id, "period": period}, timeout=15).json()
        free_sub = next(c for c in cands if c["free"])
        busy_sub = next((c for c in cands if not c["free"]), None)
        # assign
        r = requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/assign", headers=H,
                          json={"absent_id": absent_id, "period": period, "substitute_id": free_sub["id"]}, timeout=15)
        assert r.status_code == 200, r.text
        # busy substitute rejected
        if busy_sub:
            r2 = requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/assign", headers=H,
                               json={"absent_id": absent_id, "period": period, "substitute_id": busy_sub["id"]}, timeout=15)
            assert r2.status_code == 400
        # period where absent has no class
        empty_period = next((p["period"] for p in day["absent"][0]["periods"] if not p.get("class")), None)
        if empty_period:
            r3 = requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/assign", headers=H,
                               json={"absent_id": absent_id, "period": empty_period, "substitute_id": free_sub["id"]}, timeout=15)
            assert r3.status_code == 400
        # null removes assignment
        r4 = requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/assign", headers=H,
                           json={"absent_id": absent_id, "period": period, "substitute_id": None}, timeout=15)
        assert r4.status_code == 200
        assigns = [a for a in r4.json()["assignments"] if a["absent_id"] == absent_id and a["period"] == period]
        assert not assigns

    def test_auto_distribute(self, H, teachers):
        r = requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/auto", headers=H, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "filled" in data and "unfilled" in data
        # verify constraints: no double booking, no substitute with own class
        tmap = {t["id"]: t for t in teachers}
        day_name = data["day_name"]
        seen = {}
        for a in data["assignments"]:
            sid = a.get("substitute_id")
            if not sid:
                continue
            key = (sid, a["period"])
            assert key not in seen, "substitute double booked"
            seen[key] = True
            slot = (tmap[sid]["schedule"].get(day_name) or [None]*8)[a["period"]-1]
            assert slot is None, f"substitute {sid} has own class at period {a['period']}"

    def test_clear_assignments(self, H):
        r = requests.delete(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/assignments", headers=H, timeout=15)
        assert r.status_code == 200
        assert r.json()["assignments"] == []
        assert len(r.json()["absent"]) == 2

    def test_stats(self, H):
        # create some assignment first (auto again)
        requests.post(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/auto", headers=H, timeout=30)
        r = requests.get(f"{BASE_URL}/api/substitution/stats", headers=H,
                         params={"from_date": "2026-09-01", "to_date": "2026-09-30"}, timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ("days", "total_absences", "total_subs", "per_teacher", "by_subject", "per_day"):
            assert k in s
        assert s["total_absences"] >= 2
        assert s["days"] >= 1

    def test_days_list(self, H):
        r = requests.get(f"{BASE_URL}/api/substitution/days", headers=H,
                         params={"from_date": "2026-09-01", "to_date": "2026-09-30"}, timeout=15)
        assert r.status_code == 200
        assert any(d["date"] == TEST_DATE for d in r.json())

    def test_export_docx(self, H):
        r = requests.get(f"{BASE_URL}/api/substitution/day/{TEST_DATE}/export", headers=H, timeout=20)
        assert r.status_code == 200
        assert "wordprocessingml" in r.headers.get("content-type", "")
        assert len(r.content) > 10000

    def test_clear_day(self, H):
        r = requests.delete(f"{BASE_URL}/api/substitution/day/{TEST_DATE}", headers=H, timeout=15)
        assert r.status_code == 200
        assert r.json()["absent"] == []


# ---------- CRUD teachers ----------
class TestTeacherCRUD:
    _tid = None

    def test_create(self, H):
        r = requests.post(f"{BASE_URL}/api/substitution/teachers", headers=H,
                          json={"name": "TEST_dummy_teacher", "subject": "اختبار", "quota": 5}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_dummy_teacher"
        TestTeacherCRUD._tid = d["id"]

    def test_update(self, H):
        assert TestTeacherCRUD._tid
        r = requests.put(f"{BASE_URL}/api/substitution/teachers/{TestTeacherCRUD._tid}", headers=H,
                         json={"quota": 9, "active": False}, timeout=15)
        assert r.status_code == 200
        assert r.json()["quota"] == 9
        assert r.json()["active"] is False

    def test_import_pdf(self, H):
        pdf_path = "/app/data/substitution/teachers.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("teachers.pdf not present")
        with open(pdf_path, "rb") as f:
            r = requests.post(f"{BASE_URL}/api/substitution/teachers/import",
                              headers=H, files={"file": ("teachers.pdf", f, "application/pdf")}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["updated"] == 49
        assert d["added"] == 0
        assert d["total"] == 49

    def test_import_non_pdf(self, H):
        r = requests.post(f"{BASE_URL}/api/substitution/teachers/import",
                          headers=H, files={"file": ("x.txt", b"hello", "text/plain")}, timeout=15)
        assert r.status_code == 400

    def test_delete(self, H):
        # re-create if import re-deactivated our dummy but kept it existing (import doesn't delete)
        # find any TEST_ teacher and delete
        ts = requests.get(f"{BASE_URL}/api/substitution/teachers", headers=H, timeout=15).json()["teachers"]
        for t in ts:
            if t["name"].startswith("TEST_"):
                r = requests.delete(f"{BASE_URL}/api/substitution/teachers/{t['id']}", headers=H, timeout=15)
                assert r.status_code == 200
