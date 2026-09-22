"""Tests for rubric image attachment feature (move from per-student eval to rubric card)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fallback to read frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"

SAMPLE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
SAMPLE_DATA_URL2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def gradebook(headers):
    """Create a gradebook for rubric testing"""
    payload = {
        "grade": "TEST_R5",
        "section": "TEST_A",
        "students": ["TEST_طالب أول", "TEST_طالب ثانٍ"],
        "template": "5-6",
    }
    # Clean previous
    gbs = requests.get(f"{API}/gradebooks", headers=headers).json()
    for g in gbs:
        if g["grade"] == "TEST_R5" and g["section"] == "TEST_A":
            requests.delete(f"{API}/gradebooks/{g['id']}", headers=headers)
    r = requests.post(f"{API}/gradebooks", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    gb = r.json()
    yield gb
    requests.delete(f"{API}/gradebooks/{gb['id']}", headers=headers)


@pytest.fixture
def created_rubric(headers):
    payload = {
        "title": "TEST_Rubric Images",
        "semester": "1",
        "column": "p1",
        "criteria": [{"id": None, "name": "معيار 1", "max": 10}, {"id": None, "name": "معيار 2", "max": 10}],
        "images": [SAMPLE_DATA_URL, SAMPLE_DATA_URL2],
    }
    r = requests.post(f"{API}/rubrics", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    rub = r.json()
    yield rub
    requests.delete(f"{API}/rubrics/{rub['id']}", headers=headers)


class TestRubricImages:
    def test_create_rubric_with_images(self, headers, created_rubric):
        assert "images" in created_rubric
        assert isinstance(created_rubric["images"], list)
        assert len(created_rubric["images"]) == 2
        for url in created_rubric["images"]:
            assert url.startswith("data:")

    def test_get_rubric_returns_images(self, headers, created_rubric):
        r = requests.get(f"{API}/rubrics/{created_rubric['id']}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data.get("images", [])) == 2
        assert data["images"][0].startswith("data:")

    def test_update_rubric_clear_images(self, headers, created_rubric):
        payload = {
            "title": created_rubric["title"],
            "semester": created_rubric["semester"],
            "column": created_rubric["column"],
            "criteria": [{"id": c["id"], "name": c["name"], "max": c["max"]} for c in created_rubric["criteria"]],
            "images": [],
        }
        r = requests.put(f"{API}/rubrics/{created_rubric['id']}", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        g = requests.get(f"{API}/rubrics/{created_rubric['id']}", headers=headers).json()
        assert g.get("images", []) == []

    def test_non_data_urls_filtered(self, headers):
        payload = {
            "title": "TEST_Filter",
            "semester": "1",
            "column": "p1",
            "criteria": [{"id": None, "name": "x", "max": 5}],
            "images": ["https://evil.example/img.png", SAMPLE_DATA_URL, "not a url"],
        }
        r = requests.post(f"{API}/rubrics", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        try:
            data = requests.get(f"{API}/rubrics/{rid}", headers=headers).json()
            assert len(data["images"]) == 1
            assert data["images"][0] == SAMPLE_DATA_URL
        finally:
            requests.delete(f"{API}/rubrics/{rid}", headers=headers)

    def test_max_8_images_enforced(self, headers):
        payload = {
            "title": "TEST_Max",
            "semester": "1",
            "column": "p1",
            "criteria": [{"id": None, "name": "x", "max": 5}],
            "images": [SAMPLE_DATA_URL] * 10,
        }
        r = requests.post(f"{API}/rubrics", json=payload, headers=headers)
        assert r.status_code == 200
        rid = r.json()["id"]
        try:
            data = requests.get(f"{API}/rubrics/{rid}", headers=headers).json()
            assert len(data["images"]) == 8
        finally:
            requests.delete(f"{API}/rubrics/{rid}", headers=headers)


class TestRubricEvalNoImages:
    def test_save_evaluation_without_images_field(self, headers, gradebook, created_rubric):
        student_id = gradebook["students"][0]["id"]
        crit = created_rubric["criteria"]
        scores = {crit[0]["id"]: 8, crit[1]["id"]: 9}
        r = requests.put(
            f"{API}/rubrics/{created_rubric['id']}/evaluations",
            json={"gradebook_id": gradebook["id"], "student_id": student_id, "scores": scores},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["total"] == 17
        # GET the evaluation and ensure no images field saved
        evs = requests.get(
            f"{API}/rubrics/{created_rubric['id']}/evaluations?gradebook_id={gradebook['id']}",
            headers=headers,
        ).json()
        ev = next(e for e in evs if e["student_id"] == student_id)
        assert "images" not in ev, f"Evaluation should NOT contain images field; got keys: {list(ev.keys())}"

    def test_extra_images_field_ignored(self, headers, gradebook, created_rubric):
        """Even if client sends 'images', backend must ignore and not persist it."""
        student_id = gradebook["students"][1]["id"]
        crit = created_rubric["criteria"]
        scores = {crit[0]["id"]: 5, crit[1]["id"]: 5}
        r = requests.put(
            f"{API}/rubrics/{created_rubric['id']}/evaluations",
            json={
                "gradebook_id": gradebook["id"],
                "student_id": student_id,
                "scores": scores,
                "images": [SAMPLE_DATA_URL],  # should be ignored
            },
            headers=headers,
        )
        assert r.status_code == 200, r.text
        evs = requests.get(
            f"{API}/rubrics/{created_rubric['id']}/evaluations?gradebook_id={gradebook['id']}",
            headers=headers,
        ).json()
        ev = next(e for e in evs if e["student_id"] == student_id)
        assert "images" not in ev, f"Extra images field must be ignored; ev keys: {list(ev.keys())}"
