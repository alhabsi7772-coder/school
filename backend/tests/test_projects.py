"""Tests for Projects feature - teacher creates projects, students submit files"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "teacher123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def created_project(auth_headers):
    """Create a project for testing"""
    resp = requests.post(f"{BASE_URL}/api/projects", json={
        "title": "TEST_Project",
        "description": "Test description",
        "deadline": "2026-12-31T23:59:00"
    }, headers=auth_headers)
    assert resp.status_code == 200
    project = resp.json()
    yield project
    # Cleanup
    requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)


class TestProjectAPI:
    """Project CRUD and submission API tests"""

    def test_get_projects(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"GET /api/projects: {len(data)} projects found")

    def test_create_project(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Create",
            "description": "Temp project",
            "deadline": "2026-12-31T23:59:00"
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "TEST_Create"
        assert "id" in data
        assert "code" in data
        assert len(data["code"]) == 6
        print(f"Created project code: {data['code']}")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=auth_headers)

    def test_get_project_info_by_code(self, created_project):
        code = created_project["code"]
        resp = requests.get(f"{BASE_URL}/api/project/{code}/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] == code
        assert data["title"] == "TEST_Project"
        print(f"GET /api/project/{code}/info: OK")

    def test_get_project_info_invalid_code(self):
        resp = requests.get(f"{BASE_URL}/api/project/XXXXXX/info")
        assert resp.status_code == 404

    def test_submit_project(self, created_project):
        code = created_project["code"]
        # Create a small base64 file
        file_content = base64.b64encode(b"Hello test file content").decode()
        resp = requests.post(f"{BASE_URL}/api/project/{code}/submit", json={
            "student_name": "TEST_Student",
            "grade": "الصف العاشر",
            "section": "أ",
            "files": [{
                "filename": "test.txt",
                "content_type": "text/plain",
                "size_bytes": 23,
                "data_base64": file_content
            }]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "submission_id" in data
        print(f"Submit project: submission_id={data['submission_id']}")

    def test_submit_project_no_files(self, created_project):
        code = created_project["code"]
        resp = requests.post(f"{BASE_URL}/api/project/{code}/submit", json={
            "student_name": "Test",
            "grade": "10",
            "section": "أ",
            "files": []
        })
        assert resp.status_code == 400

    def test_get_project_submissions(self, created_project, auth_headers):
        pid = created_project["id"]
        resp = requests.get(f"{BASE_URL}/api/projects/{pid}/submissions", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "project" in data
        assert "submissions" in data
        assert isinstance(data["submissions"], list)
        print(f"GET submissions: {len(data['submissions'])} submissions")

    def test_get_project_submissions_requires_auth(self, created_project):
        pid = created_project["id"]
        resp = requests.get(f"{BASE_URL}/api/projects/{pid}/submissions")
        assert resp.status_code == 403

    def test_get_existing_project_hyjtet(self):
        resp = requests.get(f"{BASE_URL}/api/project/HYJTET/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] == "HYJTET"
        print(f"Existing project: {data['title']}")
