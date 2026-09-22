"""Backend tests for new substitution features (iteration 18):
- Bulk teacher activate/deactivate/delete
- Late absent tracking (late_ids and absent[].late flag)
- Stats subs_p8 and teacher_absence_rows
- Day export with ?absent_id= filter (addendum)
- Swap CRUD + candidates + docx export
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api/substitution"
SUB_USER = "ehtiyat"
SUB_PWD = "ehtiyat2026"

# Unique dates for this test suite
D_LATE = "2026-11-15"     # Sunday
D_SWAP = "2026-11-16"     # Monday
D_STATS = "2026-11-17"    # Tuesday


@pytest.fixture(scope="module")
def H():
    r = requests.post(f"{API}/auth/login", json={"username": SUB_USER, "password": SUB_PWD}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def teachers(H):
    r = requests.get(f"{API}/teachers", headers=H, timeout=15)
    assert r.status_code == 200
    return r.json()["teachers"]


def _cleanup(H, dates):
    for d in dates:
        requests.delete(f"{API}/day/{d}", headers=H, timeout=15)
        requests.delete(f"{API}/swap/{d}", headers=H, timeout=15)


def _pick_absent_with_period(teachers, day_name):
    for t in teachers:
        if not t.get("active", True):
            continue
        sched = (t.get("schedule") or {}).get(day_name) or []
        for i, c in enumerate(sched):
            if c:
                return t, i + 1
    return None, None


# ---------------- Bulk teachers ----------------

class TestBulk:
    def test_bulk_active_deactivate_and_reactivate(self, H, teachers):
        # Pick 2 active teachers
        ids = [t["id"] for t in teachers if t.get("active", True)][:2]
        assert len(ids) == 2
        # Deactivate
        r = requests.put(f"{API}/teachers/bulk-active", headers=H, json={"ids": ids, "active": False}, timeout=15)
        assert r.status_code == 200
        assert r.json()["updated"] == 2
        # Verify
        r = requests.get(f"{API}/teachers", headers=H)
        tmap = {t["id"]: t for t in r.json()["teachers"]}
        assert tmap[ids[0]]["active"] is False
        assert tmap[ids[1]]["active"] is False
        # Reactivate
        r = requests.put(f"{API}/teachers/bulk-active", headers=H, json={"ids": ids, "active": True}, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/teachers", headers=H)
        tmap = {t["id"]: t for t in r.json()["teachers"]}
        assert tmap[ids[0]]["active"] is True
        assert tmap[ids[1]]["active"] is True

    def test_bulk_delete_created_teachers(self, H):
        # Create 3 throwaway teachers
        ids = []
        for i in range(3):
            r = requests.post(f"{API}/teachers", headers=H,
                              json={"name": f"TEST_BULK_{uuid.uuid4().hex[:6]}", "subject": "x", "quota": 0}, timeout=15)
            assert r.status_code == 200
            ids.append(r.json()["id"])
        # Bulk delete
        r = requests.post(f"{API}/teachers/bulk-delete", headers=H, json={"ids": ids}, timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] == 3
        # Verify gone
        r = requests.get(f"{API}/teachers", headers=H)
        remaining = {t["id"] for t in r.json()["teachers"]}
        for i in ids:
            assert i not in remaining


# ---------------- Late-added absent ----------------

class TestLateAbsent:
    def test_late_flag_only_when_added_after_distribution(self, H, teachers):
        _cleanup(H, [D_LATE])
        day = requests.get(f"{API}/day/{D_LATE}", headers=H).json()
        # Two teachers who both have periods on D_LATE
        found = []
        for t in teachers:
            if not t.get("active", True):
                continue
            sched = (t.get("schedule") or {}).get(day["day_name"]) or []
            p = next((i + 1 for i, c in enumerate(sched) if c), None)
            if p:
                found.append((t, p))
            if len(found) >= 2:
                break
        assert len(found) == 2
        (t1, p1), (t2, p2) = found

        # Absent = t1 only, assign sub (creates a distribution)
        requests.put(f"{API}/day/{D_LATE}/absent", headers=H, json={"teacher_ids": [t1["id"]]})
        cands = requests.get(f"{API}/day/{D_LATE}/candidates", headers=H,
                             params={"absent_id": t1["id"], "period": p1}).json()
        sub_id = next((c["id"] for c in cands if c["free"] and c["id"] != t2["id"]), None)
        assert sub_id
        r = requests.post(f"{API}/day/{D_LATE}/assign", headers=H,
                          json={"absent_id": t1["id"], "period": p1, "substitute_id": sub_id})
        assert r.status_code == 200
        # t1 should NOT be late
        day = requests.get(f"{API}/day/{D_LATE}", headers=H).json()
        t1_row = next(a for a in day["absent"] if a["id"] == t1["id"])
        assert t1_row["late"] is False

        # Now add t2 (late)
        requests.put(f"{API}/day/{D_LATE}/absent", headers=H, json={"teacher_ids": [t1["id"], t2["id"]]})
        day = requests.get(f"{API}/day/{D_LATE}", headers=H).json()
        t2_row = next(a for a in day["absent"] if a["id"] == t2["id"])
        assert t2_row["late"] is True, f"expected late=True, got {t2_row}"
        t1_row = next(a for a in day["absent"] if a["id"] == t1["id"])
        assert t1_row["late"] is False

        # Export docx with ?absent_id filter (addendum)
        r = requests.get(f"{API}/day/{D_LATE}/export", headers=H, params={"absent_id": t2["id"]}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/") or "wordprocessingml" in r.headers.get("content-type", "")
        assert len(r.content) > 500

        _cleanup(H, [D_LATE])


# ---------------- Stats extensions ----------------

class TestStats:
    def test_stats_subs_p8_and_teacher_absence_rows(self, H, teachers):
        _cleanup(H, [D_STATS])
        day = requests.get(f"{API}/day/{D_STATS}", headers=H).json()
        day_name = day["day_name"]

        # Pick absent teacher with period 8 filled if possible; else any period
        absent, p_abs = None, None
        for t in teachers:
            if not t.get("active", True):
                continue
            sched = (t.get("schedule") or {}).get(day_name) or []
            if len(sched) >= 8 and sched[7]:
                absent = t
                p_abs = 8
                break
        if not absent:
            absent, p_abs = _pick_absent_with_period(teachers, day_name)
        assert absent

        requests.put(f"{API}/day/{D_STATS}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
        cands = requests.get(f"{API}/day/{D_STATS}/candidates", headers=H,
                             params={"absent_id": absent["id"], "period": p_abs}).json()
        sub_id = next((c["id"] for c in cands if c["free"]), None)
        assert sub_id
        r = requests.post(f"{API}/day/{D_STATS}/assign", headers=H,
                          json={"absent_id": absent["id"], "period": p_abs, "substitute_id": sub_id})
        assert r.status_code == 200

        # Aggregate stats
        r = requests.get(f"{API}/stats", headers=H, params={"from_date": D_STATS, "to_date": D_STATS})
        assert r.status_code == 200
        data = r.json()
        assert "per_teacher" in data
        # Every per_teacher row should have subs_p8 field
        for row in data["per_teacher"]:
            assert "subs_p8" in row
            assert isinstance(row["subs_p8"], int)
        # The substitute row should have subs_p8 == 1 if we assigned p8, else 0
        sub_row = next((r for r in data["per_teacher"] if r["id"] == sub_id), None)
        assert sub_row is not None
        if p_abs == 8:
            assert sub_row["subs_p8"] == 1
        else:
            assert sub_row["subs_p8"] == 0

        # Per-teacher (absent teacher) stats → teacher_absence_rows
        r = requests.get(f"{API}/stats", headers=H, params={"from_date": D_STATS, "to_date": D_STATS, "teacher_id": absent["id"]})
        assert r.status_code == 200
        data = r.json()
        assert "teacher_absence_rows" in data
        rows = data["teacher_absence_rows"]
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert any(r["date"] == D_STATS for r in rows)

        _cleanup(H, [D_STATS])


# ---------------- Swap ----------------

class TestSwap:
    def test_swap_full_flow(self, H, teachers):
        _cleanup(H, [D_SWAP])
        day = requests.get(f"{API}/day/{D_SWAP}", headers=H).json()
        day_name = day["day_name"]
        assert day_name

        # Find teacher A with a period AND teacher B who is free at that period
        A = None
        B = None
        pA = None
        pB = None
        for t in teachers:
            if not t.get("active", True):
                continue
            sched = (t.get("schedule") or {}).get(day_name) or []
            periods_filled = [i + 1 for i, c in enumerate(sched) if c]
            if not periods_filled:
                continue
            A = t
            pA = periods_filled[0]
            break
        assert A

        # Get swap candidates for A at pA
        r = requests.get(f"{API}/swap/{D_SWAP}/candidates", headers=H,
                         params={"teacher_id": A["id"], "period": pA}, timeout=15)
        assert r.status_code == 200, r.text
        cands = r.json()
        assert len(cands) > 0
        for c in cands:
            assert "same_class" in c
        # Pick candidate B who ALSO has at least one period on D_SWAP that A is free at
        for c in cands:
            b_full = next((t for t in teachers if t["id"] == c["id"]), None)
            if not b_full:
                continue
            sched = (b_full.get("schedule") or {}).get(day_name) or []
            a_sched = (A.get("schedule") or {}).get(day_name) or []
            for i, cell in enumerate(sched):
                if cell and not (a_sched[i] if i < len(a_sched) else None):
                    B = b_full
                    pB = i + 1
                    break
            if B:
                break
        assert B, "no valid teacher B found"

        # Create swap
        r = requests.post(f"{API}/swap/{D_SWAP}", headers=H, json={
            "teacher_a_id": A["id"], "period_a": pA,
            "teacher_b_id": B["id"], "period_b": pB
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "swaps" in data
        assert "rows" in data
        assert len(data["swaps"]) == 1
        assert len(data["rows"]) == 2  # both directions
        swap_id = data["swaps"][0]["id"]

        # GET swap day
        r = requests.get(f"{API}/swap/{D_SWAP}", headers=H)
        assert r.status_code == 200
        assert len(r.json()["swaps"]) == 1

        # Duplicate self-swap should 400
        r = requests.post(f"{API}/swap/{D_SWAP}", headers=H, json={
            "teacher_a_id": A["id"], "period_a": pA,
            "teacher_b_id": A["id"], "period_b": pA
        })
        assert r.status_code == 400

        # Export docx
        r = requests.get(f"{API}/swap/{D_SWAP}/export", headers=H, timeout=30)
        assert r.status_code == 200
        assert len(r.content) > 500

        # Delete swap
        r = requests.delete(f"{API}/swap/{D_SWAP}/{swap_id}", headers=H)
        assert r.status_code == 200
        assert len(r.json()["swaps"]) == 0

        # Clear all
        requests.post(f"{API}/swap/{D_SWAP}", headers=H, json={
            "teacher_a_id": A["id"], "period_a": pA,
            "teacher_b_id": B["id"], "period_b": pB
        })
        r = requests.delete(f"{API}/swap/{D_SWAP}", headers=H)
        assert r.status_code == 200
        assert len(r.json()["swaps"]) == 0

        _cleanup(H, [D_SWAP])

    def test_swap_candidates_exclude_busy_and_absent(self, H, teachers):
        _cleanup(H, [D_SWAP])
        day = requests.get(f"{API}/day/{D_SWAP}", headers=H).json()
        day_name = day["day_name"]
        # Pick A with a period
        A = None; pA = None
        for t in teachers:
            if not t.get("active", True):
                continue
            sched = (t.get("schedule") or {}).get(day_name) or []
            for i, c in enumerate(sched):
                if c:
                    A = t; pA = i + 1; break
            if A:
                break
        assert A
        # Get candidates
        r = requests.get(f"{API}/swap/{D_SWAP}/candidates", headers=H,
                         params={"teacher_id": A["id"], "period": pA})
        assert r.status_code == 200
        cands = r.json()
        cand_ids = {c["id"] for c in cands}
        # Now mark one candidate as absent
        if cand_ids:
            absent_pick = next(iter(cand_ids))
            requests.put(f"{API}/day/{D_SWAP}/absent", headers=H, json={"teacher_ids": [absent_pick]})
            r = requests.get(f"{API}/swap/{D_SWAP}/candidates", headers=H,
                             params={"teacher_id": A["id"], "period": pA})
            new_ids = {c["id"] for c in r.json()}
            assert absent_pick not in new_ids
        _cleanup(H, [D_SWAP])
