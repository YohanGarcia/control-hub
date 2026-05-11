import asyncio

from app.db.session import SessionLocal
from app.services.action_service import get_run, mark_run_result
from app.services.ws_hub import ws_hub


async def enforce_run_timeout(run_id: int, timeout_seconds: int) -> None:
    await asyncio.sleep(timeout_seconds)

    db = SessionLocal()
    try:
        run = get_run(db, run_id)
        if not run or run.status != "running":
            return

        mark_run_result(
            run,
            status="timeout",
            exit_code=None,
            output_text=None,
            error_text="Action timed out on server",
        )
        db.commit()

        await ws_hub.broadcast_to_clients(
            {
                "type": "client.action.run.updated",
                "device_id": run.device_id,
                "run": {
                    "id": run.id,
                    "request_id": run.request_id,
                    "status": run.status,
                    "exit_code": run.exit_code,
                    "output_text": run.output_text,
                    "error_text": run.error_text,
                    "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                },
            }
        )
    finally:
        db.close()
