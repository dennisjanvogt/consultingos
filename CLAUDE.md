# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConsultingOS is a macOS-inspired consulting management application with a Django backend and React frontend. It provides a desktop-like experience in the browser with windows, dock, and menu bar.

## Development Commands

### Backend

```bash
cd backend
source venv/bin/activate
python manage.py runserver              # Run dev server
python manage.py makemigrations <app>   # Create migrations
python manage.py migrate                # Apply migrations
```

### Frontend

```bash
cd frontend
npm run dev      # Development server (localhost:5173)
npm run build    # Type check and build
npm run lint     # Run linter
```

## Architecture

### Backend (Django + Ninja)

- **Location**: `/backend/`
- **Framework**: Django 5.x with Django Ninja for REST API
- **Authentication**: Session-based with CSRF protection

API routers registered in `consultingos/api.py`:
- `/api/auth/` - users
- `/api/customers/` - customers
- `/api/invoices/` - invoices
- `/api/settings/` - company_settings
- `/api/documents/` - documents
- `/api/calendar/` - calendar
- `/api/kanban/` - kanban
- `/api/timetracking/` - timetracking
- `/api/ai/` - ai
- `/api/chess/` - chess

Each backend app follows the pattern: `apps/<name>/models.py`, `apps/<name>/api.py`

### Frontend (React + TypeScript)

- **Location**: `/frontend/`
- **Framework**: React 18 with TypeScript, Vite build
- **Styling**: Tailwind CSS with dark mode support (`dark:` prefix)
- **State**: Zustand stores in `src/stores/`

## Key Architectural Patterns

### Centralized App Registry

All apps are registered in `src/config/apps.tsx`:

```typescript
export const appRegistry: Record<string, AppDefinition> = {
  dashboard: {
    id: 'dashboard',
    component: DashboardApp,
    icon: <LayoutDashboard className="h-6 w-6" />,
    titleKey: 'apps.dashboard',  // i18n key
    defaultSize: { width: 900, height: 600 },
    category: 'core',            // 'core' | 'productivity' | 'tools' | 'admin'
    canDisable: true,
    adminOnly?: false,
  },
  // ...
}
```

To add a new app:
1. Create component in `src/apps/<name>/`
2. Register in `appRegistry` with all required fields
3. Add to `defaultDockOrder` and `defaultEnabledApps` arrays
4. Add translation key to `src/i18n/locales/{de,en}.json`

### Window Management

Windows are managed by `windowStore.ts` with persistence. Features:
- Stage Manager mode with thumbnails
- Window tiling (up to 8 windows in grid layouts)
- State persistence via Zustand persist middleware

```typescript
const { openWindow, closeWindow, focusWindow } = useWindowStore()
openWindow('dashboard')  // Opens by appId from registry
```

### AI Tools System (Spotlight)

The Spotlight search (`Cmd+K`) uses an extensible tool system:

**Tool Definition** (`src/services/tools/types.ts`):
```typescript
export interface AITool {
  name: string
  description: string  // German description for AI
  parameters: { type: 'object', properties: Record<string, ToolParameter>, required: string[] }
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>
}
```

**Tool Registry** (`src/services/tools/index.ts`):
- Aggregates all `*.tools.ts` files
- Provides `executeTool()`, `getToolDefinitions()` for OpenRouter API

To add new AI tools:
1. Create `src/services/tools/<domain>.tools.ts`
2. Export array of `AITool` objects
3. Import and spread into `toolRegistry` in `index.ts`

### Translations

Three locales in `src/i18n/locales/`: German (`de.json`), English (`en.json`), Turkish (`tr.json`).
All files must have matching keys.

```typescript
const { t } = useTranslation()
return <span>{t('apps.dashboard')}</span>
```

### TitleBar Controls Pattern

App-specific controls in window title bars are defined in `Window.tsx`:

```typescript
function MyAppTitleBarControls() {
  return (
    <button onClick={(e) => { e.stopPropagation(); /* action */ }}>
      Action
    </button>
  )
}
// Then add to TitleBarContent:
{window.appId === 'myapp' && <MyAppTitleBarControls />}
```

### Global Keyboard Shortcuts (Desktop.tsx)

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Open Spotlight |
| `Space` | Maximize/restore active window |
| `Escape` | Close active window (or open Settings if none open) |
| `Arrow Right` | Tile all windows |
| `Option/Alt` (hold) | AI Orb voice input |

## Environment Variables

### Backend (.env)
- `SECRET_KEY`, `DEBUG`
- `EMAIL_*` - SMTP for meeting invitations
- `JITSI_DOMAIN` - Video meeting server
- `PRODUCTION_URL`, `CORS_ALLOWED_ORIGINS`

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_JITSI_DOMAIN` - Jitsi Meet server

## Styling Conventions

- Primary color: `violet-500/600`
- Light mode: `gray-50` bg, `gray-800` text
- Dark mode: `gray-900` bg, `gray-100` text
- Always include `dark:` variants for dark mode support
