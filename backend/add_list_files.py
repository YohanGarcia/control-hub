from app.db.session import SessionLocal
from sqlalchemy import text
from datetime import datetime, timezone

db = SessionLocal()
now = datetime.now(timezone.utc)

try:
    db.execute(
        text("INSERT INTO actions_catalog (slug, name, host_type, command_template, timeout_seconds, max_output_chars, is_active, created_at, updated_at) VALUES (:slug, :name, :host, :cmd, :timeout, :max_out, true, :now, :now)"),
        {"slug": "list_files", "name": "List Files", "host": "windows", "cmd": "dir", "timeout": 30, "max_out": 4000, "now": now}
    )
    db.commit()
    print("Action 'list_files' added for Windows")
except Exception as e:
    print(f"Error: {e}")

result = db.execute(text("SELECT id, slug, host_type FROM actions_catalog WHERE slug='list_files'"))
for row in result:
    print(f"  [{row[0]}] {row[1]} ({row[2]})")

db.close()