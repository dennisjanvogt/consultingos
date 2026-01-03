# CLAUDE.md - Project Instructions for Claude Code

This file provides context and instructions for Claude Code when working on this project.

## Project Overview

ConsultingOS is a macOS-inspired consulting management application with a Django backend and React frontend. It provides a desktop-like experience in the browser with windows, dock, and menu bar.

## Architecture

### Backend (Django + Ninja)

- **Location**: `/backend/`
- **Framework**: Django 5.x with Django Ninja for REST API
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: Session-based with CSRF protection

Key files:
- `consultingos/settings.py` - Django configuration
- `consultingos/api.py` - API router registration
- `apps/*/api.py` - Module-specific endpoints
- `apps/*/models.py` - Database models

### Frontend (React + TypeScript)

- **Location**: `/frontend/`
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand stores
- **Build**: Vite

Key files:
- `src/App.tsx` - Main app with routing
- `src/components/shell/` - Desktop UI (Window, Dock, MenuBar)
- `src/apps/*/` - Application modules
- `src/stores/` - Zustand state stores
- `src/api/types.ts` - TypeScript interfaces

## Development Commands

### Backend

```bash
cd backend
source venv/bin/activate

# Run server
python manage.py runserver

# Create migrations
python manage.py makemigrations <app_name>

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Type check
npm run build

# Lint
npm run lint
```

## Code Patterns

### Adding a New API Endpoint

1. Define schema in `apps/<module>/api.py`:
```python
class MySchema(Schema):
    id: int
    name: str
```

2. Add endpoint:
```python
@router.get('/', response=List[MySchema])
def list_items(request):
    return MyModel.objects.filter(user=request.user)
```

3. Register router in `consultingos/api.py` if new module

### Adding a New Frontend Store

1. Create store in `src/stores/<name>Store.ts`:
```typescript
import { create } from 'zustand'

interface MyState {
  items: Item[]
  fetchItems: () => Promise<void>
}

export const useMyStore = create<MyState>((set) => ({
  items: [],
  fetchItems: async () => {
    const response = await fetch(`${API_URL}/my-endpoint/`)
    const items = await response.json()
    set({ items })
  },
}))
```

### Adding Translations

Add keys to both files:
- `src/i18n/locales/de.json` (German)
- `src/i18n/locales/en.json` (English)

Use in components:
```typescript
const { t } = useTranslation()
return <span>{t('module.key')}</span>
```

## Styling Guidelines

- Use Tailwind CSS classes
- Follow existing color patterns:
  - Primary: `violet-500/600`
  - Background: `gray-50` (light), `gray-900` (dark)
  - Text: `gray-800` (light), `gray-100` (dark)
- Support dark mode with `dark:` prefix
- Use `transition-colors` for hover states

## Window System

Apps run in windows managed by `windowStore.ts`:

```typescript
const { openWindow } = useWindowStore()

// Open an app
openWindow({
  id: 'my-app',
  title: 'My App',
  component: 'MyApp',
  icon: MyIcon,
})
```

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode (True/False)
- `EMAIL_*` - SMTP configuration for meeting invitations
- `JITSI_DOMAIN` - Jitsi Meet server
- `PRODUCTION_URL` - Frontend URL for email links
- `CORS_ALLOWED_ORIGINS` - Allowed frontend origins

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_JITSI_DOMAIN` - Jitsi Meet server

## Common Tasks

### Adding a new app module

1. Backend:
   - Create app: `python manage.py startapp <name>` in `apps/`
   - Add to `INSTALLED_APPS` in settings.py
   - Create models, migrations, api.py
   - Register router in `consultingos/api.py`

2. Frontend:
   - Create component in `src/apps/<name>/`
   - Create store in `src/stores/`
   - Add to window registry in `WindowManager.tsx`
   - Add dock icon in `Dock.tsx`
   - Add translations

### Fixing TypeScript errors

Run `npm run build` in frontend to see all type errors. Common fixes:
- Add missing types to `src/api/types.ts`
- Use proper typing for event handlers
- Handle null/undefined with optional chaining

## Testing

Currently no automated tests. Manual testing recommended:
1. Test all CRUD operations
2. Test in both light and dark mode
3. Test in German and English
4. Test window management (open, close, minimize, resize)

## Deployment Notes

- Set `DEBUG=False` in production
- Use PostgreSQL instead of SQLite
- Configure proper `ALLOWED_HOSTS`
- Set up static file serving
- Use environment variables for secrets
