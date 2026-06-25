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
      - working: "NA"
        agent: "main"
        comment: |
          تم إنشاء /app/backend/.env بمتغيرات MONGO_URL=mongodb://localhost:27017,
          DB_NAME=school_db, JWT_SECRET, CORS_ORIGINS. بعد إعادة تشغيل supervisor
          أصبح Backend يستجيب على :8001 (HTTP 404 على / و401 على /api/auth/login
          بكلمة مرور خاطئة — سلوك صحيح). يحتاج اختبار شامل لمسارات الـ API الأساسية:
          auth/login, auth/me, quizzes, projects, gradebooks, rubrics, admin/teachers.
      - working: true
        agent: "testing"
        comment: |
          ✅ تم اختبار جميع مسارات الـ API الأساسية بنجاح (9/9 اختبارات نجحت):
          1. POST /api/auth/login (admin) - نجح وأرجع token
          2. GET /api/auth/profile (admin) - نجح وأرجع بيانات المستخدم
          3. POST /api/auth/login (teacher1) - نجح وأرجع token
          4. POST /api/auth/login (كلمة مرور خاطئة) - رفض بشكل صحيح مع 401
          5. GET /api/quizzes - نجح وأرجع قائمة
          6. GET /api/projects - نجح وأرجع قائمة
          7. GET /api/gradebooks - نجح وأرجع قائمة
          8. GET /api/rubrics - نجح وأرجع قائمة
          9. GET /api/admin/teachers - نجح وأرجع 4 حسابات معلمين
          
          Supervisor status: backend RUNNING (pid 787), mongodb RUNNING.
          Backend logs: لا توجد أخطاء، التطبيق يعمل بشكل صحيح.
          Bug fix verified: ملفات .env تم إنشاؤها بنجاح والـ Backend يعمل بدون مشاكل.

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
        comment: |
          تم إنشاء /app/frontend/.env بـ REACT_APP_BACKEND_URL يشير إلى عنوان المعاينة
          الخارجي. Frontend يستجيب على :3000 بـ HTTP 200. لن يتم اختبار الـ Frontend
          إلا بعد إذن المستخدم.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "إنشاء ملف backend/.env واستعادة تشغيل الـ Backend"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      مشكلة "المعاينة لا تفتح" سببها ملفات .env مفقودة بعد جلب المشروع من GitHub.
      تم إنشاء:
        - /app/backend/.env (MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS)
        - /app/frontend/.env (REACT_APP_BACKEND_URL)
      وأعدت تشغيل supervisor. الخدمات الآن: backend RUNNING على 8001،
      frontend RUNNING على 3000، mongodb RUNNING.
      بيانات الاختبار في /app/memory/test_credentials.md:
        admin / teacher123
        teacher1 / khairat1
      يُرجى التحقق من صحة مسارات API الأساسية: POST /api/auth/login,
      GET /api/auth/me, GET /api/quizzes, GET /api/projects, GET /api/gradebooks,
      GET /api/rubrics. لا تختبر الفرونت إند.
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
