import hashlib
from sqlalchemy import text
from app.db.session import SessionLocal


def main() -> None:
    device_id_raw = input("Device ID: ").strip()
    agent_key = input("New agent key: ").strip()
    if not device_id_raw.isdigit() or not agent_key:
        print("Device ID numerico y key obligatoria")
        raise SystemExit(1)

    key_hash = hashlib.sha256(agent_key.encode("utf-8")).hexdigest()
    device_id = int(device_id_raw)

    db = SessionLocal()
    db.execute(
        text("UPDATE devices SET agent_key_hash = :key_hash WHERE id = :device_id"),
        {"key_hash": key_hash, "device_id": device_id},
    )
    db.commit()
    db.close()
    print(f"Device {device_id} updated")


if __name__ == "__main__":
    main()
