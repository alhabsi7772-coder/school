"""Tests for the new GET /api/gradebooks/search-students endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://school-frontend-3.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def gradebooks(headers):
    r = requests.get(f"{BASE_URL}/api/gradebooks", headers=headers)
    assert r.status_code == 200, r.text
    listing = r.json()
    # LIST endpoint strips students; fetch full details
    full = []
    for g in listing:
        rr = requests.get(f"{BASE_URL}/api/gradebooks/{g['id']}", headers=headers)
        if rr.status_code == 200:
            full.append(rr.json())
    return full


def test_gradebooks_list_ok(gradebooks):
    assert isinstance(gradebooks, list)
    print(f"Found {len(gradebooks)} gradebooks")


def test_search_empty_returns_empty(headers):
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": ""})
    assert r.status_code == 200
    assert r.json() == []


def test_search_no_match(headers):
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": "zzzzznotfoundxxxx"})
    assert r.status_code == 200
    assert r.json() == []


def test_search_not_confused_with_gradebook_id(headers, gradebooks):
    # Ensures /gradebooks/search-students is NOT captured by /gradebooks/{gid}
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": "test"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_search_returns_structured_results(headers, gradebooks):
    # Find a real student name substring
    if not gradebooks:
        pytest.skip("No gradebooks in DB")
    sample_name = None
    for gb in gradebooks:
        for st in gb.get("students", []):
            if st.get("name"):
                sample_name = st["name"]
                break
        if sample_name:
            break
    if not sample_name:
        pytest.skip("No students in any gradebook")
    # Use first token of the name (partial match)
    parts = sample_name.split()
    q = parts[0]
    print(f"Searching with q={q!r} (from full name {sample_name!r})")
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": q})
    assert r.status_code == 200
    results = r.json()
    assert isinstance(results, list)
    assert len(results) > 0, f"Expected matches for {q}"
    assert len(results) <= 40
    for it in results:
        assert "student_id" in it
        assert "name" in it
        assert "grade" in it
        assert "section" in it
        assert "gradebook_id" in it
        assert "template" in it
        assert "scores" in it
        assert "1" in it["scores"] and "2" in it["scores"]
    print(f"Got {len(results)} results, first={results[0]['name']} ({results[0]['grade']}/{results[0]['section']})")


def test_search_middle_token_matches(headers, gradebooks):
    # Pick a student whose full name has >=2 tokens; search by MIDDLE/LAST token
    target = None
    for gb in gradebooks:
        for st in gb.get("students", []):
            parts = (st.get("name") or "").split()
            if len(parts) >= 2:
                target = (st, gb, parts)
                break
        if target:
            break
    if not target:
        pytest.skip("No multi-part student names")
    st, gb, parts = target
    middle_token = parts[-1] if len(parts) == 2 else parts[len(parts) // 2]
    print(f"Middle-token search q={middle_token!r} for {st['name']!r}")
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": middle_token})
    assert r.status_code == 200
    results = r.json()
    ids = [x["student_id"] for x in results]
    assert st["id"] in ids, f"Middle-token search failed to find student {st['name']} by q={middle_token}"


def test_search_scores_match_gradebook(headers, gradebooks):
    # Cross-verify scores returned by search match GET /api/gradebooks/{gid}
    for gb in gradebooks:
        students = gb.get("students", [])
        if not students:
            continue
        st = students[0]
        q = (st.get("name") or "").split()[0]
        if not q:
            continue
        r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", headers=headers, params={"q": q})
        assert r.status_code == 200
        match = next((x for x in r.json() if x["student_id"] == st["id"] and x["gradebook_id"] == gb["id"]), None)
        if not match:
            continue
        gb_full = requests.get(f"{BASE_URL}/api/gradebooks/{gb['id']}", headers=headers).json()
        for sem in ("1", "2"):
            expected = gb_full.get("scores", {}).get(sem, {}).get(st["id"], {})
            assert match["scores"][sem] == expected, f"Score mismatch sem={sem}"
        print(f"Scores match for {st['name']} in {gb['grade']}/{gb['section']}")
        return
    pytest.skip("Could not find suitable student to cross-verify")


def test_search_requires_auth():
    r = requests.get(f"{BASE_URL}/api/gradebooks/search-students", params={"q": "x"})
    assert r.status_code in (401, 403)
