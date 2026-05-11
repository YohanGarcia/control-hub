import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models.action_catalog import ActionCatalog


def main() -> None:
    db = SessionLocal()
    try:
        actions = [
            ActionCatalog(slug="restart_service", name="Reiniciar servicio", host_type="windows", command_template="net stop {service_name} && net start {service_name}", timeout_seconds=60, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="restart_service", name="Reiniciar servicio", host_type="ubuntu", command_template="sudo systemctl restart {service_name}", timeout_seconds=60, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="update_system", name="Actualizar sistema", host_type="windows", command_template="powershell -Command 'Install-Module -Name PSWindowsUpdate -Force; Import-Module PSWindowsUpdate; Get-WindowsUpdate -Install -AcceptAll'", timeout_seconds=300, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="update_system", name="Actualizar sistema", host_type="ubuntu", command_template="sudo apt-get update && sudo apt-get upgrade -y", timeout_seconds=300, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="run_backup", name="Ejecutar backup", host_type="windows", command_template="powershell -Command 'Copy-Item -Path {source} -Destination {destination} -Recurse'", timeout_seconds=600, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="run_backup", name="Ejecutar backup", host_type="ubuntu", command_template="sudo rsync -av {source} {destination}", timeout_seconds=600, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="cleanup_tmp", name="Limpiar temporales", host_type="windows", command_template="powershell -Command 'Remove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue'", timeout_seconds=120, max_output_chars=1000, is_active=True),
            ActionCatalog(slug="cleanup_tmp", name="Limpiar temporales", host_type="ubuntu", command_template="sudo rm -rf /tmp/*", timeout_seconds=120, max_output_chars=1000, is_active=True),
            ActionCatalog(slug="check_docker", name="Ver Docker", host_type="windows", command_template="docker ps", timeout_seconds=30, max_output_chars=2000, is_active=True),
            ActionCatalog(slug="check_docker", name="Ver Docker", host_type="ubuntu", command_template="sudo docker ps", timeout_seconds=30, max_output_chars=2000, is_active=True),
        ]

        for action in actions:
            existing = db.query(ActionCatalog).filter_by(slug=action.slug, host_type=action.host_type).first()
            if not existing:
                db.add(action)
                print(f"Added: {action.slug} ({action.host_type})")
            else:
                print(f"Already exists: {action.slug} ({action.host_type})")

        db.commit()
        print("\nDone! Actions catalog populated.")
    finally:
        db.close()


if __name__ == "__main__":
    main()