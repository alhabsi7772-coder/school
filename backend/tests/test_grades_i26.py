"""Iteration 26 backend tests for Arabic Grades System review request.
Covers: settings (semester, subjects_config hide/show/add/delete), admin sees teacher scores on enter,
teacher can only enter current semester (403 otherwise), hidden subject disappears from status/stats/parent/class-stats,
class-stats endpoint sorted by pct desc with rank, parent only shows current semester.
TEST_ prefixed data; restores settings at end.
"""
import os
import pytest
import requests

def _load_env():
    p = '/app/frontend/.env'
    if os.path.exists(p):
        for line in open(p):
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip()
    return os.environ.get('REACT_APP_BACKEND_URL', '')

BASE = _load_env().rstrip('/') + '/api/grades'


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module", autouse=True)
def restore_state(admin_h):
    """Restore settings at end to spec: sem=1, all 10 original subjects visible, flags false."""
    yield
    # Rebuild original 10 subjects
    SUBS = [
        "التربية الاسلامية", "اللغة العربية", "اللغة الانجليزية", "الرياضيات", "العلوم",
        "الدراسات الاجتماعية", "التربية البدنية والصحية", "تقنية المعلومات", "الفنون البصرية", "الفنون الموسيقية",
    ]
    cfg = [{"name": n, "hidden": False} for n in SUBS]
    requests.put(f"{BASE}/settings", headers=admin_h, json={
        "current_semester": "1",
        "site_closed": False,
        "grades_locked": False,
        "parent_closed": False,
        "subjects_config": cfg,
    })


# ---------------- Status / public ----------------
def test_status_shape():
    r = requests.get(f"{BASE}/status")
    assert r.status_code == 200
    d = r.json()
    assert "current_semester" in d and "semester_label" in d
    assert "subjects" in d and isinstance(d["subjects"], list)


# ---------------- Settings (semester + subjects) ----------------
def test_change_semester_and_persist(admin_h):
    r = requests.put(f"{BASE}/settings", headers=admin_h, json={"current_semester": "2"})
    assert r.status_code == 200
    assert r.json()["current_semester"] == "2"
    r2 = requests.get(f"{BASE}/status")
    assert r2.json()["current_semester"] == "2"
    # revert
    requests.put(f"{BASE}/settings", headers=admin_h, json={"current_semester": "1"})


def test_bad_semester_rejected(admin_h):
    r = requests.put(f"{BASE}/settings", headers=admin_h, json={"current_semester": "9"})
    assert r.status_code == 400


def test_hide_and_restore_subject(admin_h):
    s = requests.get(f"{BASE}/settings", headers=admin_h).json()
    cfg = s["subjects_config"]
    target = cfg[0]["name"]
    hidden_cfg = [{"name": c["name"], "hidden": (c["name"] == target)} for c in cfg]
    r = requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": hidden_cfg})
    assert r.status_code == 200
    assert target not in r.json()["subjects"]
    # status also hides
    assert target not in requests.get(f"{BASE}/status").json()["subjects"]
    # restore
    restore_cfg = [{"name": c["name"], "hidden": False} for c in cfg]
    r2 = requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": restore_cfg})
    assert target in r2.json()["subjects"]


def test_add_and_delete_subject(admin_h):
    s = requests.get(f"{BASE}/settings", headers=admin_h).json()
    cfg = s["subjects_config"]
    new_sub = "TEST_مادة_اختبار"
    added = cfg + [{"name": new_sub, "hidden": False}]
    r = requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": added})
    assert new_sub in r.json()["subjects"]
    # delete
    r2 = requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": cfg})
    assert new_sub not in r2.json()["subjects"]


# ---------------- Seed teacher/students/scores for enter tests ----------------
@pytest.fixture(scope="module")
def seed(admin_h):
    # Ensure sem=1
    requests.put(f"{BASE}/settings", headers=admin_h, json={"current_semester": "1"})
    # Create teacher
    teacher = {
        "name": "TEST_معلم_اختبار_26",
        "employee_number": "900026",
        "civil_number": "123456726",
        "subject": "الرياضيات",
        "classes": [{"grade": "الخامس", "section": "9"}],
    }
    r = requests.post(f"{BASE}/teachers", headers=admin_h, json=teacher)
    assert r.status_code == 200, r.text
    # Create 2 students in that class
    student_ids = []
    for n in ["TEST_طالب_أ", "TEST_طالب_ب"]:
        rr = requests.post(f"{BASE}/students", headers=admin_h, json={
            "name": n, "grade": "الخامس", "section": "9", "civil_number": f"TC26_{n}"
        })
        assert rr.status_code == 200, rr.text
    # Fetch IDs
    sts = requests.get(f"{BASE}/students", headers=admin_h, params={"grade": "الخامس", "section": "9"}).json()["students"]
    student_ids = [s["id"] for s in sts if s["name"].startswith("TEST_طالب_")]
    assert len(student_ids) == 2
    # Login as teacher (username=civil, pwd=last 4 of emp)
    r2 = requests.post(f"{BASE}/auth/login", json={"username": "123456726", "password": "0026"})
    assert r2.status_code == 200, r2.text
    teacher_token = r2.json()["token"]
    teacher_uid = r2.json()["uid"]
    yield {
        "teacher_token": teacher_token, "teacher_uid": teacher_uid,
        "student_ids": student_ids,
    }
    # Cleanup
    # delete teacher by querying list
    tlist = requests.get(f"{BASE}/teachers", headers=admin_h).json()["teachers"]
    for t in tlist:
        if t["name"].startswith("TEST_"):
            requests.delete(f"{BASE}/teachers/{t['id']}", headers=admin_h)
    for sid in student_ids:
        requests.delete(f"{BASE}/students/{sid}", headers=admin_h)


def test_teacher_enters_scores_and_admin_sees_them(admin_h, seed):
    th = {"Authorization": f"Bearer {seed['teacher_token']}"}
    sid = seed["student_ids"][0]
    payload = {
        "student_id": sid, "grade": "الخامس", "section": "9",
        "subject": "الرياضيات", "semester": "1", "quiz1": 8, "quiz2": 7,
    }
    r = requests.put(f"{BASE}/my/scores", headers=th, json=payload)
    assert r.status_code == 200, r.text
    # Admin can see the teacher's score when querying same class/subject/semester
    r2 = requests.get(f"{BASE}/my/scores", headers=admin_h, params={
        "grade": "الخامس", "section": "9", "subject": "الرياضيات", "semester": "1",
    })
    assert r2.status_code == 200
    scores = r2.json()["scores"]
    assert sid in scores
    assert scores[sid]["quiz1"] == 8 and scores[sid]["quiz2"] == 7
    assert scores[sid]["teacher_id"] == seed["teacher_uid"]


def test_admin_edit_updates_same_doc_not_duplicate(admin_h, seed):
    sid = seed["student_ids"][0]
    r = requests.put(f"{BASE}/my/scores", headers=admin_h, json={
        "student_id": sid, "grade": "الخامس", "section": "9",
        "subject": "الرياضيات", "semester": "1", "quiz1": 9, "quiz2": 9,
    })
    assert r.status_code == 200
    r2 = requests.get(f"{BASE}/my/scores", headers=admin_h, params={
        "grade": "الخامس", "section": "9", "subject": "الرياضيات", "semester": "1"})
    scores = r2.json()["scores"]
    assert scores[sid]["quiz1"] == 9 and scores[sid]["quiz2"] == 9
    # teacher_id must remain the teacher's (not admin)
    assert scores[sid]["teacher_id"] == seed["teacher_uid"]


def test_teacher_blocked_from_non_current_semester(admin_h, seed):
    th = {"Authorization": f"Bearer {seed['teacher_token']}"}
    sid = seed["student_ids"][1]
    r = requests.put(f"{BASE}/my/scores", headers=th, json={
        "student_id": sid, "grade": "الخامس", "section": "9",
        "subject": "الرياضيات", "semester": "2", "quiz1": 5, "quiz2": 5,
    })
    assert r.status_code == 403


# ---------------- Hidden subject disappears from assignments/stats/parent/class-stats ----------------
def test_hidden_subject_hides_everywhere(admin_h, seed):
    th = {"Authorization": f"Bearer {seed['teacher_token']}"}
    # Hide الرياضيات
    s = requests.get(f"{BASE}/settings", headers=admin_h).json()
    cfg = s["subjects_config"]
    hidden_cfg = [{"name": c["name"], "hidden": (c["name"] == "الرياضيات")} for c in cfg]
    requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": hidden_cfg})
    try:
        # my/assignments must not contain الرياضيات
        a = requests.get(f"{BASE}/my/assignments", headers=th).json()["assignments"]
        assert not any(x["subject"] == "الرياضيات" for x in a)
        # my/stats also filtered
        st = requests.get(f"{BASE}/my/stats", headers=th).json()["stats"]
        assert not any(x["subject"] == "الرياضيات" for x in st)
        # class-stats admin
        cs = requests.get(f"{BASE}/class-stats", headers=admin_h, params={"grade": "الخامس", "section": "9"}).json()
        assert "الرياضيات" not in (cs.get("subjects") or [])
        # parent/results also filters
        pr = requests.get(f"{BASE}/parent/results", params={"civil_number": "TC26_TEST_طالب_أ"})
        if pr.status_code == 200:
            assert not any(r["subject"] == "الرياضيات" for r in pr.json()["results"])
    finally:
        # restore
        restore_cfg = [{"name": c["name"], "hidden": False} for c in cfg]
        requests.put(f"{BASE}/settings", headers=admin_h, json={"subjects_config": restore_cfg})


# ---------------- class-stats sorting and semester scoping ----------------
def test_class_stats_sorted_and_current_semester(admin_h, seed):
    # Need a 2nd student with lower pct — admin already set first to 9+9=18. Add low score to 2nd via admin.
    sid2 = seed["student_ids"][1]
    requests.put(f"{BASE}/my/scores", headers=admin_h, json={
        "student_id": sid2, "grade": "الخامس", "section": "9",
        "subject": "الرياضيات", "semester": "1", "quiz1": 3, "quiz2": 2,
    })
    r = requests.get(f"{BASE}/class-stats", headers=admin_h, params={"grade": "الخامس", "section": "9"})
    assert r.status_code == 200
    d = r.json()
    assert d["semester"] == "1"
    rows = d["rows"]
    assert len(rows) >= 2
    # Sorted by pct desc
    pcts = [r["pct"] for r in rows if r["pct"] is not None]
    assert pcts == sorted(pcts, reverse=True)
    # Rank: #1 pct highest
    first = rows[0]
    assert first["rank"] == 1


# ---------------- Parent only shows current semester ----------------
def test_parent_only_current_semester(admin_h, seed):
    # Admin writes a sem=2 score for student1 directly
    sid1 = seed["student_ids"][0]
    requests.put(f"{BASE}/my/scores", headers=admin_h, json={
        "student_id": sid1, "grade": "الخامس", "section": "9",
        "subject": "الرياضيات", "semester": "2", "quiz1": 1, "quiz2": 1,
    })
    # Current semester is 1 → parent must only show sem=1 (which was 9+9=18)
    r = requests.get(f"{BASE}/parent/results", params={"civil_number": "TC26_TEST_طالب_أ"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["semester_label"] == "الفصل الدراسي الأول"
    for row in d["results"]:
        assert row["semester"] == "1"


# ---------------- parent_closed toggle (regression) ----------------
def test_parent_closed_toggle(admin_h):
    requests.put(f"{BASE}/settings", headers=admin_h, json={"parent_closed": True})
    r = requests.get(f"{BASE}/parent/results", params={"civil_number": "nonexistent"})
    assert r.status_code == 403
    requests.put(f"{BASE}/settings", headers=admin_h, json={"parent_closed": False})
