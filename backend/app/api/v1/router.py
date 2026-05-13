from fastapi import APIRouter

from app.api.v1.routes import actions
from app.api.v1.routes import audit
from app.api.v1.routes import auth
from app.api.v1.routes import devices
from app.api.v1.routes import enrollment
from app.api.v1.routes import health
from app.api.v1.routes import invitations
from app.api.v1.routes import organizations
from app.api.v1.routes import ws


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, tags=["organizations"])
api_router.include_router(invitations.router, tags=["invitations"])
api_router.include_router(enrollment.router, tags=["enrollment"])
api_router.include_router(actions.router, tags=["actions"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(devices.router, tags=["devices"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(ws.router, tags=["ws"])
