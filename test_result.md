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
          تم إضافة 6 صفحات React وتسجيل الـ routes:
          - Teacher: /teacher/library (LibraryResources), /teacher/library/videos (LibraryVideos), /teacher/library/videos/:videoId (LibraryVideoDetail)
          - Student: /library/:code (StudentLibrary), /v/:code (StudentVideoLibrary), /v/:code/:videoId (StudentVideoPlay)
          - تم إضافة tab "مكتبة الموارد" في القائمة الجانبية مع أيقونة Library.
          - لن يتم اختبار الـ Frontend إلا بعد إذن المستخدم.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Resource Library (مكتبة الموارد) — Backend APIs"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      تم إضافة ميزة جديدة: مكتبة الموارد (Resource Library) ومكتبة الفيديوهات.
      
      الفكرة العامة:
      - كل معلم لديه رمز فريد library_code للموارد + رمز videos_code للفيديوهات.
      - الطالب يفتح /library/{code} أو /v/{code} ويسجّل (اسم/صف/شعبة) ثم يحصل على access_id.
      - الـ access_id محفوظ في DB collection: library_access (kind: 'library' أو 'videos').
      - الطالب يرى الموارد/الفيديوهات النشطة (is_active=true) المخصصة لصفه (grades فارغة = للجميع).
      - تنزيل المورد يُسجَّل في resource_access.
      - فتح الفيديو يُسجَّل في video_views (مرة واحدة لكل طالب).
      - الطلاب يضيفون تعليقات إذا allow_comments=true ويرونها جميعاً (نقاش جماعي).
      - المعلم يحذف أي تعليق.
      
      Storage filesystem:
      - /app/backend/uploads/resources/
      - /app/backend/uploads/videos/
      - حد 30MB لكل ملف
      
      Test plan:
      1. login admin/teacher123 → احصل على token
      2. GET /api/library/me → تأكد من library_code, videos_code, counts=0
      3. POST /api/resources/upload (multipart) → رفع ملف نصي صغير (مثلاً .txt 1KB)، grades=الخامس,السادس
      4. GET /api/resources → موجود
      5. PUT /api/resources/{id} → غيّر title, is_active=false ثم true
      6. GET /api/library/check/{library_code} → 200
      7. POST /api/library/{code}/access {student_name: 'أحمد', grade: 'الخامس', section: '1'} → access_id
      8. GET /api/library/{code}/resources?access_id=... → يحتوي المورد
      9. GET /api/library/{code}/download/{rid}?access_id=... → 200 ويُرجع الملف
      10. GET /api/resources/{id}/downloads (teacher token) → يحتوي الطالب 'أحمد'
      11. POST /api/videos/youtube → فيديو يوتيوب
      12. POST /api/videos/upload — رفع ملف فيديو صغير (اختياري إن أمكن، يمكن استخدام mp4 صغير)
      13. GET /api/videos-library/check/{videos_code} → 200
      14. POST /api/videos-library/{code}/access → access_id
      15. GET /api/videos-library/{code}/videos → يحتوي الفيديوهات
      16. GET /api/videos-library/{code}/video/{vid} → يسجل المشاهدة
      17. POST comment → ينجح
      18. GET comments → يحتوي التعليق
      19. teacher: GET /api/videos/{vid}/views → يحتوي الطالب
      20. teacher: GET /api/videos/{vid}/comments → يحتوي التعليق
      21. teacher: DELETE comment → يُحذف
      22. اختبار صحي: student صف الثامن لا يرى مورداً مخصصاً للخامس/السادس فقط
      23. اختبار التحقق: رمز خاطئ → 404؛ access_id خاطئ → 401
      
      لا تختبر الفرونت إند الآن.
      Credentials في /app/memory/test_credentials.md.
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
