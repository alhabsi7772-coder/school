"""
مولّد بنك الأسئلة من كتب تقنية المعلومات (سلطنة عمان) — الفصل الدراسي الأول
يقرأ الكتب PDF درساً بدرس، يستخرج النصوص والصور، ويولّد أسئلة مصنفة عبر Gemini.
تشغيل: python3 scripts/generate_bank.py [grade]   (بدون وسيط = كل الصفوف)
السجل: /app/data/bank_gen.log — قابل للاستئناف (يتخطى الدروس المكتملة)
"""
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pymupdf
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

ROOT = Path('/app/backend')
load_dotenv(ROOT / '.env')
db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
KEY = os.environ['EMERGENT_LLM_KEY']
STATIC_DIR = ROOT / 'static' / 'bank'
LOG_FILE = Path('/app/data/bank_gen.log')

BOOKS = {
    '5': '/app/data/books/cls5.pdf',
    '6': '/app/data/books/cls6.pdf',
    '8': '/app/data/books/cls8.pdf',
}

# (unit, lesson, start_page, end_page, target_questions)
LESSONS = {
    '5': [
        ('أساسيات الحاسوب', 'الحاسوب', 16, 28, 19),
        ('أساسيات الحاسوب', 'الملفات والمجلدات', 29, 42, 19),
        ('أساسيات الحاسوب', 'ضبط إعدادات الحاسوب', 43, 50, 18),
        ('معالجة الكلمات', 'تنسيق الفقرة', 60, 70, 18),
        ('معالجة الكلمات', 'الرسومات التوضيحية', 71, 79, 18),
        ('معالجة الكلمات', 'الجداول', 80, 86, 18),
        ('معالجة الكلمات', 'تخطيط الصفحة والطباعة', 87, 100, 18),
        ('الإنترنت', 'مقدمة في شبكات الحاسوب', 110, 121, 18),
        ('الإنترنت', 'استكشاف الذكاء الاصطناعي', 122, 130, 18),
        ('الإنترنت', 'تنسيق وإدارة البريد الإلكتروني', 131, 142, 18),
        ('الإنترنت', 'الأمان عبر الإنترنت', 143, 154, 18),
    ],
    '6': [
        ('الجداول الحسابية', 'تنسيق ورقة العمل', 16, 27, 20),
        ('الجداول الحسابية', 'إجراء العمليات الحسابية', 28, 38, 20),
        ('الجداول الحسابية', 'الرسوم البيانية والطباعة', 39, 44, 20),
        ('الجداول الحسابية', 'تنظيم البيانات', 45, 52, 20),
        ('النمذجة ثلاثية الأبعاد', 'مقدمة إلى النمذجة ثلاثية الأبعاد', 62, 79, 20),
        ('النمذجة ثلاثية الأبعاد', 'إنشاء حامل مستلزمات مكتبية', 80, 97, 20),
        ('النمذجة ثلاثية الأبعاد', 'تصميم بيت الطيور', 98, 115, 20),
        ('الشبكات وأدوات التواصل', 'الإنترنت', 124, 129, 20),
        ('الشبكات وأدوات التواصل', 'أدوات التواصل', 130, 140, 20),
        ('الشبكات وأدوات التواصل', 'السلامة الرقمية على الإنترنت', 141, 148, 20),
    ],
    '8': [
        ('تنظيم البيانات ومشاركتها عبر الإنترنت', 'النماذج الإلكترونية', 16, 39, 20),
        ('تنظيم البيانات ومشاركتها عبر الإنترنت', 'تحليل البيانات', 40, 57, 20),
        ('تنظيم البيانات ومشاركتها عبر الإنترنت', 'النماذج الحاسوبية', 58, 67, 20),
        ('البرمجة النصية', 'مقدمة في البرمجة النصية', 76, 90, 20),
        ('البرمجة النصية', 'إدخال البيانات', 91, 97, 20),
        ('البرمجة النصية', 'الجمل الشرطية', 98, 107, 20),
        ('البرمجة النصية', 'الشروط المتعددة', 108, 114, 20),
        ('التجارة الإلكترونية والأمن الرقمي', 'مقدمة في التجارة الإلكترونية', 120, 129, 20),
        ('التجارة الإلكترونية والأمن الرقمي', 'المعاملات التجارية الآمنة عبر الإنترنت', 130, 139, 20),
        ('التجارة الإلكترونية والأمن الرقمي', 'البصمة الرقمية', 140, 153, 20),
    ],
}

POINTS = {'mcq': 1, 'true_false': 1, 'short': 2, 'long': 3, 'match': 2}
COG_OK = {'recall', 'understanding', 'application', 'reasoning'}
DIFF_OK = {'easy', 'medium', 'hard'}


def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')


def dist_for(target):
    # target 18: mcq8 tf4 short3 long2 match1 | 19: match2 | 20: mcq9 match2
    mcq = 9 if target >= 20 else 8
    match = 2 if target >= 19 else 1
    return {'mcq': mcq, 'true_false': 4, 'short': 3, 'long': 2, 'match': match}


def extract_lesson(doc, grade, idx, start, end):
    """نص الدرس + حفظ أبرز الصور (حتى 5) كملفات ثابتة"""
    text_parts, images, seen = [], [], set()
    for p in range(start, min(end + 1, len(doc))):
        page = doc[p]
        text_parts.append(page.get_text())
        for img in page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                pix = pymupdf.Pixmap(doc, xref)
                if pix.width < 220 or pix.height < 150:
                    continue
                ratio = pix.width / pix.height
                if ratio < 0.35 or ratio > 3.8:
                    continue
                if pix.n - pix.alpha > 3 or pix.alpha:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                images.append((pix.width * pix.height, pix.tobytes('jpeg')))
            except Exception:
                continue
    images.sort(key=lambda x: -x[0])
    saved = []
    out_dir = STATIC_DIR / grade
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (_, data) in enumerate(images[:5]):
        if len(data) < 8000:  # تجاهل الصور الفارغة/الزخرفية الصغيرة
            continue
        fname = f'l{idx + 1}_img{i + 1}.jpg'
        (out_dir / fname).write_bytes(data)
        saved.append((f'IMG{len(saved) + 1}', str(out_dir / fname), f'/api/static/bank/{grade}/{fname}'))
        if len(saved) >= 4:
            break
    text = '\n'.join(text_parts)
    return text[:14000], saved


def build_prompt(grade, unit, lesson, batch, counts, n_images):
    img_note = ''
    if n_images:
        img_note = f"""
مرفقة {n_images} صور من صفحات الدرس نفسه مرقمة IMG1..IMG{n_images}.
يمكنك (وليس شرطاً) ربط بعض الأسئلة المناسبة بصورة عبر الحقل "image_ref": "IMG2" — عندها اجعل نص السؤال يشير للصورة صراحة (مثال: "بالاعتماد على الصورة المرفقة، ...."). استخدم الصورة فقط إذا كانت واضحة ومفيدة تعليمياً."""
    if batch == 'A':
        types_req = f"- {counts['mcq']} سؤال اختيار من متعدد (type: mcq) بأربعة خيارات متقاربة ومموهات منطقية\n- {counts['true_false']} أسئلة صح/خطأ (type: true_false) والإجابة \"صح\" أو \"خطأ\""
    else:
        types_req = f"""- {counts['short']} أسئلة إجابة قصيرة (type: short) مع الإجابة النموذجية في correct_answer
- {counts['long']} أسئلة إجابة طويلة/مقالية (type: long) مع إجابة نموذجية وافية في correct_answer
- {counts['match']} سؤال توصيل (type: match) كل منها بأربعة أزواج في الحقل pairs بالشكل [{{"left":"...","right":"..."}}, ...] واجعل نص السؤال "صِل كل عنصر في العمود الأول بما يناسبه في العمود الثاني" أو مشابهاً"""
    return f"""أنت خبير مناهج تقنية المعلومات بوزارة التربية والتعليم في سلطنة عُمان.
أمامك النص الكامل لدرس "{lesson}" من وحدة "{unit}" من كتاب تقنية المعلومات للصف {grade} — الفصل الدراسي الأول.
ملاحظة: النص مستخرج آلياً من PDF وقد يحتوي تشوهات بسيطة في ترتيب الحروف العربية — اعتمد على فهمك للمحتوى الفعلي.{img_note}

أنشئ من محتوى هذا الدرس فقط (بما فيه أنشطته وتدريباته وأسئلته الموجودة):
{types_req}

قواعد إلزامية:
1. اللغة العربية الفصحى (يُسمح بالمصطلحات التقنية الإنجليزية مثل Excel, Scratch, URL).
2. التنوع في الصعوبة: سهلة (easy) ~35%، متوسطة (medium) ~40%، صعبة (hard) ~25%.
3. التنوع المعرفي وفق تصنيف الأهداف: تذكر (recall)، فهم (understanding)، تطبيق (application)، استدلال (reasoning) — وزّعها على الأسئلة.
4. كل سؤال صحيح علمياً ومطابق للمحتوى، ومناسب لعمر طلبة الصف {grade}.
5. لا تكرر الأفكار بين الأسئلة.

أعد الإجابة JSON فقط (مصفوفة) بلا أي نص إضافي. بنية كل سؤال:
{{
  "text": "نص السؤال",
  "type": "mcq|true_false|short|long|match",
  "options": ["أ","ب","ج","د"],
  "correct_answer": "الإجابة الصحيحة أو النموذجية",
  "pairs": [{{"left":"","right":""}}],
  "difficulty": "easy|medium|hard",
  "cognitive_level": "recall|understanding|application|reasoning",
  "image_ref": "IMG1"
}}
(options للاختياري فقط، pairs للتوصيل فقط، image_ref اختياري)"""


def parse_json(text):
    t = text.strip()
    if t.startswith('```'):
        lines = t.split('\n')
        t = '\n'.join(lines[1:-1] if lines[-1].strip().startswith('```') else lines[1:])
    s, e = t.find('['), t.rfind(']')
    if s == -1 or e == -1:
        raise ValueError('no JSON array found')
    return json.loads(t[s:e + 1])


async def ask_llm(prompt, lesson_text, image_files):
    chat = LlmChat(
        api_key=KEY,
        session_id=f'bankgen-{uuid.uuid4()}',
        system_message='أنت مولد أسئلة امتحانية خبير. تعيد JSON صالحاً فقط دون أي شرح.',
    ).with_model('gemini', 'gemini-3-flash-preview')
    files = [FileContentWithMimeType(file_path=fp, mime_type='image/jpeg') for _, fp, _ in image_files]
    msg = UserMessage(text=prompt + '\n\n===== نص الدرس =====\n' + lesson_text, file_contents=files or None)
    return await chat.send_message(msg)


def normalize(q, grade, unit, lesson, image_map):
    qtype = q.get('type', 'mcq')
    if qtype not in POINTS:
        return None
    text = (q.get('text') or '').strip()
    # إزالة أي إشارة حرفية لاسم الصورة (IMG1) من نص السؤال
    import re as _re
    text = _re.sub(r'(الصورة\s*)?\(?\s*IMG\s*\d+\s*\)?', 'الصورة المرفقة', text)
    text = text.replace('الصورة المرفقة المرفقة', 'الصورة المرفقة')
    if len(text) < 8:
        return None
    doc = {
        'id': str(uuid.uuid4()),
        'scope': 'global',
        'owner_id': None,
        'grade': grade,
        'semester': '1',
        'unit': unit,
        'lesson': lesson,
        'topic': lesson,
        'text': text,
        'type': qtype,
        'options': q.get('options') if qtype == 'mcq' else None,
        'correct_answer': q.get('correct_answer'),
        'pairs': q.get('pairs') if qtype == 'match' else None,
        'points': float(POINTS[qtype]),
        'difficulty': q.get('difficulty') if q.get('difficulty') in DIFF_OK else 'medium',
        'cognitive_level': q.get('cognitive_level') if q.get('cognitive_level') in COG_OK else 'understanding',
        'image_url': image_map.get(q.get('image_ref')) if q.get('image_ref') else None,
        'source': 'book',
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    if qtype == 'mcq' and (not doc['options'] or len(doc['options']) != 4):
        return None
    if qtype == 'match':
        pairs = doc['pairs'] or []
        if len(pairs) < 3:
            return None
        doc['pairs'] = [{'left': str(p.get('left', '')), 'right': str(p.get('right', ''))} for p in pairs[:5]]
        doc['correct_answer'] = None
    if qtype == 'true_false':
        ca = str(doc['correct_answer'] or '')
        doc['correct_answer'] = 'صح' if ('صح' in ca and 'خطأ' not in ca) or ca.lower() in ('true', 'صحيح') else 'خطأ'
    return doc


async def gen_batch(batch, grade, unit, lesson, counts, lesson_text, images):
    image_map = {ref: url for ref, _, url in images}
    prompt = build_prompt(grade, unit, lesson, batch, counts, len(images))
    for attempt in range(3):
        try:
            raw = await ask_llm(prompt, lesson_text, images)
            items = parse_json(raw)
            docs = [d for d in (normalize(q, grade, unit, lesson, image_map) for q in items) if d]
            if docs:
                await db.question_bank.insert_many(docs)
                return len(docs)
        except Exception as e:
            log(f'  ⚠️ batch {batch} attempt {attempt + 1} failed: {str(e)[:140]}')
            await asyncio.sleep(4)
    return 0


async def run_grade(grade):
    doc = pymupdf.open(BOOKS[grade])
    total_grade = 0
    for idx, (unit, lesson, start, end, target) in enumerate(LESSONS[grade]):
        existing = await db.question_bank.count_documents({'scope': 'global', 'grade': grade, 'lesson': lesson})
        if existing >= target - 2:
            log(f'⏭️ صف {grade} | {lesson}: موجود {existing} — تخطي')
            total_grade += existing
            continue
        if existing:
            await db.question_bank.delete_many({'scope': 'global', 'grade': grade, 'lesson': lesson})
        counts = dist_for(target)
        lesson_text, images = extract_lesson(doc, grade, idx, start, end)
        log(f'📖 صف {grade} | درس {idx + 1}/{len(LESSONS[grade])}: {lesson} (نص {len(lesson_text)} حرف، {len(images)} صور)')
        a = await gen_batch('A', grade, unit, lesson, counts, lesson_text, images)
        b = await gen_batch('B', grade, unit, lesson, counts, lesson_text, images)
        log(f'  ✅ {lesson}: {a + b} سؤال (اختياري/صح-خطأ: {a}، مفتوح/توصيل: {b})')
        total_grade += a + b
    log(f'🎉 اكتمل الصف {grade}: {total_grade} سؤال')
    return total_grade


async def main():
    grades = [sys.argv[1]] if len(sys.argv) > 1 else ['5', '6', '8']
    log(f'===== بدء التوليد للصفوف: {grades} =====')
    grand = 0
    for g in grades:
        grand += await run_grade(g)
    log(f'===== انتهى التوليد الكلي: {grand} سؤال =====')


if __name__ == '__main__':
    asyncio.run(main())
