"""نظام إدارة حصص الاحتياط — قسم مستقل بحساب دخول خاص."""
import io
import json
import os
import uuid
from datetime import datetime, timezone, timedelta, date as ddate
from pathlib import Path
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from substitution_parser import parse_teacher_pdf, DAYS

ROOT = Path(__file__).parent
SEED_FILE = ROOT / "data" / "substitution_seed.json"
SCHOOL_NAME = "مدرسة الخيرات للبنين ٥-٨"
WEEKDAY_TO_DAY = {6: "الأحد", 0: "الاثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس"}
PERIOD_TIMES = ["7:25 - 8:05", "8:05 - 8:45", "8:45 - 9:25", "9:25 - 10:05", "10:35 - 11:15", "11:15 - 11:55", "11:55 - 12:35", "1:00 - 1:40"]
security = HTTPBearer()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def day_name_of(d: str) -> str:
    return WEEKDAY_TO_DAY.get(ddate.fromisoformat(d).weekday(), "")


def academic_range(d: str):
    dt = ddate.fromisoformat(d)
    y = dt.year if dt.month >= 9 else dt.year - 1
    return f"{y}-09-01", f"{y + 1}-08-31"


def fmt_date_ar(d: str) -> str:
    dt = ddate.fromisoformat(d)
    return f"{dt.day}/{dt.month}/{dt.year}"


class LoginReq(BaseModel):
    username: str
    password: str


class ChangePwdReq(BaseModel):
    old_password: str
    new_password: str


class AbsentReq(BaseModel):
    teacher_ids: List[str]


class AssignReq(BaseModel):
    absent_id: str
    period: int
    substitute_id: Optional[str] = None


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    quota: Optional[int] = None
    active: Optional[bool] = None


class TeacherCreate(BaseModel):
    name: str
    subject: str = ""
    quota: int = 0


def make_router(db, hash_password, verify_password, make_token, jwt_secret, jwt_algorithm):
    router = APIRouter(prefix="/substitution")
    users = db.sub_users
    teachers = db.sub_teachers
    days = db.sub_days

    async def init():
        await teachers.create_index("name")
        await days.create_index("date", unique=True)
        u = os.environ.get("SUB_ADMIN_USERNAME")
        p = os.environ.get("SUB_ADMIN_PASSWORD")
        if u and p:
            existing = await users.find_one({"username": u})
            if not existing:
                await users.insert_one({"id": str(uuid.uuid4()), "username": u, "password_hash": hash_password(p), "name": "إدارة الاحتياط", "created_at": now_iso()})
        if await teachers.count_documents({}) == 0 and SEED_FILE.exists():
            seed = json.loads(SEED_FILE.read_text(encoding="utf-8"))
            docs = [{"id": str(uuid.uuid4()), "order": i, "active": True, **t} for i, t in enumerate(seed)]
            if docs:
                await teachers.insert_many(docs)

    router.init = init

    async def current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
        try:
            payload = jwt.decode(creds.credentials, jwt_secret, algorithms=[jwt_algorithm])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="جلسة غير صالحة")
        if payload.get("role") != "substitution":
            raise HTTPException(status_code=401, detail="هذه الجلسة ليست لنظام الاحتياط")
        user = await users.find_one({"id": payload.get("sub_user_id")}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="الحساب غير موجود")
        return user

    # ---------------- auth ----------------
    @router.post("/auth/login")
    async def login(req: LoginReq):
        username = req.username.strip().lower()
        key = f"sub:{username}"
        att = await db.login_attempts.find_one({"identifier": key})
        if att and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="تم قفل تسجيل الدخول مؤقتاً بسبب محاولات خاطئة متكررة، حاول بعد 15 دقيقة")
        doc = await users.find_one({"username": username})
        if not doc or not verify_password(req.password, doc["password_hash"]):
            count = (att or {}).get("count", 0) + 1
            upd = {"count": count, "locked_until": None}
            if count >= 5:
                upd = {"count": 0, "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
            await db.login_attempts.update_one({"identifier": key}, {"$set": upd}, upsert=True)
            raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
        await db.login_attempts.delete_one({"identifier": key})
        return {"token": make_token({"role": "substitution", "sub_user_id": doc["id"], "username": username}), "name": doc.get("name", ""), "username": username}

    @router.get("/auth/me")
    async def me(u=Depends(current_user)):
        return u

    @router.post("/auth/change-password")
    async def change_password(req: ChangePwdReq, u=Depends(current_user)):
        doc = await users.find_one({"id": u["id"]})
        if not verify_password(req.old_password, doc["password_hash"]):
            raise HTTPException(status_code=400, detail="كلمة المرور القديمة غير صحيحة")
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)")
        await users.update_one({"id": u["id"]}, {"$set": {"password_hash": hash_password(req.new_password)}})
        return {"message": "تم تغيير كلمة المرور"}

    # ---------------- helpers ----------------
    async def load_counts(from_d: str, to_d: str):
        """عدد أيام الغياب وحصص الاحتياط لكل معلم ضمن فترة."""
        abs_c, sub_c = {}, {}
        async for d in days.find({"date": {"$gte": from_d, "$lte": to_d}}, {"_id": 0}):
            for tid in d.get("absent", []):
                abs_c[tid] = abs_c.get(tid, 0) + 1
            for a in d.get("assignments", []):
                sid = a.get("substitute_id")
                if sid:
                    sub_c[sid] = sub_c.get(sid, 0) + 1
        return abs_c, sub_c

    async def get_or_new_day(d: str):
        doc = await days.find_one({"date": d}, {"_id": 0})
        if not doc:
            doc = {"date": d, "day_name": day_name_of(d), "absent": [], "assignments": [], "updated_at": now_iso()}
        return doc

    async def save_day(doc):
        doc["updated_at"] = now_iso()
        await days.update_one({"date": doc["date"]}, {"$set": doc}, upsert=True)

    def slot_of(t, day_name, period):
        sched = t.get("schedule", {}).get(day_name) or [None] * 8
        return sched[period - 1] if 1 <= period <= 8 else None

    async def rank_candidates(doc, tmap, absent_id, period, exclude_busy=True):
        d = doc["date"]
        day_name = doc["day_name"]
        y0, y1 = academic_range(d)
        _, sub_year = await load_counts(y0, y1)
        today_subs = {}
        taken_this_period = set()
        for a in doc["assignments"]:
            if a.get("substitute_id"):
                today_subs[a["substitute_id"]] = today_subs.get(a["substitute_id"], 0) + 1
                if a["period"] == period:
                    taken_this_period.add(a["substitute_id"])
        absent_t = tmap.get(absent_id) or {}
        out = []
        for t in tmap.values():
            if not t.get("active", True) or t["id"] in doc["absent"]:
                continue
            slot = slot_of(t, day_name, period)
            free = slot is None and t["id"] not in taken_this_period
            if exclude_busy and not free:
                continue
            out.append({
                "id": t["id"], "name": t["name"], "subject": t.get("subject", ""), "quota": t.get("quota", 0),
                "subs_year": sub_year.get(t["id"], 0), "subs_today": today_subs.get(t["id"], 0),
                "free": free, "busy_class": (slot or {}).get("class") if slot else None,
                "same_subject": bool(absent_t.get("subject")) and t.get("subject") == absent_t.get("subject"),
                "already_taken": t["id"] in taken_this_period,
            })
        out.sort(key=lambda c: (not c["free"], c["subs_today"], c["subs_year"], c["quota"], c["name"]))
        if out:
            frees = [c for c in out if c["free"]]
            if frees:
                min_q = min(c["quota"] for c in frees)
                min_s = min(c["subs_year"] for c in frees)
                for c in frees:
                    c["least_quota"] = c["quota"] == min_q
                    c["least_subs"] = c["subs_year"] == min_s
        return out

    async def enrich_day(doc):
        tmap = {t["id"]: t async for t in teachers.find({}, {"_id": 0})}
        y0, y1 = academic_range(doc["date"])
        abs_year, sub_year = await load_counts(y0, y1)
        absent = []
        for tid in doc["absent"]:
            t = tmap.get(tid)
            if not t:
                continue
            sched = t.get("schedule", {}).get(doc["day_name"]) or [None] * 8
            periods = []
            for i, cell in enumerate(sched):
                a = next((x for x in doc["assignments"] if x["absent_id"] == tid and x["period"] == i + 1), None)
                periods.append({"period": i + 1, "time": PERIOD_TIMES[i], "class": (cell or {}).get("class"), "subject": (cell or {}).get("subject"),
                                "substitute_id": (a or {}).get("substitute_id"), "substitute_name": tmap.get((a or {}).get("substitute_id"), {}).get("name")})
            absent.append({"id": tid, "name": t["name"], "subject": t.get("subject", ""), "quota": t.get("quota", 0),
                           "absences_year": abs_year.get(tid, 0), "periods": periods})
        rows = []
        for a in sorted(doc["assignments"], key=lambda x: (x["period"], tmap.get(x["absent_id"], {}).get("name", ""))):
            at, st = tmap.get(a["absent_id"], {}), tmap.get(a.get("substitute_id"), {})
            rows.append({**a, "absent_name": at.get("name", ""), "substitute_name": st.get("name", ""), "substitute_subject": st.get("subject", ""), "time": PERIOD_TIMES[a["period"] - 1]})
        is_school = bool(doc["day_name"])
        return {"date": doc["date"], "day_name": doc["day_name"], "is_school_day": is_school, "date_ar": fmt_date_ar(doc["date"]),
                "absent": absent, "assignments": rows, "school_name": SCHOOL_NAME, "updated_at": doc.get("updated_at")}

    # ---------------- teachers ----------------
    @router.get("/teachers")
    async def list_teachers(date: Optional[str] = None, u=Depends(current_user)):
        d = date or ddate.today().isoformat()
        y0, y1 = academic_range(d)
        abs_c, sub_c = await load_counts(y0, y1)
        out = []
        async for t in teachers.find({}, {"_id": 0}).sort("order", 1):
            out.append({**t, "absences": abs_c.get(t["id"], 0), "subs": sub_c.get(t["id"], 0)})
        return {"teachers": out, "academic_range": [y0, y1], "days": DAYS, "period_times": PERIOD_TIMES}

    @router.post("/teachers")
    async def create_teacher(req: TeacherCreate, u=Depends(current_user)):
        n = await teachers.count_documents({})
        doc = {"id": str(uuid.uuid4()), "name": req.name.strip(), "subject": req.subject.strip(), "quota": req.quota,
               "schedule": {d: [None] * 8 for d in DAYS}, "active": True, "order": n}
        await teachers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/teachers/{tid}")
    async def update_teacher(tid: str, req: TeacherUpdate, u=Depends(current_user)):
        upd = {k: v for k, v in req.model_dump().items() if v is not None}
        if "name" in upd:
            upd["name"] = upd["name"].strip()
        r = await teachers.update_one({"id": tid}, {"$set": upd})
        if not r.matched_count:
            raise HTTPException(status_code=404, detail="المعلم غير موجود")
        return await teachers.find_one({"id": tid}, {"_id": 0})

    @router.delete("/teachers/{tid}")
    async def delete_teacher(tid: str, u=Depends(current_user)):
        await teachers.delete_one({"id": tid})
        return {"ok": True}

    @router.post("/teachers/import")
    async def import_pdf(file: UploadFile = File(...), u=Depends(current_user)):
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="يرجى رفع ملف PDF لجداول حصص المعلمين")
        raw = await file.read()
        tmp = ROOT / "data" / f"_import_{uuid.uuid4().hex}.pdf"
        tmp.write_bytes(raw)
        try:
            parsed = parse_teacher_pdf(str(tmp))
        except Exception:
            raise HTTPException(status_code=400, detail="تعذّر قراءة الملف — تأكد أنه ملف جداول المعلمين الصادر من aSc Timetables")
        finally:
            tmp.unlink(missing_ok=True)
        if not parsed:
            raise HTTPException(status_code=400, detail="لم يتم العثور على أي جدول معلم في الملف")
        existing = {t["name"]: t async for t in teachers.find({}, {"_id": 0})}
        added = updated = 0
        seen = set()
        for i, t in enumerate(parsed):
            seen.add(t["name"])
            if t["name"] in existing:
                await teachers.update_one({"name": t["name"]}, {"$set": {"subject": t["subject"], "quota": t["quota"], "schedule": t["schedule"], "active": True, "order": i}})
                updated += 1
            else:
                await teachers.insert_one({"id": str(uuid.uuid4()), "active": True, "order": i, **t})
                added += 1
        deactivated = 0
        for name, t in existing.items():
            if name not in seen and t.get("active", True):
                await teachers.update_one({"id": t["id"]}, {"$set": {"active": False}})
                deactivated += 1
        return {"added": added, "updated": updated, "deactivated": deactivated, "total": len(parsed)}

    # ---------------- day ----------------
    @router.get("/days")
    async def list_days(from_date: str, to_date: str, u=Depends(current_user)):
        out = []
        async for d in days.find({"date": {"$gte": from_date, "$lte": to_date}}, {"_id": 0}).sort("date", -1):
            out.append({"date": d["date"], "day_name": d["day_name"], "date_ar": fmt_date_ar(d["date"]), "absent_count": len(d.get("absent", [])),
                        "assignments_count": len([a for a in d.get("assignments", []) if a.get("substitute_id")])})
        return out

    @router.get("/day/{d}")
    async def get_day(d: str, u=Depends(current_user)):
        return await enrich_day(await get_or_new_day(d))

    @router.put("/day/{d}/absent")
    async def set_absent(d: str, req: AbsentReq, u=Depends(current_user)):
        doc = await get_or_new_day(d)
        if not doc["day_name"]:
            raise HTTPException(status_code=400, detail="هذا اليوم ليس يوماً دراسياً")
        ids = list(dict.fromkeys(req.teacher_ids))
        doc["absent"] = ids
        doc["assignments"] = [a for a in doc["assignments"] if a["absent_id"] in ids and a.get("substitute_id") not in ids]
        await save_day(doc)
        return await enrich_day(doc)

    @router.get("/day/{d}/candidates")
    async def candidates(d: str, absent_id: str, period: int, u=Depends(current_user)):
        doc = await get_or_new_day(d)
        tmap = {t["id"]: t async for t in teachers.find({}, {"_id": 0})}
        return await rank_candidates(doc, tmap, absent_id, period, exclude_busy=False)

    @router.post("/day/{d}/assign")
    async def assign(d: str, req: AssignReq, u=Depends(current_user)):
        doc = await get_or_new_day(d)
        if req.absent_id not in doc["absent"]:
            raise HTTPException(status_code=400, detail="المعلم ليس ضمن الغائبين لهذا اليوم")
        tmap = {t["id"]: t async for t in teachers.find({}, {"_id": 0})}
        absent_t = tmap.get(req.absent_id)
        cell = slot_of(absent_t, doc["day_name"], req.period)
        if not cell:
            raise HTTPException(status_code=400, detail="لا توجد حصة للمعلم الغائب في هذا الوقت")
        doc["assignments"] = [a for a in doc["assignments"] if not (a["absent_id"] == req.absent_id and a["period"] == req.period)]
        if req.substitute_id:
            if req.substitute_id in doc["absent"]:
                raise HTTPException(status_code=400, detail="المعلم البديل غائب اليوم")
            if slot_of(tmap.get(req.substitute_id, {}), doc["day_name"], req.period):
                raise HTTPException(status_code=400, detail="المعلم البديل لديه حصة في هذا الوقت")
            if any(a.get("substitute_id") == req.substitute_id and a["period"] == req.period for a in doc["assignments"]):
                raise HTTPException(status_code=400, detail="المعلم البديل مُكلَّف باحتياط آخر في نفس الحصة")
            doc["assignments"].append({"id": str(uuid.uuid4()), "absent_id": req.absent_id, "period": req.period, "class": cell.get("class"),
                                       "subject": cell.get("subject"), "substitute_id": req.substitute_id, "auto": False})
        await save_day(doc)
        return await enrich_day(doc)

    @router.post("/day/{d}/auto")
    async def auto_distribute(d: str, u=Depends(current_user)):
        doc = await get_or_new_day(d)
        if not doc["absent"]:
            raise HTTPException(status_code=400, detail="حدّد المعلمين الغائبين أولاً")
        tmap = {t["id"]: t async for t in teachers.find({}, {"_id": 0})}
        slots = []
        for tid in doc["absent"]:
            t = tmap.get(tid)
            if not t:
                continue
            for p in range(1, 9):
                cell = slot_of(t, doc["day_name"], p)
                done = any(a["absent_id"] == tid and a["period"] == p and a.get("substitute_id") for a in doc["assignments"])
                if cell and not done:
                    slots.append((p, tid, cell))
        slots.sort(key=lambda s: s[0])
        filled = 0
        for p, tid, cell in slots:
            cands = await rank_candidates(doc, tmap, tid, p, exclude_busy=True)
            if not cands:
                continue
            best = cands[0]
            doc["assignments"].append({"id": str(uuid.uuid4()), "absent_id": tid, "period": p, "class": cell.get("class"),
                                       "subject": cell.get("subject"), "substitute_id": best["id"], "auto": True})
            filled += 1
        await save_day(doc)
        res = await enrich_day(doc)
        res["filled"] = filled
        res["unfilled"] = len(slots) - filled
        return res

    @router.delete("/day/{d}")
    async def clear_day(d: str, u=Depends(current_user)):
        await days.delete_one({"date": d})
        return await enrich_day(await get_or_new_day(d))

    @router.delete("/day/{d}/assignments")
    async def clear_assignments(d: str, u=Depends(current_user)):
        doc = await get_or_new_day(d)
        doc["assignments"] = []
        await save_day(doc)
        return await enrich_day(doc)

    # ---------------- stats ----------------
    @router.get("/stats")
    async def stats(from_date: str, to_date: str, u=Depends(current_user)):
        abs_c, sub_c = await load_counts(from_date, to_date)
        per_day = []
        day_count = 0
        total_abs = total_sub = total_slots = 0
        async for d in days.find({"date": {"$gte": from_date, "$lte": to_date}}, {"_id": 0}).sort("date", 1):
            if not d.get("absent"):
                continue
            day_count += 1
            n_sub = len([a for a in d.get("assignments", []) if a.get("substitute_id")])
            total_abs += len(d["absent"])
            total_sub += n_sub
            per_day.append({"date": d["date"], "date_ar": fmt_date_ar(d["date"]), "day_name": d["day_name"], "absent": len(d["absent"]), "subs": n_sub})
        per_teacher = []
        async for t in teachers.find({}, {"_id": 0, "schedule": 0}).sort("order", 1):
            per_teacher.append({"id": t["id"], "name": t["name"], "subject": t.get("subject", ""), "quota": t.get("quota", 0), "active": t.get("active", True),
                                "absences": abs_c.get(t["id"], 0), "subs": sub_c.get(t["id"], 0)})
        by_subject = {}
        for t in per_teacher:
            s = by_subject.setdefault(t["subject"] or "غير محدد", {"subject": t["subject"] or "غير محدد", "absences": 0, "subs": 0, "teachers": 0})
            s["absences"] += t["absences"]; s["subs"] += t["subs"]; s["teachers"] += 1
        top_subs = sorted([t for t in per_teacher if t["subs"]], key=lambda x: -x["subs"])[:5]
        top_abs = sorted([t for t in per_teacher if t["absences"]], key=lambda x: -x["absences"])[:5]
        return {"from": from_date, "to": to_date, "days": day_count, "total_absences": total_abs, "total_subs": total_sub,
                "per_day": per_day, "per_teacher": per_teacher, "by_subject": list(by_subject.values()), "top_subs": top_subs, "top_abs": top_abs}

    # ---------------- export ----------------
    @router.get("/day/{d}/export")
    async def export_docx(d: str, u=Depends(current_user)):
        from docx import Document
        from docx.shared import Pt, Cm, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement

        data = await enrich_day(await get_or_new_day(d))
        doc = Document()
        sec = doc.sections[0]
        sec.left_margin = sec.right_margin = Cm(1.8)
        sec.top_margin = Cm(1.2)
        sec.bottom_margin = Cm(1.2)

        def rtl(p):
            pPr = p._p.get_or_add_pPr()
            bidi = OxmlElement("w:bidi"); bidi.set(qn("w:val"), "1"); pPr.append(bidi)

        def para(text, size=12, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, color=None):
            p = doc.add_paragraph(); p.alignment = align; rtl(p)
            r = p.add_run(text); r.font.size = Pt(size); r.bold = bold
            r.font.name = "Arial"; r._element.rPr.rFonts.set(qn("w:cs"), "Arial")
            if color:
                r.font.color.rgb = RGBColor.from_string(color)
            p.paragraph_format.space_after = Pt(2)
            return p

        logo = ROOT.parent / "frontend" / "public" / "moe-logo.jpeg"
        if logo.exists():
            lp = doc.add_paragraph(); lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            lp.add_run().add_picture(str(logo), width=Cm(3.2))
        para("سلطنة عمان — وزارة التعليم", 11, color="7A1E1E")
        para("المديرية العامة للتعليم بمحافظة شمال الشرقية", 10)
        para(SCHOOL_NAME, 14, bold=True)
        para(f"توزيع الاحتياط ليوم {data['day_name']} — {data['date_ar']}", 13, bold=True)

        headers = ["م", "المعلم الغائب", "الحصة", "الصف", "المادة", "المعلم البديل", "التوقيع"]
        table = doc.add_table(rows=1, cols=len(headers)); table.style = "Table Grid"; table.alignment = WD_TABLE_ALIGNMENT.CENTER
        tblPr = table._tbl.tblPr
        bidi = OxmlElement("w:bidiVisual"); tblPr.append(bidi)
        for i, h in enumerate(headers):
            c = table.rows[0].cells[i]; c.text = ""
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; rtl(p)
            r = p.add_run(h); r.bold = True; r.font.size = Pt(11)
            shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), "E8E8E8"); c._tc.get_or_add_tcPr().append(shd)
        for i, a in enumerate(data["assignments"], 1):
            row = table.add_row().cells
            vals = [str(i), a["absent_name"], str(a["period"]), a.get("class") or "", a.get("subject") or "", a["substitute_name"], ""]
            for ci, v in enumerate(vals):
                p = row[ci].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; rtl(p)
                r = p.add_run(v); r.font.size = Pt(11)
        if not data["assignments"]:
            row = table.add_row().cells
            row[0].merge(row[-1]); p = row[0].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; rtl(p); p.add_run("لا توجد حصص احتياط لهذا اليوم")
        doc.add_paragraph()
        para("اعتماد إدارة المدرسة", 12, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)
        para("الاسم: .................................        التوقيع: .......................", 11, align=WD_ALIGN_PARAGRAPH.LEFT)
        buf = io.BytesIO(); doc.save(buf); buf.seek(0)
        fname = f"substitution_{d}.docx"
        return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                 headers={"Content-Disposition": f"attachment; filename={fname}"})

    return router
