# PRD — منصة الاختبارات (مدرسة الخيرات للتعليم الأساسي)

## Original Problem Statement
نظام إدارة مدرسي متكامل لمدرسة الخيرات: اختبارات، مشاريع، تقييم سريع، سجلات درجات. مع دعم العام الدراسي (2025/2026 → 2029/2030) وفصلين دراسيين.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) — `/app/backend/server.py`
- **Frontend**: React + TailwindCSS — `/app/frontend/src/`
- **Auth**: JWT
- **LLM**: OpenAI GPT-4o عبر Emergent LLM Key (مولّد بنك الأسئلة)

## Implemented Features

### Core (سابقة)
- مصادقة المعلم + إدارة المدرسين (للمدير)
- اختبارات إلكترونية (MCQ، صح/خطأ، قصير، طويل) + monitor + grading
- مشاريع رقمية وتسليمها
- بنك الأسئلة (مولّد ذكي)
- سجلات الدرجات Grade 5/6 + Grade 7/8 (نموذجان) مع import/export Excel
- بطاقات تقييم (Rubrics) للأنشطة العملية + التقييم من الجوّال
- اختيار العام الدراسي (2025/2026 → 2029/2030) واختيار الفصل (1/2) — لكل معلم تفضيل خاص

### Recent (Feb 2026)
- ✅ صفحة عرض الدرجات للطالب `/my-grades` (نظام قديم — يدخل الاسم بنفسه)
- ✅ إصلاح z-index للنوافذ المنبثقة عبر React Portal
- ✅ **جلسات إرسال الدرجات** (نظام جديد كامل):
  - المعلم ينشئ جلسة لبطاقة تقييم محددة → يحصل على رابط فريد قصير `/g/{CODE}`
  - يشارك الرابط مع الطلاب → الطالب يكتب اسمه + صفه → ينضم
  - نظام مطابقة تلقائية fuzzy للأسماء + مطابقة يدوية بقائمة منسدلة
  - تأكيد/رفض/حذف لكل مشارك
  - عرض إحصائيات حية (انضموا/بانتظار/مؤكدون/مرفوضون)
  - عند الإرسال: كل طالب يرى **معايير التقييم كاملة** ودرجته على كل معيار + الدرجة الإجمالية + درجة السجل
  - إمكانية إعادة فتح الجلسة لإيقاف العرض

## Key API Endpoints
### Auth/Settings
- `POST /api/auth/login`
- `GET /api/academic-years`, `PUT /api/academic-years/current`, `PUT /api/academic-years/semester`

### Grade Sessions (الجديد)
- `POST /api/grade-sessions` — إنشاء جلسة (rubric_id + gradebook_id)
- `GET /api/grade-sessions` — قائمة جلسات المعلم
- `GET /api/grade-sessions/{sid}` — تفاصيل + قائمة الطلاب في السجل
- `DELETE /api/grade-sessions/{sid}` — حذف
- `POST /api/grade-sessions/{sid}/release` — إرسال
- `POST /api/grade-sessions/{sid}/reopen` — إعادة فتح
- `PUT /api/grade-sessions/{sid}/participants/{pid}` — مطابقة/تأكيد/رفض
- `DELETE /api/grade-sessions/{sid}/participants/{pid}` — إزالة مشارك
- `GET /api/public/grade-sessions/{code}` — معلومات عامة (للطالب)
- `POST /api/public/grade-sessions/{code}/join` — انضمام طالب
- `GET /api/public/grade-sessions/{code}/state?participant_id=...` — استعلام عن الحالة

## Data Models
- `grade_sessions`: `{id, code, owner_id, rubric_id, rubric_title, gradebook_id, grade, section, column, column_label, semester, status (open|released|closed), participants[], released_at, created_at}`
- `participants[]` item: `{id, joined_name, joined_grade, joined_section, matched_student_id, matched_student_name, match_confidence, confirmed, ignored, joined_at}`
- `rubric_evaluations`: `{rubric_id, gradebook_id, student_id, scores{cid:val}, total, gb_score}`

## Pending / Backlog
- P2: تقسيم `server.py` (~2615 سطر) إلى وحدات routes/models منفصلة
- P2: سجل تاريخي للجلسات المُرسلة (للطالب الذي يريد رؤية درجات قديمة)
- P3: رسم بياني radar لمقارنة أداء الطالب بمتوسط الصف

## Credentials
ملف `/app/memory/test_credentials.md` — Admin: `admin` / `teacher123`
