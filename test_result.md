#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  المستخدم جلب المشروع من GitHub (https://github.com/alhabsi7772-coder/school.git)
  وأبلغ بأن المعاينة (Preview) لا تفتح. السبب: ملفات .env مفقودة (مُستبعدة من Git
  عبر .gitignore)، مما تسبب في فشل تشغيل الـ Backend برسالة KeyError: 'MONGO_URL'.

backend:
  - task: "إنشاء ملف backend/.env واستعادة تشغيل الـ Backend"
    implemented: true
    working: true
    file: "/app/backend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Bug fix verified."

  - task: "Resource Library (مكتبة الموارد) — Backend APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          تم إضافة قسم كامل لمكتبة الموارد في server.py:
          
          Teacher (auth required):
          - GET  /api/library/me — يعيد library_code, videos_code, resources_count, videos_count
          - POST /api/library/regenerate (body: {kind: 'library'|'videos'}) — توليد رمز جديد
          - GET  /api/resources — قائمة موارد المعلم
          - POST /api/resources/upload (multipart: file, title, description, grades CSV, is_active) — رفع ملف حتى 30MB
          - PUT  /api/resources/{rid} — تحديث (title, description, grades, is_active)
          - DELETE /api/resources/{rid}
          - GET  /api/resources/{rid}/downloads — سجل من نزّل
          - GET  /api/videos — قائمة الفيديوهات
          - POST /api/videos/youtube — إضافة فيديو YouTube (json: title, description, youtube_url, grades, allow_comments, is_active)
          - POST /api/videos/upload — رفع فيديو محلي (multipart)
          - PUT/DELETE /api/videos/{vid}
          - GET  /api/videos/{vid}/views — سجل المشاهدين
          - GET  /api/videos/{vid}/comments — التعليقات
          - DELETE /api/videos/{vid}/comments/{cid} — حذف تعليق
          
          Public (student):
          - GET  /api/library/check/{code} — التحقق من رمز المكتبة
          - POST /api/library/{code}/access (body: student_name, grade, section) — انضمام، يعيد access_id
          - GET  /api/library/{code}/resources?access_id=... — قائمة الموارد المسموحة لصف الطالب
          - GET  /api/library/{code}/download/{rid}?access_id=... — تنزيل (يسجل في resource_access)
          - GET  /api/videos-library/check/{code}
          - POST /api/videos-library/{code}/access
          - GET  /api/videos-library/{code}/videos?access_id=...
          - GET  /api/videos-library/{code}/video/{vid}?access_id=... — يرجع بيانات الفيديو ويسجل المشاهدة
          - GET  /api/videos-library/{code}/video/{vid}/stream?access_id=... — لتشغيل الملفات المرفوعة
          - GET  /api/videos-library/{code}/video/{vid}/comments?access_id=...
          - POST /api/videos-library/{code}/video/{vid}/comments (body: access_id, text)
          
          Storage:
          - الموارد: /app/backend/uploads/resources/{uuid}{ext}
          - الفيديوهات المرفوعة: /app/backend/uploads/videos/{uuid}{ext}
          - الحد الأقصى: 30MB لكل ملف
          - الصفوف المعتمدة: الخامس/السادس/السابع/الثامن
          
          Verified manually:
          - admin/teacher123 login → token works
          - GET /api/library/me with admin token → returns library_code & videos_code
          - GET /api/library/check/INVALID → returns 404
          
          يحتاج اختبار شامل لتدفقات المعلم والطالب.
      - working: true
        agent: "testing"
        comment: |
          ✅ اختبار شامل ناجح - جميع الاختبارات نجحت (6/6 test suites, 100% pass rate)
          
          تم اختبار جميع المسارات بنجاح:
          
          A) Teacher: Library codes ✅
          - GET /api/library/me → يعيد library_code (6 أحرف), videos_code (6 أحرف), resources_count, videos_count
          - POST /api/library/regenerate → يولد رمز جديد مختلف
          - التحقق من الرمز الجديد في GET /api/library/me
          
          B) Resources CRUD + Student flow ✅
          - POST /api/resources/upload → رفع ملف نصي (58 bytes) بنجاح مع grades=[الخامس, السادس]
          - GET /api/resources → المورد موجود مع download_count=0
          - PUT /api/resources/{id} → تحديث title و grades=[الخامس] فقط
          - GET /api/library/check/{code} → 200 مع owner_name و school_name
          - GET /api/library/check/NOPE → 404 (رمز خاطئ)
          - POST /api/library/{code}/access → طالب "أحمد علي" (الخامس) انضم بنجاح
          - GET /api/library/{code}/resources → الطالب يرى المورد
          - GET /api/library/{code}/download/{rid} → تنزيل ناجح مع محتوى صحيح
          - GET /api/resources/{id}/downloads → المعلم يرى سجل التنزيل لـ "أحمد علي"
          - Negative test: طالب "الثامن" لا يرى المورد المخصص لـ "الخامس" ✅
          - Negative test: تنزيل مباشر من طالب "الثامن" → 403 ✅
          - Negative test: access_id خاطئ → 401 ✅
          
          C) Videos: YouTube ✅
          - POST /api/videos/youtube → فيديو YouTube (dQw4w9WgXcQ) أُضيف بنجاح
          - POST /api/videos/youtube مع URL خاطئ → 400 ✅
          - GET /api/videos → الفيديو موجود في القائمة
          - PUT /api/videos/{vid} → تحديث العنوان بنجاح
          - GET /api/videos-library/check/{code} → 200 مع kind="videos"
          - POST /api/videos-library/{code}/access → طالب "سالم" (الخامس) انضم
          - GET /api/videos-library/{code}/videos → الطالب يرى الفيديو
          - GET /api/videos-library/{code}/video/{vid} → مشاهدة الفيديو (تسجيل المشاهدة)
          - GET /api/videos/{vid}/views → المعلم يرى سجل المشاهدة لـ "سالم"
          - POST comment → تعليق "شكراً للشرح" أُضيف بنجاح
          - POST نفس التعليق مرتين → مسموح ✅
          - GET comments (student) → 2 تعليقات
          - GET comments (teacher) → 2 تعليقات
          - DELETE comment → حذف ناجح
          - PUT {allow_comments:false} → تعطيل التعليقات
          - POST comment بعد التعطيل → 403 ✅
          
          D) Videos: Upload ✅
          - POST /api/videos/upload → رفع فيديو MP4 (3600 bytes) بنجاح
          - GET /api/videos-library/{code}/video/{vid}/stream → تشغيل الفيديو (3600 bytes)
          - DELETE /api/videos/{vid} → حذف الفيديو
          - التحقق من حذف الملف → 404 ✅
          
          E) Edge Cases ✅
          - رفع ملف > 30MB → 413 ✅
          - رفع بدون ملف → 422 ✅
          - الرمز case-insensitive (lowercase يعمل) ✅
          - استخدام library access_id على videos endpoint → 401 ✅
          - حذف مورد معلم آخر → 404 ✅
          
          F) Cleanup ✅
          - DELETE resource → حذف ناجح
          - التحقق من حذف الملف → 404 ✅
          - التحقق من إزالة من القائمة ✅
          - DELETE YouTube video → حذف ناجح
          
          جميع الوظائف تعمل بشكل صحيح:
          - تسجيل الدخول والمصادقة
          - إدارة الرموز (library_code, videos_code)
          - رفع وإدارة الموارد والفيديوهات
          - التحكم بالصلاحيات حسب الصف
          - تسجيل التنزيلات والمشاهدات
          - نظام التعليقات
          - التحقق من الأخطاء والحالات الاستثنائية
          - حذف الملفات من القرص والقاعدة
          
          لا توجد مشاكل حرجة. التطبيق جاهز للإنتاج.

  - task: "Per-Video Share Links (مشاركة فيديو فردية) — Backend"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Major architecture change: replaced unified videos library with per-video share codes.
          Each video now has unique 6-char share_code (uppercase A-Z0-9).
          
          NEW endpoints:
          - GET  /api/video-share/check/{code} — public; returns {title, grades, owner_name, school_name}
          - POST /api/video-share/{code}/access {student_name, grade, section} → access_id; enforces grade restriction
          - GET  /api/video-share/{code}?access_id=... — returns video data, logs view (deduplicated)
          - GET  /api/video-share/{code}/stream?access_id=... — for uploaded videos
          - GET  /api/video-share/{code}/comments?access_id=...
          - POST /api/video-share/{code}/comments {access_id, text}
          
          Video creation:
          - POST /api/videos/youtube now returns share_code
          - POST /api/videos/upload now returns share_code
          - GET /api/videos includes lazy migration (backfills share_code for old videos)
          
          Features:
          - Grade restriction: 403 if student grade not in video.grades
          - allow_comments toggle
          - is_active toggle (filters in all public endpoints)
          - Cross-kind isolation (kind='video' vs kind='library')
          - Case-insensitive code handling (backend uppercases)
          
          Needs comprehensive testing.
      - working: true
        agent: "testing"
        comment: |
          ✅ اختبار شامل ناجح - جميع الاختبارات نجحت (32/32 tests, 100% pass rate)
          
          تم اختبار جميع المسارات بنجاح:
          
          [1] Setup & Video Creation ✅
          - Login admin/teacher123 → token received
          - POST /api/videos/youtube (grades=["الخامس"]) → share_code (6 chars uppercase)
          - POST /api/videos/youtube (grades=[]) → different share_code
          - GET /api/videos → all videos have share_code (lazy migration verified)
          
          [2] Public Endpoints - Check ✅
          - GET /api/video-share/check/{code} → 200 with {title, grades, owner_name, school_name}
          - Verified NO storage_filename or owner_id leaked
          - GET /api/video-share/check/INVALID → 404
          - GET /api/video-share/check/{code.lower()} → 200 (uppercase handling works)
          
          [3] Student Access & Grade Restriction ✅
          - POST /api/video-share/{code}/access (student="أحمد علي", grade="الخامس") → access_id
          - POST access with grade="الثامن" on restricted video → 403 (grade not allowed)
          - POST access with missing fields → 422
          - POST access with invalid grade (not in approved list) → 400
          - POST access to open video (grades=[]) with any grade → 200
          
          [4] Video Access & View Logs ✅
          - GET /api/video-share/{code}?access_id=... → 200 with video data
          - Called same endpoint twice → view NOT duplicated (deduplication works)
          - GET /api/videos/{vid}/views (teacher) → contains "أحمد علي"
          - GET /api/video-share/{code} without access_id → 422
          - GET /api/video-share/{code}?access_id=BOGUS → 401
          
          [5] Comments ✅
          - POST /api/video-share/{code}/comments {access_id, text:"شكراً للشرح"} → 200
          - GET /api/video-share/{code}/comments → contains posted comment
          - POST second comment → 200
          - POST empty text → 400
          - POST text > 1000 chars → 400
          
          [6] Toggle allow_comments ✅
          - PUT /api/videos/{vid} {allow_comments:false} → 200
          - POST comment after disable → 403
          
          [7] Toggle is_active ✅
          - PUT /api/videos/{vid} {is_active:false} → 200
          - GET /api/video-share/check/{code} → 404 (filters is_active:true)
          - POST /api/video-share/{code}/access → 404
          - PUT /api/videos/{vid} {is_active:true, allow_comments:true} → 200
          - GET /api/video-share/check/{code} → 200 again
          
          [8] Cross-kind Isolation ✅
          - Used video access_id (kind='video') on /api/library/{code}/resources → 401
          - Created library access_id (kind='library') and used on /api/video-share/{code} → 401
          
          [9] Stream Test (Optional - Uploaded Video) ✅
          - POST /api/videos/upload with small mp4 → share_code generated
          - POST /api/video-share/{code}/access → access_id
          - GET /api/video-share/{code}/stream?access_id=... → 200 with binary content
          
          [10] Cleanup ✅
          - DELETE /api/videos/{vid} × 2 → 200 each
          
          جميع الوظائف تعمل بشكل صحيح:
          - توليد share_code فريد لكل فيديو (6 أحرف uppercase)
          - Lazy migration للفيديوهات القديمة
          - التحقق من الرموز (check endpoint)
          - انضمام الطلاب مع فلتر الصفوف
          - مشاهدة الفيديوهات وتسجيل المشاهدات (مع deduplication)
          - نظام التعليقات
          - تفعيل/تعطيل التعليقات والفيديوهات
          - عزل الأنواع (video vs library access)
          - تشغيل الفيديوهات المرفوعة (stream)
          - معالجة الرموز case-insensitive
          
          لا توجد مشاكل حرجة. ميزة Per-Video Share Links جاهزة للإنتاج.

frontend:
  - task: "إنشاء ملف frontend/.env"
    implemented: true
    working: "NA"
    file: "/app/frontend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "تم إنشاء .env بنجاح. لن يتم اختبار الـ Frontend إلا بعد إذن المستخدم."

  - task: "Resource Library — Frontend (Teacher + Student pages)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/teacher/LibraryResources.jsx + others"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Initial scaffold of 6 React pages + nav item added.
      - working: "NA"
        agent: "main"
        comment: |
          UI redesign + multi-select + bundle creation feature:
          - Replaced square cards with rounded-3xl cards, gradient borders,
            file-type colored icons (audio purple, image yellow, video red, etc.),
            top accent line, hover -translate-y, glass blur effects.
          - Added selection mode (checkbox per card), "Select All", and "Create
            shared link" CTA.
          - Added "Custom Links" panel with list of existing bundles, copy,
            and delete.
          - Library code card now has decorative radial gradients and rounded-3xl.
          - StudentLibrary now also serves /b/:code (bundles) — auto-detected
            by route; switches accent color to fuchsia and uses 'bundle' API.
          - Added /b/:code route in App.js.
          - All cards use rounded-3xl/rounded-2xl matching site language.

  - task: "Resource Bundles (Custom Share Links) — Backend"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New endpoints for sharing specific resources as a bundle with own code:
          
          Teacher (auth):
          - GET    /api/bundles → list teacher's bundles with `actual_count`
          - POST   /api/bundles { title, resource_ids } → creates bundle with unique 6-char code (uppercase letters+digits, deduped). Validates ownership of resource_ids.
          - PUT    /api/bundles/{bid} { title?, resource_ids?, is_active? }
          - DELETE /api/bundles/{bid}
          
          Public student:
          - GET   /api/bundle/check/{code} → 200 {kind:'bundle', title, owner_name, school_name, resources_count} or 404
          - POST  /api/bundle/{code}/access { student_name, grade, section } → access_id (stored in library_access with kind='bundle' and bundle_id)
          - GET   /api/bundle/{code}/resources?access_id=... → returns bundle resources in saved order (no grade filtering — teacher explicitly chose them)
          - GET   /api/bundle/{code}/download/{rid}?access_id=... → streams file and logs in resource_access with bundle_id
          
          - Bundle inactive or missing resource → handled with 404
          - Resource not in bundle → 404
          - access_id of different kind → 401
          
          Manual smoke tests: GET /bundles returns []; check INVALID returns 404. Needs full E2E test suite.
      - working: true
        agent: "testing"
        comment: |
          ✅ اختبار شامل ناجح - جميع الاختبارات نجحت (31/31 test cases, 100% pass rate)
          
          تم اختبار جميع المسارات بنجاح:
          
          A) Teacher: Bundle Management ✅
          - POST /api/bundles → إنشاء حزمة مع 3 موارد (رمز 6 أحرف، is_active=true)
          - POST /api/bundles مع resource_ids فارغة → 400 ✅
          - POST /api/bundles مع معرفات مختلطة (صالحة + غير صالحة) → يحتفظ بالصالحة فقط ✅
          - POST /api/bundles مع معرفات غير صالحة فقط → 400 "لا توجد موارد صالحة" ✅
          - GET /api/bundles → الحزمة موجودة مع actual_count=3 ✅
          - PUT /api/bundles/{bid} → تحديث العنوان بنجاح ✅
          - PUT /api/bundles/{bid} → تحديث resource_ids (إزالة R3، بقي R1+R2) ✅
          - PUT /api/bundles/{fake-uuid} → 404 ✅
          - DELETE /api/bundles/{bid} → حذف ناجح ✅
          
          B) Public Student: Bundle Check ✅
          - GET /api/bundle/check/{code} → 200 {kind:'bundle', title, owner_name, school_name, resources_count:2} ✅
          - GET /api/bundle/check/NOPE12 → 404 ✅
          - GET /api/bundle/check/{code.lower()} → 200 (backend uppercases) ✅
          
          C) Public Student: Access & Resources ✅
          - POST /api/bundle/{code}/access → طالب "خالد علي" (الثامن) انضم بنجاح ✅
            (ملاحظة: الموارد كانت للخامس/السابع، لكن الحزمة تتجاوز فلتر الصفوف)
          - POST /api/bundle/{code}/access بدون grade → 400/422 ✅
          - POST /api/bundle/{code}/access مع grade غير معتمد → 400 ✅
          - GET /api/bundle/{code}/resources → يعيد 2 موارد (R1, R2) بالترتيب الصحيح ✅
          - التحقق من عدم وجود storage_filename في الاستجابة ✅
          - GET /api/bundle/{code}/download/{R1} → 200 مع محتوى صحيح و Content-Disposition ✅
          - GET /api/bundle/{code}/download/{R3} → 404 "ليس ضمن الحزمة" ✅
          - GET /api/resources/{R1}/downloads → سجل التنزيل يحتوي على {student_name:"خالد علي", grade:"الثامن", section:"3", action:"download", bundle_id} ✅
          
          D) Cross-Kind Isolation ✅
          - استخدام bundle access_id على /api/library/{code}/resources → 401 (kind mismatch) ✅
          - استخدام library access_id على /api/bundle/{code}/resources → 401 (kind mismatch) ✅
          
          E) is_active Toggle ✅
          - PUT /api/bundles/{bid} {is_active:false} → 200 ✅
          - GET /api/bundle/check/{code} → 404 (bundle inactive) ✅
          - GET /api/bundle/{code}/resources → 404 (bundle inactive) ✅
          - PUT /api/bundles/{bid} {is_active:true} → 200 ✅
          - GET /api/bundle/check/{code} → 200 (bundle active again) ✅
          
          F) Cleanup ✅
          - DELETE /api/bundles/{bid} → 200 ✅
          - GET /api/bundle/check/{code} → 404 ✅
          - GET /api/bundles → الحزمة المحذوفة غير موجودة ✅
          - DELETE /api/resources/{id} × 3 → حذف جميع الموارد ✅
          
          جميع الوظائف تعمل بشكل صحيح:
          - إنشاء وإدارة الحزم (bundles)
          - توليد رموز فريدة (6 أحرف uppercase)
          - التحقق من ملكية الموارد
          - انضمام الطلاب وتنزيل الموارد
          - تجاوز فلتر الصفوف (bundle bypasses grade filter)
          - تسجيل التنزيلات مع bundle_id
          - عزل الأنواع (kind='bundle' vs kind='library')
          - تفعيل/تعطيل الحزم
          - حذف الحزم
          
          لا توجد مشاكل حرجة. ميزة Resource Bundles جاهزة للإنتاج.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 5
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Major redesign: per-video share codes replace the unified videos library.
      Each video gets its own 6-char share_code; student opens /watch/{code}.
      
      NEW backend endpoints (test these):
      - GET  /api/video-share/check/{code} → public; returns {title, grades, ...} or 404
      - POST /api/video-share/{code}/access {student_name, grade, section}
        → access_id; enforces grade restriction (403 if not in allowed grades)
      - GET  /api/video-share/{code}?access_id=... → returns video, logs view
      - GET  /api/video-share/{code}/stream?access_id=... (uploaded only)
      - GET  /api/video-share/{code}/comments?access_id=...
      - POST /api/video-share/{code}/comments {access_id, text}
      
      Also: every new video gets share_code on creation (both /videos/youtube
      and /videos/upload). Lazy migration runs in GET /api/videos to backfill.
      
      Test sequence:
      1. Login admin/teacher123.
      2. POST /api/videos/youtube {title:"درس 1", youtube_url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ", grades:["الخامس"], allow_comments:true, is_active:true} → returns share_code (6 chars).
      3. POST /api/videos/youtube {title:"درس عام", youtube_url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ", grades:[], allow_comments:true, is_active:true} → another share_code.
      4. GET /api/videos → both videos have share_code field.
      5. GET /api/video-share/check/{share_code1} (no auth) → 200 with grades=["الخامس"].
      6. GET /api/video-share/check/INVALID → 404.
      7. POST /api/video-share/{code1}/access {student_name:"أحمد", grade:"الخامس", section:"1"} → access_id.
      8. POST /api/video-share/{code1}/access {student_name:"ب", grade:"الثامن", section:"2"} → 403 (grade not allowed).
      9. POST /api/video-share/{code2}/access {student_name:"خ", grade:"الثامن", section:"1"} → 200 (no grade restriction).
      10. GET /api/video-share/{code1}?access_id=<accAhmed> → returns video. View logged once.
      11. Call same again → view NOT duplicated (same student+grade+section).
      12. GET /api/videos/{vid1}/views (teacher) → contains "أحمد".
      13. POST /api/video-share/{code1}/comments {access_id:<accAhmed>, text:"شكراً"} → 200.
      14. GET /api/video-share/{code1}/comments?access_id=<accAhmed> → contains it.
      15. PUT /api/videos/{vid1} {allow_comments:false} → ok.
      16. POST same comment → 403.
      17. PUT /api/videos/{vid1} {is_active:false} → ok. GET /api/video-share/check/{code1} → 404.
      18. Cross-kind: try using accAhmed (kind='video') on /api/library/{anylib}/resources → 401.
      
      Also for code uppercasing: send lowercase code → should still work.
      
      DO NOT test frontend. Credentials in /app/memory/test_credentials.md.
      
      Test plan for the NEW endpoints only (don't retest other library APIs):
      
      1. Login admin/teacher123 → token.
      2. Upload 3 resources via /api/resources/upload with different grades (one for الخامس only, one for السابع, one open to all).
      3. POST /api/bundles {title:"مراجعة 1", resource_ids:[id1, id2, id3]} → returns id + code (6 chars) + resource_ids, is_active=true.
      4. POST /api/bundles with empty resource_ids → 400.
      5. POST /api/bundles with foreign resource_id (e.g. random uuid not owned) → only valid IDs kept; if none → 400.
      6. GET /api/bundles → contains the new bundle with actual_count == 3.
      7. PUT /api/bundles/{bid} {title:"مراجعة محدثة"} → ok; GET shows updated.
      8. PUT /api/bundles/{bid} {resource_ids:[id1, id2]} → only those remain.
      9. GET /api/bundle/check/{code} (no auth) → {kind:'bundle', title, resources_count:2}.
      10. GET /api/bundle/check/INVALID → 404.
      11. POST /api/bundle/{code}/access {student_name:"خالد", grade:"الثامن", section:"3"} → access_id. Note: student is الثامن but resources were originally for الخامس/السابع — bundle should still grant access.
      12. GET /api/bundle/{code}/resources?access_id=... → returns 2 resources (in saved order).
      13. GET /api/bundle/{code}/download/{id1}?access_id=... → 200 + file body.
      14. GET /api/resources/{id1}/downloads (teacher) → row includes {student_name:"خالد", grade:"الثامن", section:"3", action:"download"} (and bundle_id present).
      15. Try downloading a resource_id NOT in bundle via /api/bundle/{code}/download/{otherId} → 404.
      16. Try the bundle access_id on /api/library/{anycode}/resources → 401 (kind mismatch).
      17. Set bundle inactive via PUT {is_active:false} → check/access/resources/download return 404 (since query filters is_active:true).
      18. DELETE /api/bundles/{bid} → 200; subsequent check → 404.
      19. Code uppercasing: send lowercase code in check/access/resources → backend uppercases input, should work (we did .upper() everywhere).
      
      Credentials in /app/memory/test_credentials.md.
      DO NOT test frontend (will ask user separately).
  - agent: "testing"
    message: |
      ✅ Resource Bundles Backend Testing Complete - 100% Success (31/31 tests passed)
      
      Comprehensive testing completed for all Resource Bundles endpoints:
      
      ✅ Teacher Bundle Management (9 tests)
         - Create, list, update, delete bundles
         - Validation of resource ownership
         - Error handling for invalid inputs
      
      ✅ Public Student Access (11 tests)
         - Bundle check and access
         - Resource listing and downloads
         - Grade filter bypass (bundle-specific behavior)
         - Download logging with bundle_id
      
      ✅ Security & Isolation (2 tests)
         - Cross-kind access_id validation
         - Library vs Bundle isolation
      
      ✅ State Management (5 tests)
         - is_active toggle
         - Inactive bundle access prevention
      
      ✅ Cleanup & Edge Cases (4 tests)
         - Bundle deletion
         - Resource cleanup
         - Case-insensitive code handling
      
      All endpoints working correctly. No critical issues found.
      Feature is production-ready.
  - agent: "testing"
    message: |
      ✅ تم التحقق من إصلاح المشكلة بنجاح - جميع اختبارات الـ Backend نجحت (9/9).
      
      تم اختبار:
      - تسجيل الدخول (admin و teacher) - يعمل بشكل صحيح
      - رفض تسجيل الدخول بكلمة مرور خاطئة - يعمل بشكل صحيح
      - جميع مسارات API الأساسية (quizzes, projects, gradebooks, rubrics) - تعمل
      - مسار admin/teachers - يعمل ويرجع 4 حسابات
      
      الخدمات تعمل بشكل صحيح:
      - Backend: RUNNING (pid 787)
      - Frontend: RUNNING (pid 791)
      - MongoDB: RUNNING (pid 50)
      
      لا توجد أخطاء في backend logs. المشكلة تم حلها بالكامل.
      الـ Backend جاهز للاستخدام. Frontend لم يتم اختباره (حسب التعليمات).
  - agent: "testing"
    message: |
      ✅ اختبار شامل لميزة مكتبة الموارد - نجح بنسبة 100%
      
      تم تنفيذ 6 مجموعات اختبار شاملة (6/6 passed):
      
      ✅ A) Teacher: Library codes
         - توليد وإدارة رموز المكتبة (library_code, videos_code)
         - إعادة توليد الرموز
      
      ✅ B) Resources CRUD + Student flow
         - رفع الموارد (ملفات نصية، صور، إلخ)
         - إدارة الموارد (قراءة، تحديث، حذف)
         - انضمام الطلاب وتنزيل الموارد
         - تسجيل التنزيلات
         - التحكم بالصلاحيات حسب الصف
      
      ✅ C) Videos: YouTube
         - إضافة فيديوهات YouTube
         - إدارة الفيديوهات
         - مشاهدة الفيديوهات وتسجيل المشاهدات
         - نظام التعليقات (إضافة، عرض، حذف)
         - تفعيل/تعطيل التعليقات
      
      ✅ D) Videos: Upload
         - رفع ملفات الفيديو
         - تشغيل الفيديوهات المرفوعة
         - حذف الفيديوهات والملفات
      
      ✅ E) Edge Cases
         - رفض الملفات الكبيرة (>30MB)
         - التحقق من الرموز الخاطئة
         - التحقق من الصلاحيات
         - الرموز case-insensitive
      
      ✅ F) Cleanup
         - حذف الموارد والفيديوهات
         - التحقق من حذف الملفات من القرص
      
      جميع الـ APIs تعمل بشكل صحيح. لا توجد مشاكل حرجة.
      التطبيق جاهز للإنتاج.

  - agent: "testing"
    message: |
      ✅ Per-Video Share Links Backend Testing Complete - 100% Success (32/32 tests passed)
      
      Comprehensive testing completed for all NEW per-video share endpoints:
      
      ✅ Setup & Video Creation (4 tests)
         - Login and token generation
         - Create videos with/without grade restrictions
         - Verify share_code generation (6 chars uppercase)
         - Lazy migration verification
      
      ✅ Public Endpoints - Check (3 tests)
         - Valid code check with metadata
         - Invalid code rejection
         - Case-insensitive code handling
      
      ✅ Student Access & Grade Restriction (5 tests)
         - Access with allowed grade
         - Access rejection for forbidden grade (403)
         - Missing fields validation (422)
         - Invalid grade validation (400)
         - Open video access (no restrictions)
      
      ✅ Video Access & View Logs (5 tests)
         - Get video with valid access_id
         - View deduplication (same student not counted twice)
         - Teacher view logs verification
         - Missing access_id rejection (422)
         - Invalid access_id rejection (401)
      
      ✅ Comments (5 tests)
         - Post and retrieve comments
         - Multiple comments support
         - Empty comment rejection (400)
         - Long comment rejection (400)
      
      ✅ Toggle allow_comments (2 tests)
         - Disable comments
         - Comment rejection when disabled (403)
      
      ✅ Toggle is_active (4 tests)
         - Disable video
         - Check/access rejection for inactive video (404)
         - Re-enable video
      
      ✅ Cross-kind Isolation (2 tests)
         - Video access_id on library endpoint → 401
         - Library access_id on video endpoint → 401
      
      ✅ Stream Test (1 test)
         - Upload video and stream endpoint
      
      ✅ Cleanup (1 test)
         - Delete test videos
      
      All endpoints working correctly. No critical issues found.
      Feature is production-ready.
      
      Main agent: Please summarize and finish. All backend testing is complete.
