"""Tests for the upgraded Question Bank feature.

Covers:
 - GET /api/question-bank (paginated + filters)
 - GET /api/question-bank/meta
 - Image serving via /api/static/bank/...
 - POST /api/question-bank/create-quiz (match excluded, image_url carried)
 - DELETE /api/question-bank/{id} (global-question delete allowed for admin)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"


# ---- auth fixture ----
@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "teacher123"})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


# =========================================================
# List + filters + pagination
# =========================================================
class TestQuestionBankList:
    def test_grade5_total_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers, params={"grade": "5", "limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert set(["questions", "total", "page", "pages"]).issubset(d.keys())
        assert d["total"] == 200, f"grade5 total={d['total']}, expected 200"

    def test_grade6_total_200(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"grade": "6", "limit": 5}).json()
        assert d["total"] == 200

    def test_grade8_total_200(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"grade": "8", "limit": 5}).json()
        assert d["total"] == 200

    def test_grade7_total_0(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"grade": "7", "limit": 5}).json()
        assert d["total"] == 0

    def test_filter_type_match_has_pairs(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"type": "match", "limit": 20}).json()
        assert d["total"] > 0
        for q in d["questions"]:
            assert q["type"] == "match"
            assert isinstance(q.get("pairs"), list)
            assert 3 <= len(q["pairs"]) <= 5, f"pairs count out of range: {len(q['pairs'])}"

    def test_filter_type_mcq_structure(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"type": "mcq", "limit": 20}).json()
        assert d["total"] > 0
        for q in d["questions"]:
            assert q["type"] == "mcq"
            assert isinstance(q.get("options"), list) and len(q["options"]) == 4
            assert q.get("correct_answer") in q["options"], f"correct_answer not in options: {q}"

    def test_filter_cognitive_reasoning(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"cognitive_level": "reasoning", "limit": 10}).json()
        assert d["total"] > 0
        for q in d["questions"]:
            assert q.get("cognitive_level") in ("reasoning", "analysis")

    def test_filter_difficulty_hard(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"difficulty": "hard", "limit": 10}).json()
        assert d["total"] > 0
        for q in d["questions"]:
            assert q["difficulty"] == "hard"

    def test_filter_lesson(self, auth_headers):
        # Pull a real lesson name from meta for grade 5
        meta = requests.get(f"{BASE_URL}/api/question-bank/meta", headers=auth_headers,
                            params={"grade": "5"}).json()
        # pick first lesson
        first_lesson = None
        for u in meta.get("units", []):
            if u.get("lessons"):
                first_lesson = u["lessons"][0]["lesson"]
                break
        assert first_lesson, "no lessons in meta"
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"grade": "5", "lesson": first_lesson, "limit": 10}).json()
        assert d["total"] > 0, f"lesson filter returned 0 for '{first_lesson}'"
        for q in d["questions"]:
            assert q.get("lesson") == first_lesson or q.get("topic") == first_lesson

    def test_text_search(self, auth_headers):
        # Common Arabic keyword; must not 500 and must be self-consistent
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"q": "الحاسوب", "limit": 10}).json()
        assert "total" in d
        for q in d["questions"]:
            assert "الحاسوب" in q["text"]

    def test_combined_filters(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                         params={"grade": "5", "type": "mcq", "difficulty": "easy", "limit": 10}).json()
        for q in d["questions"]:
            assert q["grade"] == "5" and q["type"] == "mcq" and q["difficulty"] == "easy"

    def test_pagination_page2_different_and_pages_10(self, auth_headers):
        p1 = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                          params={"grade": "5", "limit": 20, "page": 1}).json()
        p2 = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                          params={"grade": "5", "limit": 20, "page": 2}).json()
        assert p1["pages"] == 10, f"expected pages=10 got {p1['pages']}"
        ids1 = {q["id"] for q in p1["questions"]}
        ids2 = {q["id"] for q in p2["questions"]}
        assert ids1.isdisjoint(ids2), "page1 and page2 overlap"


# =========================================================
# Meta
# =========================================================
class TestQuestionBankMeta:
    def test_meta_grade5(self, auth_headers):
        d = requests.get(f"{BASE_URL}/api/question-bank/meta", headers=auth_headers,
                         params={"grade": "5"}).json()
        assert d["total"] == 200
        # 3 units for grade 5
        assert len(d["units"]) >= 3, f"expected at least 3 units, got {len(d['units'])}"
        unit_names = {u["unit"] for u in d["units"]}
        # verify at least one expected unit exists
        expected_units = {"أساسيات الحاسوب", "معالجة الكلمات", "الإنترنت"}
        assert expected_units & unit_names, f"unit names: {unit_names}"
        # type counts
        types = d["types"]
        assert types.get("mcq", 0) >= 60, f"mcq count too low: {types}"
        # true_false, short, long, match should exist
        for t in ("true_false", "short", "long", "match"):
            assert t in types, f"missing type {t} in {types}"
        # difficulty + cognitive present
        assert d["difficulty"] and d["cognitive"]


# =========================================================
# Image serving
# =========================================================
class TestBankImages:
    def test_image_serves_jpeg(self, auth_headers):
        # Find any question with an image_url
        image_q = None
        for grade in ("5", "6", "8"):
            page = 1
            while page <= 10 and not image_q:
                d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                                 params={"grade": grade, "limit": 20, "page": page}).json()
                for q in d["questions"]:
                    if q.get("image_url"):
                        image_q = q
                        break
                page += 1
            if image_q:
                break
        assert image_q, "no question with image_url found"
        url = image_q["image_url"]
        full = url if url.startswith("http") else f"{BASE_URL}{url}"
        r = requests.get(full)
        assert r.status_code == 200, f"image fetch failed {r.status_code} {full}"
        assert "image/jpeg" in r.headers.get("content-type", ""), r.headers.get("content-type")
        assert len(r.content) > 1000


# =========================================================
# create-quiz (match excluded + image_url carried)
# =========================================================
class TestCreateQuizFromBank:
    def test_mixed_creates_quiz_without_match(self, auth_headers):
        # Pick 1 match, 2 mcq (with image if possible), 1 true_false — all from grade 5
        def one(params):
            d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                             params={**params, "limit": 5, "grade": "5"}).json()
            assert d["questions"], f"no questions for {params}"
            return d["questions"][0]

        match_q = one({"type": "match"})
        # try to get an mcq with image
        mcq_img = None
        page = 1
        while page <= 10 and not mcq_img:
            d = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                             params={"grade": "5", "type": "mcq", "limit": 20, "page": page}).json()
            for q in d["questions"]:
                if q.get("image_url"):
                    mcq_img = q
                    break
            page += 1
        mcq2 = one({"type": "mcq"})
        tf_q = one({"type": "true_false"})
        ids = [match_q["id"], (mcq_img or mcq2)["id"], mcq2["id"], tf_q["id"]]
        # dedup preserve order
        seen = set(); ids = [i for i in ids if not (i in seen or seen.add(i))]

        r = requests.post(f"{BASE_URL}/api/question-bank/create-quiz", headers=auth_headers,
                          json={"title": "TEST_bank_quiz", "question_ids": ids})
        assert r.status_code == 200, r.text
        quiz = r.json()
        assert "id" in quiz
        # match excluded: quiz has ids-1
        assert len(quiz["questions"]) == len(ids) - 1
        assert not any(qq["type"] == "match" for qq in quiz["questions"])
        # image_url preserved if source had one
        if mcq_img:
            assert any(qq.get("image_url") == mcq_img["image_url"] for qq in quiz["questions"]), \
                "image_url not carried into quiz"

        # cleanup: delete quiz
        qid = quiz["id"]
        dr = requests.delete(f"{BASE_URL}/api/quizzes/{qid}", headers=auth_headers)
        assert dr.status_code in (200, 204, 404)


# =========================================================
# DELETE global question (admin allowed)
# =========================================================
class TestDeleteGlobalQuestion:
    def test_admin_can_delete_one_global(self, auth_headers):
        # get baseline total
        base = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                            params={"grade": "8", "limit": 1}).json()
        before = base["total"]
        assert before > 0
        qid = base["questions"][0]["id"]
        r = requests.delete(f"{BASE_URL}/api/question-bank/{qid}", headers=auth_headers)
        assert r.status_code == 200, r.text
        after = requests.get(f"{BASE_URL}/api/question-bank", headers=auth_headers,
                             params={"grade": "8", "limit": 1}).json()["total"]
        assert after == before - 1, f"total didn't drop: {before} -> {after}"
