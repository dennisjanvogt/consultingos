from ninja import NinjaAPI
from ninja.security import django_auth

api = NinjaAPI(
    title='ConsultingOS API',
    version='1.0.0',
)

# Import routers from apps
from apps.users.api import router as users_router
from apps.customers.api import router as customers_router
from apps.invoices.api import router as invoices_router
from apps.company_settings.api import router as settings_router
from apps.documents.api import router as documents_router
from apps.calendar.api import router as calendar_router
from apps.kanban.api import router as kanban_router
from apps.timetracking.api import router as timetracking_router
from apps.ai.api import router as ai_router
from apps.chess.api import router as chess_router
from apps.whiteboard.api import router as whiteboard_router
from apps.notes.api import router as notes_router
from apps.workflows.api import router as workflows_router
from apps.knowledgebase.api import router as knowledgebase_router
from apps.terminal.api import router as terminal_router

# Register routers
api.add_router('/auth/', users_router, tags=['Auth'])
api.add_router('/customers/', customers_router, tags=['Customers'])
api.add_router('/invoices/', invoices_router, tags=['Invoices'])
api.add_router('/settings/', settings_router, tags=['Settings'])
api.add_router('/documents/', documents_router, tags=['Documents'])
api.add_router('/calendar/', calendar_router, tags=['Calendar'])
api.add_router('/kanban/', kanban_router, tags=['Kanban'])
api.add_router('/timetracking/', timetracking_router, tags=['Time Tracking'])
api.add_router('/ai/', ai_router, tags=['AI'])
api.add_router('/chess/', chess_router, tags=['Chess'])
api.add_router('/whiteboard/', whiteboard_router, tags=['Whiteboard'])
api.add_router('/notes/', notes_router, tags=['Notes'])
api.add_router('/workflows/', workflows_router, tags=['Workflows'])
api.add_router('/knowledgebase/', knowledgebase_router, tags=['Knowledgebase'])
api.add_router('/terminal/', terminal_router, tags=['Terminal'])
