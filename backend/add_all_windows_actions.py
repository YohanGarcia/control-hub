from app.db.session import SessionLocal
from sqlalchemy import text
from datetime import datetime, timezone

db = SessionLocal()
now = datetime.now(timezone.utc)

actions = [
    ("restart_service", "Restart Service", "windows", "net stop {service_name} && net start {service_name}", 60, 2000),
    ("update_system", "Update System", "windows", "powershell -Command Install-Module -Name PSWindowsUpdate -Force -Scope CurrentUser; Import-Module PSWindowsUpdate; Get-WindowsUpdate -Install -AcceptAll", 300, 2000),
    ("run_backup", "Run Backup", "windows", "powershell -Command Copy-Item -Path {source} -Destination {destination} -Recurse", 600, 2000),
]

for slug, name, host, cmd, timeout, max_out in actions:
    try:
        db.execute(
            text("INSERT INTO actions_catalog (slug, name, host_type, command_template, timeout_seconds, max_output_chars, is_active, created_at, updated_at) VALUES (:slug, :name, :host, :cmd, :timeout, :max_out, true, :now, :now)"),
            {"slug": slug, "name": name, "host": host, "cmd": cmd, "timeout": timeout, "max_out": max_out, "now": now}
        )
        print(f"Added: {slug} ({host})")
    except Exception as e:
        print(f"Skipped: {slug} ({host}) - already exists")

db.commit()

result = db.execute(text("SELECT id, slug, host_type FROM actions_catalog WHERE host_type='windows' ORDER BY slug"))
print("\nAcciones Windows:")
for row in result:
    print(f"  [{row[0]}] {row[1]}")

db.close()