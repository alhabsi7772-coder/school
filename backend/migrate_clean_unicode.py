"""سكربت لمرة واحدة: تنظيف الرموز الخفية (RTL marks) من أرقام مدنية/وظيفية وأسماء مخزنة مسبقاً."""
import asyncio
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_INVISIBLE_RE = re.compile(r'[\u200b-\u200f\u202a-\u202e\ufeff]')


def clean(v):
    if v is None:
        return v
    s = _INVISIBLE_RE.sub('', str(v)).strip()
    return s


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    fixed = 0
    async for doc in db.grades_students.find({}):
        updates = {}
        for field in ("civil_number", "name", "grade", "section"):
            if field in doc and isinstance(doc[field], str):
                cleaned = clean(doc[field])
                if cleaned != doc[field]:
                    updates[field] = cleaned
        if updates:
            await db.grades_students.update_one({"_id": doc["_id"]}, {"$set": updates})
            fixed += 1
    print(f"grades_students: cleaned {fixed} documents")

    fixed = 0
    async for doc in db.grades_users.find({}):
        updates = {}
        for field in ("civil_number", "employee_number", "name", "username"):
            if field in doc and isinstance(doc[field], str):
                cleaned = clean(doc[field])
                if cleaned != doc[field]:
                    updates[field] = cleaned
        if updates:
            await db.grades_users.update_one({"_id": doc["_id"]}, {"$set": updates})
            fixed += 1
    print(f"grades_users: cleaned {fixed} documents")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
