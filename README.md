# ConsultingOS

A modern, macOS-inspired consulting management application built with Django and React.

![ConsultingOS](https://img.shields.io/badge/ConsultingOS-v1.0-violet)
![Django](https://img.shields.io/badge/Django-5.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## Features

### Core Modules

- **Dashboard** - Revenue overview, open invoices, recent activity
- **Customer Management** - Full CRM with contact details, tax IDs, notes
- **Invoice Management** - Create, send, track invoices with PDF generation
- **Document Management** - File storage with folder structure and drag & drop
- **Calendar** - Event management with Jitsi video meetings and email invitations
- **Kanban Board** - Task management with drag & drop, priorities, due dates
- **Time Tracking** - Track hours per project/client with billing rates

### Additional Features

- **AI-powered Spotlight** - Natural language search and commands (Cmd+K)
- **Dark/Light Theme** - System-aware theme switching
- **Multilingual** - German and English support
- **macOS-style UI** - Familiar desktop experience with windows, dock, menu bar

## Tech Stack

### Backend
- Python 3.11+
- Django 5.x
- Django Ninja (REST API)
- SQLite (dev) / PostgreSQL (prod)

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Framer Motion (Animations)
- i18next (Internationalization)

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

### Backend (.env)

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True

# Email (for meeting invitations)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-password

# Jitsi Meet
JITSI_DOMAIN=meet.jit.si

# Production
PRODUCTION_URL=https://your-domain.com
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api
VITE_JITSI_DOMAIN=meet.jit.si
```

## Project Structure

```
consultingos/
├── backend/
│   ├── apps/
│   │   ├── calendar/      # Calendar & video meetings
│   │   ├── customers/     # Customer management
│   │   ├── documents/     # File management
│   │   ├── invoices/      # Invoice management
│   │   ├── kanban/        # Kanban board
│   │   ├── timetracking/  # Time tracking
│   │   └── users/         # Authentication
│   ├── consultingos/      # Django settings
│   └── manage.py
│
└── frontend/
    ├── src/
    │   ├── apps/          # Application modules
    │   ├── components/    # Shared components
    │   ├── stores/        # Zustand stores
    │   ├── api/           # API client & types
    │   └── i18n/          # Translations
    └── package.json
```

## API Documentation

The API is available at `/api/docs` when running the backend server.

### Main Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/api/auth/` | Login, logout, user info |
| Customers | `/api/customers/` | CRUD operations |
| Invoices | `/api/invoices/` | Invoice management |
| Calendar | `/api/calendar/` | Events & meetings |
| Documents | `/api/documents/` | File management |
| Kanban | `/api/kanban/` | Board & cards |
| Time Tracking | `/api/timetracking/` | Entries & projects |

## Video Meetings

ConsultingOS uses Jitsi Meet for video conferencing:

1. Create a calendar event
2. Enable "Video Meeting" toggle
3. Invite attendees via email
4. Guests receive email with meeting link
5. No account required to join

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Spotlight search |
| `Cmd/Ctrl + N` | New item (context-aware) |
| `Escape` | Close window/modal |

## License

MIT License - feel free to use this project for your own consulting business.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with Claude Code
