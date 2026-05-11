import sys
import secrets
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User


def main() -> None:
    admin_password = os.getenv("CONTROL_HUB_ADMIN_PASSWORD") or secrets.token_urlsafe(18)
    db = SessionLocal()
    try:
        admin_role = db.scalar(select(Role).where(Role.name == "admin"))
        if not admin_role:
            admin_role = Role(name="admin", is_active=True)
            db.add(admin_role)
            db.flush()

        observer_role = db.scalar(select(Role).where(Role.name == "observer"))
        if not observer_role:
            observer_role = Role(name="observer", is_active=True)
            db.add(observer_role)

        admin = db.scalar(select(User).where(User.email == "admin@controlhub.app"))
        if not admin:
            admin = User(
                email="admin@controlhub.app",
                full_name="Admin",
                password_hash=hash_password(admin_password),
                is_active=True,
                role_id=admin_role.id,
                twofa_enabled=False,
                twofa_secret=None,
                password_change_required=True,
            )
            db.add(admin)

        db.commit()
        print("Admin bootstrap listo: admin@controlhub.app")
        print(f"Password temporal: {admin_password}")
        print("Cambia la clave de inmediato y luego ejecuta setup-2fa.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
