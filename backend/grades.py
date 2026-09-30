"""نظام درجات الخيرات — نظام مستقل لإدارة درجات الاختبارات القصيرة."""
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import openpyxl
import jwt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer()

SCHOOL_NAME = "مدرسة الخيرات للبنين ٥-٨"
GRADES = ["الخامس", "السادس", "السابع", "الثامن"]
SUBJECTS = [
    "التربية الاسلامية", "اللغة العربية", "اللغة الانجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية", "التربية البدنية والصحية", "تقنية المعلومات", "الفنون البصرية", "الفنون الموسيقية",
]
SEMESTERS = ["1", "2"]
SEMESTER_LABELS = {"1": "الفصل الدراسي الأول", "2": "الفصل الدراسي الثاني"}
QUIZ_MAX = 10  # كل اختبار قصير من 10


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def level_letter(v):
    if v is None:
        return ""
    return "أ" if v >= 90 else "ب" if v >= 80 else "ج" if v >= 65 else "د" if v >= 50 else "هـ"


def norm_ar(s: str) -> str:
    return (s or "").replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي").strip()


def name_key(s: str) -> str:
    return " ".join(norm_ar(s).split())


GRADE_NUM = {"الخامس": "5", "السادس": "6", "السابع": "7", "الثامن": "8"}
GRADE_BY_NUM = {v: k for k, v in GRADE_NUM.items()}


def _class_sort(c):
    return (GRADE_NUM.get(c["grade"], "9"), int(c["section"]) if str(c["section"]).isdigit() else 99)


def with_classes(t: dict) -> dict:
    """يضمن وجود حقلي المادة والصفوف (للحسابات القديمة تُشتق من التكليفات)."""
    if "classes" not in t:
        seen = {(a["grade"], str(a["section"])) for a in t.get("assignments", [])}
        t["classes"] = sorted([{"grade": g, "section": sec} for g, sec in seen], key=_class_sort)
    if not t.get("subject"):
        t["subject"] = next((a["subject"] for a in t.get("assignments", []) if a.get("subject")), "")
    return t


def build_assignments(subject: str, classes: list) -> list:
    return [{"subject": subject, "grade": c["grade"], "section": str(c["section"])} for c in classes] if subject else []


def _parse_excel(data: bytes):
    try:
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    except Exception:
        raise HTTPException(400, "تعذر قراءة الملف — تأكد أنه ملف Excel صالح (xlsx)")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(400, "الملف فارغ")
    header = [str(c or "").strip() for c in rows[0]]
    return header, rows[1:]


# =================== Models ===================
class LoginReq(BaseModel):
    username: str
    password: str


class ChangePwdReq(BaseModel):
    old_password: str
    new_password: str


class Assignment(BaseModel):
    grade: str
    section: str
    subject: str


class ClassRef(BaseModel):
    grade: str
    section: str


class TeacherCreate(BaseModel):
    name: str
    employee_number: str = ""
    civil_number: str = ""
    subject: str = ""
    classes: List[ClassRef] = []


class StudentCreate(BaseModel):
    name: str
    grade: str = ""
    section: str = ""
    civil_number: str = ""


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    employee_number: Optional[str] = None
    civil_number: Optional[str] = None
    is_active: Optional[bool] = None
    subject: Optional[str] = None
    classes: Optional[List[ClassRef]] = None


class ScoreSave(BaseModel):
    student_id: str
    grade: str
    section: str
    subject: str
    semester: str
    quiz1: Optional[float] = None
    quiz2: Optional[float] = None


class SettingsReq(BaseModel):
    site_closed: Optional[bool] = None
    grades_locked: Optional[bool] = None


def make_router(db, hash_password, verify_password, make_token, jwt_secret, jwt_algorithm):
    router = APIRouter(prefix="/grades")

    # ---- helpers ----
    async def current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
        try:
            payload = jwt.decode(creds.credentials, jwt_secret, algorithms=[jwt_algorithm])
        except jwt.PyJWTError:
            raise HTTPException(401, "جلسة غير صالحة")
        uid = payload.get("uid")
        if not uid:
            raise HTTPException(401, "جلسة غير صالحة")
        user = await db.grades_users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "الحساب غير موجود")
        if not user.get("is_active", True):
            raise HTTPException(403, "تم تعطيل هذا الحساب")
        return {"uid": uid, "role": user.get("role", "teacher"), "user": user}

    def require_admin(u=Depends(current_user)):
        if u["role"] != "admin":
            raise HTTPException(403, "هذه الصلاحية لمدير النظام فقط")
        return u

    async def get_settings():
        s = await db.grades_settings.find_one({}, {"_id": 0})
        return s or {"site_closed": False, "grades_locked": False}

    async def init():
        await db.grades_users.create_index("username", unique=True, sparse=True)
        await db.grades_scores.create_index([("student_id", 1), ("teacher_id", 1), ("semester", 1)], unique=True)
        await db.grades_students.create_index("civil_number", sparse=True)
        admin = await db.grades_users.find_one({"role": "admin"})
        if not admin:
            await db.grades_users.insert_one({
                "id": str(uuid.uuid4()),
                "name": "مدير النظام",
                "employee_number": "",
                "civil_number": "",
                "username": "admin",
                "password_hash": hash_password("admin123"),
                "role": "admin",
                "is_active": True,
                "assignments": [],
                "created_at": now_iso(),
            })

    router.init = init

    # ---- public site status ----
    @router.get("/status")
    async def site_status():
        s = await get_settings()
        return {"site_closed": s.get("site_closed", False), "grades_locked": s.get("grades_locked", False)}

    # ---- auth ----
    @router.post("/auth/login")
    async def login(req: LoginReq):
        s = await get_settings()
        if s.get("site_closed") and req.username != "admin":
            raise HTTPException(403, "النظام مغلق مؤقتاً من قبل الإدارة")
        user = await db.grades_users.find_one({"username": req.username}, {"_id": 0})
        if not user or not verify_password(req.password, user.get("password_hash", "")):
            raise HTTPException(401, "اسم المستخدم أو كلمة المرور غير صحيحة")
        if not user.get("is_active", True):
            raise HTTPException(403, "تم تعطيل هذا الحساب")
        token = make_token({"uid": user["id"], "role": user.get("role", "teacher")})
        return {"token": token, "name": user["name"], "role": user.get("role", "teacher"),
                "username": user["username"], "uid": user["id"]}

    @router.get("/auth/me")
    async def me(u=Depends(current_user)):
        return u["user"]

    @router.post("/auth/change-password")
    async def change_password(req: ChangePwdReq, u=Depends(current_user)):
        user = await db.grades_users.find_one({"id": u["uid"]})
        if not user or not verify_password(req.old_password, user.get("password_hash", "")):
            raise HTTPException(400, "كلمة المرور الحالية غير صحيحة")
        await db.grades_users.update_one({"id": u["uid"]}, {"$set": {"password_hash": hash_password(req.new_password)}})
        return {"ok": True}

    # ---- settings (admin) ----
    @router.get("/settings")
    async def read_settings(u=Depends(require_admin)):
        return await get_settings()

    @router.put("/settings")
    async def write_settings(req: SettingsReq, u=Depends(require_admin)):
        update = {k: v for k, v in req.dict().items() if v is not None}
        await db.grades_settings.update_one({}, {"$set": update}, upsert=True)
        return await get_settings()

    # ---- teachers (admin) ----
    async def find_teacher_by_name(name: str, exclude_id: str = None):
        key = name_key(name)
        async for t in db.grades_users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}):
            if name_key(t.get("name", "")) == key and t["id"] != exclude_id:
                return t
        return None

    @router.get("/teachers")
    async def list_teachers(u=Depends(require_admin)):
        teachers = await db.grades_users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(None)
        # حالة إدخال الدرجات لكل معلم
        for t in teachers:
            with_classes(t)
            count = await db.grades_scores.count_documents({"teacher_id": t["id"]})
            t["entered"] = count > 0
            t["scores_count"] = count
        return {"teachers": teachers}

    @router.put("/teachers/{tid}")
    async def update_teacher(tid: str, req: TeacherUpdate, u=Depends(require_admin)):
        cur = await db.grades_users.find_one({"id": tid, "role": "teacher"}, {"_id": 0})
        if not cur:
            raise HTTPException(404, "المعلم غير موجود")
        update = req.dict(exclude_none=True)
        if "name" in update:
            update["name"] = update["name"].strip()
            if not update["name"]:
                raise HTTPException(400, "الاسم مطلوب")
            if await find_teacher_by_name(update["name"], tid):
                raise HTTPException(400, "يوجد معلم آخر بنفس الاسم")
        if "subject" in update or "classes" in update:
            cur = with_classes(cur)
            subject = update.get("subject", cur["subject"]).strip()
            classes = sorted(update.get("classes", cur["classes"]), key=_class_sort)
            update.update({"subject": subject, "classes": classes, "assignments": build_assignments(subject, classes)})
        if "employee_number" in update or "civil_number" in update:
            emp = update.get("employee_number", cur.get("employee_number", "")).strip()
            civil = update.get("civil_number", cur.get("civil_number", "")).strip()
            update["employee_number"], update["civil_number"] = emp, civil
            new_username = emp or civil
            if new_username and new_username != cur.get("username"):
                if await db.grades_users.find_one({"username": new_username, "id": {"$ne": tid}}):
                    raise HTTPException(400, "الرقم مستخدم لمعلم آخر")
                update["username"] = new_username
        await db.grades_users.update_one({"id": tid}, {"$set": update})
        return {"ok": True}

    @router.delete("/teachers/{tid}")
    async def delete_teacher(tid: str, u=Depends(require_admin)):
        await db.grades_users.delete_one({"id": tid, "role": "teacher"})
        await db.grades_scores.delete_many({"teacher_id": tid})
        return {"ok": True}

    @router.post("/teachers")
    async def add_teacher(body: TeacherCreate, u=Depends(require_admin)):
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "الاسم مطلوب")
        if await find_teacher_by_name(name):
            raise HTTPException(400, "يوجد معلم بنفس الاسم")
        emp, civil = body.employee_number.strip(), body.civil_number.strip()
        username = emp or civil or f"t{uuid.uuid4().hex[:6]}"
        if await db.grades_users.find_one({"username": username}):
            raise HTTPException(400, "يوجد معلم بنفس الرقم الوظيفي/المدني")
        subject = body.subject.strip()
        classes = sorted([c.dict() for c in body.classes], key=_class_sort)
        await db.grades_users.insert_one({
            "id": str(uuid.uuid4()), "name": name,
            "employee_number": emp, "civil_number": civil,
            "username": username, "password_hash": hash_password("123456"),
            "role": "teacher", "is_active": True, "subject": subject, "classes": classes,
            "assignments": build_assignments(subject, classes),
            "created_at": now_iso(),
        })
        return {"ok": True}

    @router.post("/students")
    async def add_student(body: StudentCreate, u=Depends(require_admin)):
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "الاسم مطلوب")
        civil = body.civil_number.strip()
        if civil and await db.grades_students.find_one({"civil_number": civil}):
            raise HTTPException(400, "يوجد طالب بنفس الرقم المدني")
        await db.grades_students.insert_one({
            "id": str(uuid.uuid4()), "name": name, "grade": body.grade.strip(),
            "section": body.section.strip(), "civil_number": civil,
            "created_at": now_iso(),
        })
        return {"ok": True}

    @router.post("/teachers/import-substitution")
    async def import_from_substitution(u=Depends(require_admin)):
        """استيراد المعلمين ومادتهم وصفوفهم من جداول نظام حصص الاحتياط (مطابقة بالاسم بدون تكرار)."""
        added, updated = 0, 0
        async for st in db.sub_teachers.find({}, {"_id": 0}):
            name = (st.get("name") or "").strip()
            if not name:
                continue
            found, cell_subjects = set(), {}
            for cells in (st.get("schedule") or {}).values():
                for c in cells or []:
                    if not c or not c.get("class") or "/" not in c["class"]:
                        continue
                    g, sec = c["class"].split("/", 1)
                    if g in GRADE_BY_NUM:
                        found.add((GRADE_BY_NUM[g], sec.strip()))
                    if c.get("subject"):
                        cell_subjects[c["subject"]] = cell_subjects.get(c["subject"], 0) + 1
            subject = (st.get("subject") or "").strip() or (max(cell_subjects, key=cell_subjects.get) if cell_subjects else "")
            classes = sorted([{"grade": g, "section": sec} for g, sec in found], key=_class_sort)
            data = {"subject": subject, "classes": classes, "assignments": build_assignments(subject, classes)}
            existing = await find_teacher_by_name(name)
            if existing:
                await db.grades_users.update_one({"id": existing["id"]}, {"$set": data})
                updated += 1
            else:
                await db.grades_users.insert_one({
                    "id": str(uuid.uuid4()), "name": name, "employee_number": "", "civil_number": "",
                    "username": f"t{uuid.uuid4().hex[:8]}", "password_hash": hash_password("123456"),
                    "role": "teacher", "is_active": True, "created_at": now_iso(), **data,
                })
                added += 1
        return {"added": added, "updated": updated}

    @router.post("/teachers/import/preview")
    async def preview_teachers_import(file: UploadFile = File(...), u=Depends(require_admin)):
        data = await file.read()
        header, rows = _parse_excel(data)
        suggested = {"name": None, "emp": None, "civil": None}
        for i, h in enumerate(header):
            hl = norm_ar(h)
            if hl in ("الاسم", "اسمالمعلم", "اسم") and suggested["name"] is None:
                suggested["name"] = i
            elif ("الوظيفي" in hl or "الرقمالوظيفي" in hl) and suggested["emp"] is None:
                suggested["emp"] = i
            elif ("المدني" in hl or "الرقمالمدني" in hl) and suggested["civil"] is None:
                suggested["civil"] = i
        sample = [[("" if c is None else str(c)) for c in row] for row in rows[:5]]
        return {"headers": header, "sample_rows": sample, "total_rows": len(rows), "suggested": suggested}

    @router.post("/teachers/import")
    async def import_teachers(
        file: UploadFile = File(...),
        name_col: Optional[str] = Form(None),
        emp_col: Optional[str] = Form(None),
        civil_col: Optional[str] = Form(None),
        u=Depends(require_admin),
    ):
        data = await file.read()
        header, rows = _parse_excel(data)
        if name_col not in (None, ""):
            col_map = {"name": int(name_col)}
            if emp_col not in (None, ""):
                col_map["emp"] = int(emp_col)
            if civil_col not in (None, ""):
                col_map["civil"] = int(civil_col)
        else:
            col_map = {}
            for i, h in enumerate(header):
                hl = norm_ar(h)
                if hl in ("الاسم", "اسمالمعلم", "اسم") and "name" not in col_map:
                    col_map["name"] = i
                elif "الوظيفي" in hl or "الرقمالوظيفي" in hl:
                    col_map["emp"] = i
                elif "المدني" in hl or "الرقمالمدني" in hl:
                    col_map["civil"] = i
        if "name" not in col_map:
            raise HTTPException(400, "يجب تحديد عمود الاسم")
        added, updated, skipped = 0, 0, 0
        seen_names = set()

        def cell(row, key):
            i = col_map.get(key, -1)
            v = row[i] if 0 <= i < len(row) else None
            if isinstance(v, float) and v.is_integer():
                v = int(v)
            return str(v).strip() if v not in (None, "") else ""

        for row in rows:
            name, emp, civil = cell(row, "name"), cell(row, "emp"), cell(row, "civil")
            if not name:
                continue
            key = name_key(name)
            if key in seen_names:
                skipped += 1
                continue
            seen_names.add(key)
            existing = (await db.grades_users.find_one({"role": "teacher", "employee_number": emp}, {"_id": 0}) if emp else None) \
                or await find_teacher_by_name(name)
            if existing:
                upd = {}
                if emp:
                    upd["employee_number"] = emp
                if civil:
                    upd["civil_number"] = civil
                new_username = emp or civil
                if new_username and new_username != existing.get("username") and \
                        not await db.grades_users.find_one({"username": new_username, "id": {"$ne": existing["id"]}}):
                    upd["username"] = new_username
                if upd:
                    await db.grades_users.update_one({"id": existing["id"]}, {"$set": upd})
                updated += 1
            else:
                username = emp or civil or f"t{uuid.uuid4().hex[:6]}"
                if await db.grades_users.find_one({"username": username}):
                    username = f"{username}_{uuid.uuid4().hex[:4]}"
                await db.grades_users.insert_one({
                    "id": str(uuid.uuid4()), "name": name,
                    "employee_number": emp, "civil_number": civil,
                    "username": username, "password_hash": hash_password("123456"),
                    "role": "teacher", "is_active": True, "subject": "", "classes": [], "assignments": [],
                    "created_at": now_iso(),
                })
                added += 1
        return {"added": added, "updated": updated, "skipped": skipped}

    # ---- students (admin) ----
    @router.get("/students")
    async def list_students(grade: Optional[str] = None, section: Optional[str] = None, u=Depends(current_user)):
        q = {}
        if grade:
            q["grade"] = grade
        if section:
            q["section"] = section
        students = await db.grades_students.find(q, {"_id": 0}).sort([("grade", 1), ("section", 1), ("name", 1)]).to_list(None)
        return {"students": students}

    @router.delete("/students/all")
    async def delete_all_students(u=Depends(require_admin)):
        await db.grades_students.delete_many({})
        await db.grades_scores.delete_many({})
        return {"ok": True}

    @router.delete("/students/{sid}")
    async def delete_student(sid: str, u=Depends(require_admin)):
        await db.grades_students.delete_one({"id": sid})
        await db.grades_scores.delete_many({"student_id": sid})
        return {"ok": True}

    @router.post("/students/import/preview")
    async def preview_students_import(file: UploadFile = File(...), u=Depends(require_admin)):
        data = await file.read()
        header, rows = _parse_excel(data)
        suggested = {"name": None, "grade": None, "section": None, "civil": None}
        for i, h in enumerate(header):
            hl = norm_ar(h)
            if hl in ("الاسم", "اسمالطالب", "اسم") and suggested["name"] is None:
                suggested["name"] = i
            elif hl in ("الصف", "الصفالدراسي") and suggested["grade"] is None:
                suggested["grade"] = i
            elif hl in ("الشعبه", "الشعبة", "الصفحه") and suggested["section"] is None:
                suggested["section"] = i
            elif ("المدني" in hl or "الرقمالمدني" in hl) and suggested["civil"] is None:
                suggested["civil"] = i
        sample = [[("" if c is None else str(c)) for c in row] for row in rows[:5]]
        return {"headers": header, "sample_rows": sample, "total_rows": len(rows), "suggested": suggested}

    @router.post("/students/import")
    async def import_students(
        file: UploadFile = File(...),
        name_col: Optional[str] = Form(None),
        grade_col: Optional[str] = Form(None),
        section_col: Optional[str] = Form(None),
        civil_col: Optional[str] = Form(None),
        u=Depends(require_admin),
    ):
        data = await file.read()
        header, rows = _parse_excel(data)
        if name_col not in (None, ""):
            col_map = {"name": int(name_col)}
            if grade_col not in (None, ""):
                col_map["grade"] = int(grade_col)
            if section_col not in (None, ""):
                col_map["section"] = int(section_col)
            if civil_col not in (None, ""):
                col_map["civil"] = int(civil_col)
        else:
            col_map = {}
            for i, h in enumerate(header):
                hl = norm_ar(h)
                if hl in ("الاسم", "اسمالطالب", "اسم") and "name" not in col_map:
                    col_map["name"] = i
                elif hl in ("الصف", "الصفالدراسي") and "grade" not in col_map:
                    col_map["grade"] = i
                elif hl in ("الشعبه", "الشعبة", "الصفحه") and "section" not in col_map:
                    col_map["section"] = i
                elif "المدني" in hl or "الرقمالمدني" in hl:
                    col_map["civil"] = i
        if "name" not in col_map:
            raise HTTPException(400, "يجب تحديد عمود الاسم")
        added, updated = 0, 0
        for row in rows:
            name = str(row[col_map["name"]] or "").strip() if col_map.get("name", -1) < len(row) else ""
            if not name:
                continue
            grade = str(row[col_map["grade"]] if col_map.get("grade", -1) < len(row) and row[col_map["grade"]] else "").strip()
            section = str(row[col_map["section"]] if col_map.get("section", -1) < len(row) and row[col_map["section"]] else "").strip()
            civil = str(row[col_map["civil"]] if col_map.get("civil", -1) < len(row) and row[col_map["civil"]] else "").strip()
            # التحقق من التكرار بالرقم المدني أو الاسم+الصف+الشعبة
            dup_q = {}
            if civil:
                dup_q = {"civil_number": civil}
            else:
                dup_q = {"name": name, "grade": grade, "section": section}
            existing = await db.grades_students.find_one(dup_q)
            if existing:
                await db.grades_students.update_one({"id": existing["id"]}, {"$set": {
                    "name": name, "grade": grade, "section": str(section), "civil_number": civil,
                }})
                updated += 1
            else:
                await db.grades_students.insert_one({
                    "id": str(uuid.uuid4()), "name": name, "grade": grade,
                    "section": str(section), "civil_number": civil,
                    "created_at": now_iso(),
                })
                added += 1
        return {"added": added, "updated": updated}

    # ---- admin stats ----
    @router.get("/admin/stats")
    async def admin_stats(u=Depends(require_admin)):
        total_teachers = await db.grades_users.count_documents({"role": "teacher"})
        total_students = await db.grades_students.count_documents({})
        teachers = await db.grades_users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(None)
        entered_ids = set()
        for t in teachers:
            with_classes(t)
            c = await db.grades_scores.count_documents({"teacher_id": t["id"]})
            t["entered"] = c > 0
            t["scores_count"] = c
            if c > 0:
                entered_ids.add(t["id"])
        # إحصائيات حسب الصف
        by_grade = {}
        for g in GRADES:
            sc = await db.grades_students.count_documents({"grade": g})
            by_grade[g] = sc
        # توزيع الدرجات
        total_scores = await db.grades_scores.count_documents({})
        return {
            "total_teachers": total_teachers,
            "total_students": total_students,
            "teachers_entered": len(entered_ids),
            "teachers_pending": total_teachers - len(entered_ids),
            "total_scores": total_scores,
            "by_grade": by_grade,
            "teachers": teachers,
        }

    # ---- teacher: assignments & students ----
    @router.get("/my/assignments")
    async def my_assignments(u=Depends(current_user)):
        return {"assignments": u["user"].get("assignments", [])}

    @router.get("/my/students")
    async def my_students(grade: str, section: str, u=Depends(current_user)):
        students = await db.grades_students.find({"grade": grade, "section": section}, {"_id": 0}).sort("name", 1).to_list(None)
        return {"students": students}

    @router.get("/my/scores")
    async def my_scores(grade: str, section: str, subject: str, semester: str, u=Depends(current_user)):
        scores = await db.grades_scores.find({
            "teacher_id": u["uid"], "grade": grade, "section": section,
            "subject": subject, "semester": semester,
        }, {"_id": 0}).to_list(None)
        return {"scores": {s["student_id"]: s for s in scores}}

    @router.put("/my/scores")
    async def save_score(req: ScoreSave, u=Depends(current_user)):
        s = await get_settings()
        if s.get("grades_locked"):
            raise HTTPException(403, "تم قفل كتابة الدرجات من قبل الإدارة")
        # التحقق أن المعلم يدرّس هذا الصف/الشعبة/المادة
        ok = any(a["grade"] == req.grade and str(a["section"]) == str(req.section) and a["subject"] == req.subject
                 for a in u["user"].get("assignments", []))
        if not ok and u["role"] != "admin":
            raise HTTPException(403, "لا تملك صلاحية إدخال الدرجات لهذا الصف/الشعبة")
        quiz1 = None if req.quiz1 is None else max(0.0, min(float(req.quiz1), QUIZ_MAX))
        quiz2 = None if req.quiz2 is None else max(0.0, min(float(req.quiz2), QUIZ_MAX))
        doc = {
            "teacher_id": u["uid"], "teacher_name": u["user"]["name"],
            "student_id": req.student_id, "subject": req.subject,
            "grade": req.grade, "section": str(req.section), "semester": req.semester,
            "quiz1": quiz1, "quiz2": quiz2, "updated_at": now_iso(),
        }
        await db.grades_scores.update_one(
            {"student_id": req.student_id, "teacher_id": u["uid"], "semester": req.semester},
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True}

    @router.get("/my/stats")
    async def my_stats(u=Depends(current_user)):
        assignments = u["user"].get("assignments", [])
        out = []
        for a in assignments:
            students = await db.grades_students.find({"grade": a["grade"], "section": str(a["section"])}, {"_id": 0}).to_list(None)
            total_students = len(students)
            for sem in SEMESTERS:
                scores = await db.grades_scores.find({
                    "teacher_id": u["uid"], "grade": a["grade"], "section": str(a["section"]),
                    "subject": a["subject"], "semester": sem,
                }, {"_id": 0}).to_list(None)
                entered = len(scores)
                # من حصل على الدرجة النهائية (quiz1 + quiz2 = 20)
                full = sum(1 for s in scores if (s.get("quiz1") or 0) + (s.get("quiz2") or 0) >= QUIZ_MAX * 2)
                avg = None
                if scores:
                    totals = [(s.get("quiz1") or 0) + (s.get("quiz2") or 0) for s in scores]
                    avg = round(sum(totals) / len(totals), 1)
                out.append({
                    "grade": a["grade"], "section": str(a["section"]), "subject": a["subject"],
                    "semester": sem, "semester_label": SEMESTER_LABELS[sem],
                    "total_students": total_students, "entered": entered,
                    "full_mark": full, "avg": avg,
                })
        return {"stats": out}

    # ---- parent: results by civil number (public) ----
    @router.get("/parent/results")
    async def parent_results(civil_number: str):
        if not civil_number or not civil_number.strip():
            raise HTTPException(400, "أدخل الرقم المدني للطالب")
        civil = civil_number.strip()
        student = await db.grades_students.find_one({"civil_number": civil}, {"_id": 0})
        if not student:
            # محاولة مطابقة مرنة (إزالة المسافات)
            student = await db.grades_students.find_one({"civil_number": {"$regex": f"^{civil.replace(' ', '')}$"}}, {"_id": 0})
        if not student:
            raise HTTPException(404, "لا يوجد طالب بهذا الرقم المدني")
        scores = await db.grades_scores.find({"student_id": student["id"]}, {"_id": 0}).to_list(None)
        # تجميع حسب المادة ثم الفصل
        results = []
        for sub in SUBJECTS:
            sub_scores = [s for s in scores if s.get("subject") == sub]
            if not sub_scores:
                continue
            for sem in SEMESTERS:
                sem_scores = [s for s in sub_scores if s.get("semester") == sem]
                if not sem_scores:
                    continue
                s = sem_scores[0]
                q1, q2 = s.get("quiz1"), s.get("quiz2")
                total = (q1 or 0) + (q2 or 0) if (q1 is not None or q2 is not None) else None
                results.append({
                    "subject": sub, "semester": sem, "semester_label": SEMESTER_LABELS[sem],
                    "quiz1": q1, "quiz2": q2, "total": total,
                    "max": QUIZ_MAX * 2, "level": level_letter(total) if total is not None else "",
                    "teacher": s.get("teacher_name", ""),
                })
        # إحصائيات لكل مادة
        subject_stats = []
        for sub in SUBJECTS:
            sub_results = [r for r in results if r["subject"] == sub and r["total"] is not None]
            if not sub_results:
                continue
            totals = [r["total"] for r in sub_results]
            subject_stats.append({
                "subject": sub,
                "avg": round(sum(totals) / len(totals), 1),
                "best": max(totals),
                "count": len(totals),
            })
        return {"student": student, "results": results, "subject_stats": subject_stats}

    return router
