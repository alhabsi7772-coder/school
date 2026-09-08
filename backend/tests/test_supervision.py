"""Backend tests for the NEW supervision schedule feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://school-frontend-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/substitution"
UA = {"User-Agent": "Mozilla/5.0"}
PDF_PATH = "/tmp/supervision.pdf"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"username": "ehtiyat", "password": "ehtiyat2026"}, headers=UA, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}", **UA}


def test_1_import_pdf(auth):
    with open(PDF_PATH, "rb") as f:
        r = requests.post(f"{API}/supervision/import", files={"file": ("supervision.pdf", f, "application/pdf")},
                          headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["imported_days"] == 5
    assert data["total"] == 47
    assert data["matched"] == 42
    days = {d["day"]: d for d in data["days"]}
    assert len(days) == 5
    assert days["الأحد"]["leader"]["name"] == "مازن بن علي القنوبي"
    assert len(days["الأحد"]["supervisors"]) == 9
    assert days["الخميس"]["leader"]["name"] == "محمد عشري عشري علي"


def test_2_get_supervision(auth):
    r = requests.get(f"{API}/supervision", headers=auth, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "school_name" in d
    assert "year_label" in d
    # each supervisor has name + teacher_id (may be null)
    for day in d["days"]:
        for s in day["supervisors"]:
            assert "name" in s and "teacher_id" in s


def test_3_put_supervision_adds_unmatched(auth):
    # fetch existing first
    cur = requests.get(f"{API}/supervision", headers=auth, timeout=30).json()
    days_payload = []
    for day in cur["days"]:
        supervisors = [s["name"] for s in day["supervisors"]]
        leader = day["leader"]["name"]
        if day["day"] == "الثلاثاء":
            supervisors = supervisors + ["ماجد سلطان الشيذاني"]
        days_payload.append({"day": day["day"], "leader": leader, "supervisors": supervisors})
    r = requests.put(f"{API}/supervision", json={"days": days_payload}, headers=auth, timeout=30)
    assert r.status_code == 200, r.text
    result = r.json()
    tue = next(d for d in result["days"] if d["day"] == "الثلاثاء")
    names = [s["name"] for s in tue["supervisors"]]
    assert "ماجد سلطان الشيذاني" in names
    extra = next(s for s in tue["supervisors"] if s["name"] == "ماجد سلطان الشيذاني")
    assert extra["teacher_id"] is None


@pytest.fixture(scope="module")
def zaher_id(auth):
    r = requests.get(f"{API}/teachers", headers=auth, timeout=30).json()
    for t in r["teachers"]:
        if "زاهر" in t["name"] and "الحبسي" in t["name"]:
            return t["id"]
    pytest.skip("teacher زاهر الحبسي not found")


def test_4_candidates_supervisor_field(auth, zaher_id):
    d = "2026-09-13"
    # set absent
    r = requests.put(f"{API}/day/{d}/absent", json={"teacher_ids": [zaher_id]}, headers=auth, timeout=30)
    assert r.status_code == 200
    # find first period w/ class
    day_info = r.json()
    absent = next(a for a in day_info["absent"] if a["id"] == zaher_id)
    period = next(p["period"] for p in absent["periods"] if p["class"])

    r = requests.get(f"{API}/day/{d}/candidates", params={"absent_id": zaher_id, "period": period},
                     headers=auth, timeout=30)
    assert r.status_code == 200
    cands = r.json()
    assert all("supervisor" in c for c in cands)
    free_sup_members = [c for c in cands if c["free"] and c["supervisor"] == "member"]
    assert len(free_sup_members) > 0, "expected at least one free candidate with supervisor='member' on Sunday"

    # with exclude_supervisors
    r2 = requests.get(f"{API}/day/{d}/candidates",
                      params={"absent_id": zaher_id, "period": period, "exclude_supervisors": "true"},
                      headers=auth, timeout=30)
    cands2 = r2.json()
    assert all(c["supervisor"] is None for c in cands2)


def test_5_get_day_supervision_field(auth, zaher_id):
    r = requests.get(f"{API}/day/2026-09-13", headers=auth, timeout=30)
    assert r.status_code == 200
    data = r.json()
    sup = data.get("supervision")
    assert sup and sup["day"] == "الأحد"
    assert sup["leader"]["name"] == "مازن بن علي القنوبي"
    assert len(sup["supervisors"]) >= 9
    # assignment rows include substitute_supervisor key
    for a in data.get("assignments", []):
        assert "substitute_supervisor" in a


def test_6_auto_exclude_supervisors(auth, zaher_id):
    d = "2026-09-13"
    r = requests.post(f"{API}/day/{d}/auto", params={"exclude_supervisors": "true"}, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    for a in data["assignments"]:
        assert a.get("substitute_supervisor") is None, f"got supervisor sub: {a}"
    # cleanup
    requests.delete(f"{API}/day/{d}", headers=auth, timeout=30)


def test_7_delete_and_reimport(auth):
    r = requests.delete(f"{API}/supervision", headers=auth, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["total"] == 0
    for day in d["days"]:
        assert day["leader"]["name"] == ""
        assert day["supervisors"] == []
    # re-import
    with open(PDF_PATH, "rb") as f:
        r = requests.post(f"{API}/supervision/import",
                          files={"file": ("supervision.pdf", f, "application/pdf")},
                          headers=auth, timeout=60)
    assert r.status_code == 200
    assert r.json()["imported_days"] == 5
