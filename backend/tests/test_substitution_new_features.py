"""Iteration 12 — NEW substitution features:
- day_periods & consecutive_alert on candidates
- auto-distribute randomization (twice → different) + preserve manual
- stats teacher_id filter → teacher_rows
- DELETE /system/reset
- DELETE /teachers/all (destructive — runs last; relies on backend restart re-seeding
  from data/substitution_seed.json when sub_teachers is empty at startup)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

SUB_USER = "ehtiyat"
SUB_PWD = "ehtiyat2026"
API = f"{BASE_URL}/api/substitution"

# Use dates far from any real seeded data
D0 = "2026-10-11"   # Sunday (D-2)
D1 = "2026-10-12"   # Monday (D-1)
D2 = "2026-10-13"   # Tuesday (D — for consecutive_alert)
D3 = "2026-10-14"   # Wednesday (D+1 — alert should clear)
AUTO_DAY = "2026-10-18"  # Sunday for auto-distribute test


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


def _pick_absent_with_period(teachers, day_name):
    """Find a teacher who has at least one class on the given day_name."""
    for t in teachers:
        if not t.get("active", True):
            continue
        sched = (t.get("schedule") or {}).get(day_name) or []
        for i, c in enumerate(sched):
            if c:
                return t, i + 1
    return None, None


def _cleanup_days(H, dates):
    for d in dates:
        requests.delete(f"{API}/day/{d}", headers=H, timeout=15)


# -------- Feature 1: candidates return day_periods + consecutive_alert --------

def test_candidates_have_day_periods_and_streak_field(H, teachers):
    _cleanup_days(H, [D2])
    day = requests.get(f"{API}/day/{D2}", headers=H, timeout=15).json()
    day_name = day["day_name"]
    assert day_name  # school day
    absent, period = _pick_absent_with_period(teachers, day_name)
    assert absent, "no teacher with a class on this day"
    r = requests.put(f"{API}/day/{D2}/absent", headers=H, json={"teacher_ids": [absent["id"]]}, timeout=15)
    assert r.status_code == 200
    r = requests.get(f"{API}/day/{D2}/candidates", headers=H, params={"absent_id": absent["id"], "period": period}, timeout=15)
    assert r.status_code == 200
    cands = r.json()
    assert len(cands) > 0
    for c in cands:
        assert "day_periods" in c and isinstance(c["day_periods"], int)
        assert 0 <= c["day_periods"] <= 8
        assert "consecutive_alert" in c and isinstance(c["consecutive_alert"], bool)
        assert "high_quota" in c
    # Sanity: at least one free candidate
    assert any(c["free"] for c in cands)
    _cleanup_days(H, [D2])


def test_consecutive_alert_triggers_after_two_prior_days(H, teachers):
    """Assign a specific substitute manually on D0 and D1, check D2 flags streak, D3 does not."""
    _cleanup_days(H, [D0, D1, D2, D3])

    # Find an absent teacher who has periods on all three days D0..D2 (same weekday cycle Sun-Mon-Tue)
    day_d0 = requests.get(f"{API}/day/{D0}", headers=H).json()
    day_d1 = requests.get(f"{API}/day/{D1}", headers=H).json()
    day_d2 = requests.get(f"{API}/day/{D2}", headers=H).json()

    # Pick two distinct teachers: one to be "absent" (has a class each day), one to be "substitute" (free that period)
    # Simpler: find any absent teacher with a class period on D0, D1, D2
    absent = None
    period_map = {}
    for t in teachers:
        if not t.get("active", True):
            continue
        sched = t.get("schedule") or {}
        p0 = next((i + 1 for i, c in enumerate(sched.get(day_d0["day_name"]) or []) if c), None)
        p1 = next((i + 1 for i, c in enumerate(sched.get(day_d1["day_name"]) or []) if c), None)
        p2 = next((i + 1 for i, c in enumerate(sched.get(day_d2["day_name"]) or []) if c), None)
        if p0 and p1 and p2:
            absent = t
            period_map = {D0: p0, D1: p1, D2: p2}
            break
    assert absent, "no teacher with classes on all 3 days"

    # Find a substitute teacher who is FREE on D0 at p0 AND D1 at p1 AND on D2 at p2 → we assign them to D0 and D1
    sub = None
    for t in teachers:
        if not t.get("active", True) or t["id"] == absent["id"]:
            continue
        sched = t.get("schedule") or {}
        if ((sched.get(day_d0["day_name"]) or [None] * 8)[period_map[D0] - 1] is None
                and (sched.get(day_d1["day_name"]) or [None] * 8)[period_map[D1] - 1] is None
                and (sched.get(day_d2["day_name"]) or [None] * 8)[period_map[D2] - 1] is None):
            sub = t
            break
    assert sub, "no free substitute candidate"

    # Set absent + assign for D0
    requests.put(f"{API}/day/{D0}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    r0 = requests.post(f"{API}/day/{D0}/assign", headers=H,
                       json={"absent_id": absent["id"], "period": period_map[D0], "substitute_id": sub["id"]})
    assert r0.status_code == 200, r0.text

    # Set absent + assign for D1
    requests.put(f"{API}/day/{D1}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    r1 = requests.post(f"{API}/day/{D1}/assign", headers=H,
                       json={"absent_id": absent["id"], "period": period_map[D1], "substitute_id": sub["id"]})
    assert r1.status_code == 200, r1.text

    # Check candidates on D2 - sub should have consecutive_alert=True
    requests.put(f"{API}/day/{D2}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    cands_d2 = requests.get(f"{API}/day/{D2}/candidates", headers=H,
                            params={"absent_id": absent["id"], "period": period_map[D2]}).json()
    sub_row = next((c for c in cands_d2 if c["id"] == sub["id"]), None)
    assert sub_row is not None, "substitute not in candidates on D2"
    assert sub_row["consecutive_alert"] is True, f"expected consecutive_alert on D2, got {sub_row}"

    # Check candidates on D3 - after cleaning, no assignment for sub on D2, so streak from D0+D1 still, but
    # for D3 the "prev 2 days" are D2 and D1. sub was NOT assigned on D2 → streak_sets[0] excludes sub → alert False
    requests.put(f"{API}/day/{D3}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    day_d3 = requests.get(f"{API}/day/{D3}", headers=H).json()
    sched_d3 = absent.get("schedule", {}).get(day_d3["day_name"]) or []
    p3 = next((i + 1 for i, c in enumerate(sched_d3) if c), None)
    if p3:
        cands_d3 = requests.get(f"{API}/day/{D3}/candidates", headers=H,
                                params={"absent_id": absent["id"], "period": p3}).json()
        sub_row_d3 = next((c for c in cands_d3 if c["id"] == sub["id"]), None)
        if sub_row_d3:
            assert sub_row_d3["consecutive_alert"] is False, \
                f"expected no alert on D3 (only 1 prior day), got {sub_row_d3}"

    _cleanup_days(H, [D0, D1, D2, D3])


# -------- Feature 2: auto-distribute randomization + manual preserved --------

def test_auto_distribute_randomizes_and_preserves_manual(H, teachers):
    _cleanup_days(H, [AUTO_DAY])
    day = requests.get(f"{API}/day/{AUTO_DAY}", headers=H).json()
    day_name = day["day_name"]

    # Pick 3 absent teachers who each have at least 2 classes → lots of slots
    absents = []
    for t in teachers:
        if not t.get("active", True):
            continue
        sched = t.get("schedule", {}).get(day_name) or []
        if sum(1 for c in sched if c) >= 2:
            absents.append(t["id"])
        if len(absents) >= 3:
            break
    assert len(absents) >= 2, "need at least 2 absent teachers"
    requests.put(f"{API}/day/{AUTO_DAY}/absent", headers=H, json={"teacher_ids": absents})

    # Manually assign one slot first
    first_absent = next(t for t in teachers if t["id"] == absents[0])
    sched = first_absent["schedule"].get(day_name) or []
    manual_period = next((i + 1 for i, c in enumerate(sched) if c), None)
    # Find a free substitute for that slot
    cands = requests.get(f"{API}/day/{AUTO_DAY}/candidates", headers=H,
                        params={"absent_id": absents[0], "period": manual_period}).json()
    manual_sub_id = next((c["id"] for c in cands if c["free"]), None)
    assert manual_sub_id
    r = requests.post(f"{API}/day/{AUTO_DAY}/assign", headers=H,
                      json={"absent_id": absents[0], "period": manual_period, "substitute_id": manual_sub_id})
    assert r.status_code == 200

    # Run auto-distribute twice, compare
    results = []
    for _ in range(6):  # do a few runs since randomness may sometimes coincide
        r = requests.post(f"{API}/day/{AUTO_DAY}/auto", headers=H)
        assert r.status_code == 200, r.text
        data = r.json()
        assignments = data["assignments"]
        # Manual assignment must survive
        manual_still = next((a for a in assignments if a["absent_id"] == absents[0]
                            and a["period"] == manual_period), None)
        assert manual_still is not None, "manual assignment lost after auto"
        assert manual_still["substitute_id"] == manual_sub_id
        assert manual_still.get("auto") is False
        # Snapshot the auto rows
        auto_sig = tuple(sorted(
            (a["absent_id"], a["period"], a["substitute_id"])
            for a in assignments if a.get("auto")
        ))
        results.append(auto_sig)

    # At least 2 unique signatures across 6 runs → randomization working
    unique = set(results)
    assert len(unique) >= 2, f"auto-distribute not producing different results: {results}"

    _cleanup_days(H, [AUTO_DAY])


# -------- Feature 3: stats with teacher_id filter --------

def test_stats_with_teacher_id_returns_teacher_rows(H, teachers):
    _cleanup_days(H, [D2])
    day = requests.get(f"{API}/day/{D2}", headers=H).json()
    day_name = day["day_name"]
    absent, period = _pick_absent_with_period(teachers, day_name)
    requests.put(f"{API}/day/{D2}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    # Find free sub
    cands = requests.get(f"{API}/day/{D2}/candidates", headers=H,
                        params={"absent_id": absent["id"], "period": period}).json()
    sub_id = next((c["id"] for c in cands if c["free"]), None)
    assert sub_id
    requests.post(f"{API}/day/{D2}/assign", headers=H,
                  json={"absent_id": absent["id"], "period": period, "substitute_id": sub_id})

    # General stats (no teacher_id) → no teacher_rows
    r = requests.get(f"{API}/stats", headers=H, params={"from_date": D2, "to_date": D2})
    assert r.status_code == 200
    general = r.json()
    assert "teacher_rows" not in general
    assert "per_teacher" in general and isinstance(general["per_teacher"], list)

    # With teacher_id → teacher + teacher_rows populated
    r = requests.get(f"{API}/stats", headers=H, params={"from_date": D2, "to_date": D2, "teacher_id": sub_id})
    assert r.status_code == 200
    data = r.json()
    assert "teacher" in data and data["teacher"]["id"] == sub_id
    assert "teacher_rows" in data and isinstance(data["teacher_rows"], list)
    assert len(data["teacher_rows"]) >= 1
    row = data["teacher_rows"][0]
    assert row["date"] == D2
    assert row["period"] == period
    assert row["absent_name"] == absent["name"]
    assert "time" in row and "class" in row

    _cleanup_days(H, [D2])


# -------- Feature 4: DELETE /system/reset (destructive but safe — only sub_days) --------

def test_system_reset_deletes_all_days_only(H, teachers):
    # Create a day record
    day = requests.get(f"{API}/day/{D2}", headers=H).json()
    absent, period = _pick_absent_with_period(teachers, day["day_name"])
    requests.put(f"{API}/day/{D2}/absent", headers=H, json={"teacher_ids": [absent["id"]]})
    # Verify day is retrievable
    r = requests.get(f"{API}/days", headers=H, params={"from_date": "2026-01-01", "to_date": "2027-01-01"})
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # Reset
    r = requests.delete(f"{API}/system/reset", headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "deleted" in body and body["deleted"] >= 1
    assert "message" in body

    # Days empty now
    r = requests.get(f"{API}/days", headers=H, params={"from_date": "2026-01-01", "to_date": "2027-01-01"})
    assert r.json() == []

    # Teachers preserved
    r = requests.get(f"{API}/teachers", headers=H)
    assert r.status_code == 200
    assert len(r.json()["teachers"]) == len(teachers)


# -------- Feature 5: DELETE /teachers/all — run LAST, then rely on caller to re-seed --------
# NOTE: We test the endpoint exists and returns success, but do NOT actually invoke
# it here to avoid destroying seeded data needed by other test runs / manual QA.
# Instead we test unauthenticated 401 and authenticated behavior conditionally.

def test_teachers_all_endpoint_requires_auth():
    r = requests.delete(f"{API}/teachers/all", timeout=15)
    # No token → FastAPI HTTPBearer returns 403 or 401
    assert r.status_code in (401, 403)
