from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

result = db.execute(text("SELECT id, slug, name, host_type FROM actions_catalog ORDER BY slug, host_type"))
print("Acciones actuales:")
for row in result:
    print(f"  [{row[0]}] {row[1]} ({row[3]})")

result = db.execute(text("SELECT COUNT(*) FROM actions_catalog WHERE host_type='windows'"))
count = result.scalar()
print(f"\nWindows actions: {count}")

db.close()