"""Backend tests for lesson plans feature."""
import io
import os
import zipfile
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to env in frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.strip().split("=", 1)[1].strip().rstrip("/")
                break

DEFAULT_DIRECTORATE = "المديرية العامة للتربية والتعليم بمحافظة شمال الشرقية"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Catalog ----------
def test_catalog(h):
    r = requests.get(f"{BASE_URL}/api/lesson-plans/catalog", headers=h)
    assert r.status_code == 200
    d = r.json()
    assert len(d["grades"]) == 4
    counts = {g["grade"]: sum(len(u["lessons"]) for u in g["units"]) for g in d["grades"]}
    assert counts == {"5": 11, "6": 10, "7": 9, "8": 10}, counts
    assert len(d["variants"]) == 5


# ---------- Get plans ----------
@pytest.mark.parametrize("lid", ["g5-u1-l1", "g7-u2-l3", "g8-u2-l4"])
def test_get_plans(h, lid):
    r = requests.get(f"{BASE_URL}/api/lesson-plans/{lid}", headers=h)
    if r.status_code == 404 and lid == "g8-u2-l4":
        pytest.skip("g8-u2-l4 not present in lesson content")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["lesson"]["id"] == lid
    assert len(d["variants"]) == 5
    for v in d["variants"]:
        n = len(v["objectives"])
        assert 3 <= n <= 4
        assert len(v["strategies"]) >= 5
        for s in v["strategies"]:
            assert "name" in s and "objectives" in s
        assert len(v["execution"]) == n
        assert v["edited"] is False
        for k in ("prior", "resources", "formative", "enrichment", "remedial", "summative", "homework", "notes"):
            assert k in v


def test_get_plans_404(h):
    r = requests.get(f"{BASE_URL}/api/lesson-plans/nope-x", headers=h)
    assert r.status_code == 404


# ---------- Save / Reset ----------
def test_save_and_reset(h):
    lid, var = "g5-u1-l1", 1
    orig = requests.get(f"{BASE_URL}/api/lesson-plans/{lid}", headers=h).json()
    v = next(x for x in orig["variants"] if x["variant"] == var)
    body = {k: v[k] for k in ("prior", "objectives", "strategies", "execution", "resources",
                               "formative", "enrichment", "remedial", "summative", "homework", "notes")}
    body["objectives"] = body["objectives"] + ["هدف تجريبي"]
    body["notes"] = "ملاحظة اختبار"

    r = requests.put(f"{BASE_URL}/api/lesson-plans/{lid}/{var}", json=body, headers=h)
    assert r.status_code == 200

    r2 = requests.get(f"{BASE_URL}/api/lesson-plans/{lid}", headers=h).json()
    v2 = next(x for x in r2["variants"] if x["variant"] == var)
    assert v2["edited"] is True
    assert "هدف تجريبي" in v2["objectives"]
    assert v2["notes"] == "ملاحظة اختبار"

    # catalog shows edited_variants
    cat = requests.get(f"{BASE_URL}/api/lesson-plans/catalog", headers=h).json()
    lesson_entry = next(l for g in cat["grades"] for u in g["units"] for l in u["lessons"] if l["id"] == lid)
    assert var in lesson_entry["edited_variants"]

    # reset
    r3 = requests.delete(f"{BASE_URL}/api/lesson-plans/{lid}/{var}", headers=h)
    assert r3.status_code == 200
    r4 = requests.get(f"{BASE_URL}/api/lesson-plans/{lid}", headers=h).json()
    v4 = next(x for x in r4["variants"] if x["variant"] == var)
    assert v4["edited"] is False
    assert "هدف تجريبي" not in v4["objectives"]


def test_save_invalid_id(h):
    r = requests.put(f"{BASE_URL}/api/lesson-plans/nope/1", json={}, headers=h)
    assert r.status_code == 404


# ---------- Export ----------
def test_export_docx(h):
    lid, var = "g5-u1-l1", 2
    plan = requests.get(f"{BASE_URL}/api/lesson-plans/{lid}", headers=h).json()
    v = next(x for x in plan["variants"] if x["variant"] == var)
    body = {"plan": {k: v[k] for k in ("prior", "objectives", "strategies", "execution", "resources",
                                        "formative", "enrichment", "remedial", "summative", "homework", "notes")},
            "directorate": "مديرية اختبار الترويسة"}
    r = requests.post(f"{BASE_URL}/api/lesson-plans/{lid}/{var}/export", json=body, headers=h)
    assert r.status_code == 200
    assert "wordprocessingml" in r.headers.get("content-type", "")
    zf = zipfile.ZipFile(io.BytesIO(r.content))
    assert "word/document.xml" in zf.namelist()
    xml = zf.read("word/document.xml").decode("utf-8")
    assert "الحاسوب" in xml  # lesson title
    assert "مديرية اختبار الترويسة" in xml


# ---------- Profile directorate ----------
def test_profile_directorate(h):
    new = "مديرية اختبارية للتحضير"
    r = requests.put(f"{BASE_URL}/api/auth/profile", json={"directorate": new}, headers=h)
    assert r.status_code == 200
    r2 = requests.get(f"{BASE_URL}/api/auth/profile", headers=h)
    assert r2.status_code == 200
    assert r2.json().get("directorate") == new
    # restore
    requests.put(f"{BASE_URL}/api/auth/profile", json={"directorate": DEFAULT_DIRECTORATE}, headers=h)
