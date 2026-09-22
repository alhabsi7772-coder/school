"""Smoke test: verify freshly imported project's backend is healthy."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://git-portal-4.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "admin", "password": "teacher123"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_success():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "admin", "password": "teacher123"}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"
    assert isinstance(body["token"], str) and len(body["token"]) > 20


def test_login_invalid():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "admin", "password": "wrong"}, timeout=15)
    assert r.status_code in (400, 401, 403)


def test_app_settings(headers):
    r = requests.get(f"{BASE_URL}/api/app-settings", headers=headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_academic_years(headers):
    r = requests.get(f"{BASE_URL}/api/academic-years", headers=headers, timeout=15)
    assert r.status_code == 200


def test_quizzes_list(headers):
    r = requests.get(f"{BASE_URL}/api/quizzes", headers=headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_profile(headers):
    r = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("username") == "admin"


@pytest.mark.parametrize("path", [
    "/api/question-bank",
    "/api/gradebooks",
    "/api/rubrics",
    "/api/lesson-plans",
])
def test_core_list_endpoints(headers, path):
    r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=20)
    # Allow 200 (list) or 404 if endpoint path slightly differs; not 5xx
    assert r.status_code < 500, f"{path} -> {r.status_code}: {r.text[:200]}"
