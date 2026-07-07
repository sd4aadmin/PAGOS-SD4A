from fastapi import APIRouter

from api.v1.endpoints.auth import router as auth_router
from api.v1.endpoints.users import router as users_router
from api.v1.endpoints.projects import router as projects_router
from api.v1.endpoints.payments import router as payments_router
from api.v1.endpoints.activity import router as activity_router
from api.v1.endpoints.notifications import router as notifications_router
from api.v1.endpoints.files import router as files_router
from api.v1.endpoints.deliverables import router as deliverables_router
from api.v1.endpoints.engineer_profiles import router as engineer_profiles_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(projects_router)
api_router.include_router(payments_router)
api_router.include_router(activity_router)
api_router.include_router(notifications_router)
api_router.include_router(files_router)
api_router.include_router(deliverables_router)
api_router.include_router(engineer_profiles_router)
