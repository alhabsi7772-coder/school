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
