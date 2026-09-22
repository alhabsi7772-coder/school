"""Parse aSc Timetables teacher-schedule PDF (جداول حصص المعلمين) into structured data."""
import re
import unicodedata
import pdfplumber

DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"]
_AR = re.compile(r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]")


def _fix(s: str) -> str:
    s = "".join(unicodedata.normalize("NFKC", c)[::-1] for c in s)
    return s[::-1].strip()


def _norm_day(s: str) -> str:
    s = _fix(s).replace("إ", "ا").replace("أ", "ا")
    for i, d in enumerate(DAYS):
        if d.replace("أ", "ا") == s:
            return DAYS[i]
    return ""


def _parse_cell(cell: str):
    if not cell:
        return None
    lines = [l.strip() for l in cell.split("\n") if l.strip()]
    subject, klass = "", ""
    for l in lines:
        m = re.fullmatch(r"(\d+)\\(\d+)", l)
        m2 = re.fullmatch(r"(\d+)\s+\\\s+(\d+)", l)
        if m:
            klass = f"{m.group(1)}/{m.group(2)}"
        elif m2 and not klass:
            klass = f"{m2.group(2)}/{m2.group(1)}"
        elif _AR.search(l):
            subject = re.sub(r"\d+\\\d+", "", _fix(l))
            subject = re.sub(r"\s*مختبر.*$", "", subject).strip()
    if not klass:
        m = re.search(r"(\d+)\s*\\\s*(\d+)", cell)
        if m:
            klass = f"{m.group(2)}/{m.group(1)}"
    if not klass and not subject:
        return None
    return {"class": klass, "subject": subject}


def parse_teacher_pdf(path: str):
    teachers = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            for tbl in page.find_tables():
                x0, top, x1, bottom = tbl.bbox
                above = [w for w in words if w["bottom"] <= top + 1 and w["top"] >= top - 40 and w["x0"] >= x0 - 5 and w["x1"] <= x1 + 5]
                above.sort(key=lambda w: -w["x0"])
                name = " ".join(_fix(w["text"]) for w in above if _AR.search(w["text"]))
                rows = tbl.extract()
                if not rows or len(rows) < 2:
                    continue
                schedule = {d: [None] * 8 for d in DAYS}
                subjects = {}
                total = 0
                for row in rows[1:]:
                    day = _norm_day(row[-1] or "")
                    if not day:
                        continue
                    # columns are visually RTL: index 0 => period 8 ... index 7 => period 1
                    for ci in range(8):
                        cell = _parse_cell(row[ci])
                        if cell:
                            span = [ci]
                            if ci + 1 < 8 and row[ci + 1] is None:
                                span.append(ci + 1)
                            for c in span:
                                schedule[day][8 - c - 1] = dict(cell)
                                total += 1
                                if cell["subject"]:
                                    subjects[cell["subject"]] = subjects.get(cell["subject"], 0) + 1
                if not name:
                    continue
                subject = max(subjects, key=subjects.get) if subjects else ""
                teachers.append({"name": name, "subject": subject, "quota": total, "schedule": schedule})
    return teachers


if __name__ == "__main__":
    import json, sys
    data = parse_teacher_pdf(sys.argv[1])
    print(json.dumps(data, ensure_ascii=False, indent=1)[:3000])
    print(len(data), "teachers")
    for t in data:
        print(t["name"], "|", t["subject"], "|", t["quota"])


def parse_general_pdf(path: str):
    """الجدول العام: اسم المعلم + مجموع الحصص + (احتياطياً) الجدول الأسبوعي بدون أسماء المواد."""
    teachers = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for tbl in page.extract_tables():
                for row in tbl:
                    if not row or len(row) < 42:
                        continue
                    total, name_cell = (row[0] or "").strip(), (row[-1] or "").strip()
                    if not total.isdigit() or not _AR.search(name_cell):
                        continue
                    parts = [_fix(l) for l in name_cell.split("\n") if l.strip()]
                    name = ""
                    for part in parts:
                        name = (name + part) if len(part) <= 1 else (name + " " + part).strip()
                    schedule = {d: [None] * 8 for d in DAYS}
                    cells = row[1:41]
                    # الأعمدة بصرياً من اليسار: الخميس 8..1 ثم الأربعاء ... ثم الأحد 8..1
                    for ci, cell in enumerate(cells):
                        parsed = _parse_cell(cell)
                        if not parsed:
                            continue
                        day = DAYS[4 - ci // 8]
                        span = [ci]
                        if ci + 1 < 40 and (ci + 1) // 8 == ci // 8 and cells[ci + 1] is None:
                            span.append(ci + 1)
                        for c in span:
                            schedule[day][8 - (c % 8) - 1] = {"class": parsed["class"], "subject": ""}
                    teachers.append({"name": name, "quota": int(total), "schedule": schedule})
    return teachers


def _bbox_lines(page, bbox, gap=1.5):
    """نص خلية بالاعتماد على مواضع الحروف (يمين→يسار) — يعالج الحروف المنفصلة وربطة لا/الله بشكل صحيح."""
    x0, top, x1, bottom = bbox
    chars = [c for c in page.chars if c["text"].strip() and x0 <= (c["x0"] + c["x1"]) / 2 <= x1 and top <= (c["top"] + c["bottom"]) / 2 <= bottom]
    rows = []
    for c in sorted(chars, key=lambda c: c["top"]):
        if rows and abs(rows[-1][0] - c["top"]) <= 3:
            rows[-1][1].append(c)
        else:
            rows.append([c["top"], [c]])
    lines = []
    for _, cs in rows:
        cs.sort(key=lambda c: -c["x0"])
        out = ""
        for i, c in enumerate(cs):
            if i and cs[i - 1]["x0"] - c["x1"] > gap:
                out += " "
            out += unicodedata.normalize("NFKC", c["text"])
        out = re.sub(r"\s+", " ", out).strip()
        if _AR.search(out):
            lines.append(out)
    return lines


def parse_supervision_pdf(path: str):
    """جدول الإشراف: لكل يوم قائد إشراف وقائمة مشرفين. الأعمدة بصرياً: المشرفون | قائد الإشراف | اليوم."""
    out = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for tbl in page.find_tables():
                if not tbl.rows or len(tbl.rows[0].cells) < 2:
                    continue
                for row in tbl.rows:
                    cells = [c for c in row.cells if c]
                    if len(cells) < 2:
                        continue
                    cells.sort(key=lambda c: c[0])
                    sups = _bbox_lines(page, cells[0])
                    leader = " ".join(_bbox_lines(page, cells[1]))
                    if not sups or not leader:
                        continue
                    if len(out) >= len(DAYS):
                        break
                    out.append({"day": DAYS[len(out)], "leader": leader, "supervisors": sups})
    return out


AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def parse_timing_text(text: str):
    """يستخرج أوقات الحصص الثماني (من/إلى) من نص جدول التوقيت إن وُجد."""
    t = text.translate(AR_DIGITS)
    times = re.findall(r"(\d{1,2})\s*[:：]\s*(\d{2})", t)
    pairs = [f"{int(h)}:{m}" for h, m in times]
    out = []
    for i in range(0, len(pairs) - 1, 2):
        out.append({"from": pairs[i], "to": pairs[i + 1]})
    return out
