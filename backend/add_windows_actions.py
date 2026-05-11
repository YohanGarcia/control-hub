from app.db.session import SessionLocal
from sqlalchemy import text
from datetime import datetime, timezone

db = SessionLocal()

# Cambiar constraint de unique(slug) a unique(slug, host_type)
db.execute(text("ALTER TABLE actions_catalog DROP CONSTRAINT IF EXISTS uq_actions_catalog_slug"))
db.execute(text("ALTER TABLE actions_catalog ADD CONSTRAINT uq_slug_host UNIQUE (slug, host_type)"))

now = datetime.now(timezone.utc)

actions = [
    ("check_docker", "Check Docker", "windows", "docker ps", 30, 2000),
    ("cleanup_tmp", "Cleanup Tmp", "windows", "powershell -Command Remove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force", 120, 1000),
]

for slug, name, host, cmd, timeout, max_out in actions:
    db.execute(
        text("INSERT INTO actions_catalog (slug, name, host_type, command_template, timeout_seconds, max_output_chars, is_active, created_at, updated_at) VALUES (:slug, :name, :host, :cmd, :timeout, :max_out, true, :now, :now)"),
        {"slug": slug, "name": name, "host": host, "cmd": cmd, "timeout": timeout, "max_out": max_out, "now": now}
    )

db.commit()

result = db.execute(text("SELECT id, slug, host_type FROM actions_catalog ORDER BY host_type, slug"))
print("Acciones en DB:")
for row in result:
    print(f"  [{row[0]}] {row[1]} ({row[2]})")

db.close()
print("\nListo! Ahora las acciones son por host_type.")