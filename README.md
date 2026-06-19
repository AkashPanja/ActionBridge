# Action Bridge

A metadata-driven document review platform for RPA teams — the human-in-the-loop layer for bot-submitted documents.

Bots submit documents via API, humans review and approve/reject them through a clean web UI, all backed by dynamic JSON Schemas per document type.

---

## Features

- **Dynamic Schema Builder** — Define document types visually (drag-and-drop fields) or via raw JSON with undo/redo support
- **Document Lifecycle** — Full state machine: received → pending_review → approved/rejected, with complete audit trail
- **Confidence Scoring** — Per-field confidence heatmap with color-coded validation (green ≥85%, amber ≥70%, red <70%)
- **RPA Bot Integration** — Authenticate with Bearer JWT or X-API-Key; submit documents programmatically
- **Role-Based Access** — Admin, Reviewer, and Viewer roles with granular permission gating across the UI
- **API Key Management** — Generate and revoke scoped API keys per project for bot integration
- **User Management** — List users, assign roles, activate/deactivate accounts
- **Setup Wizard** — First-run admin creation wizard (WordPress-style) with optional SMTP configuration for email notifications
- **Dashboard & Stats** — Per-project metrics: document counts, approval rates, daily volume bar charts, average confidence
- **Dark Mode** — Full dark theme with glass-morphism design throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Pydantic v2 |
| Database | PostgreSQL (production) / SQLite (development) |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Radix UI |
| Auth | Self-contained JWT (email/password) + X-API-Key header for RPA bots |
| Infrastructure | Docker Compose (PostgreSQL + API) |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- (Optional) Docker for PostgreSQL

### Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` — the setup wizard will guide you through creating the admin account.

### Default Credentials

There are no default credentials. On first run, the setup wizard prompts you to create an admin account. After that, log in at `/login`.

### RPA Bot Integration

```bash
# Submit a document via API key
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/documents/document-types/{type_id} \
  -H "X-API-Key: dc_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {"invoice_number": "INV-001", "total_amount": 150.00},
    "confidence_scores": {"invoice_number": 0.98, "total_amount": 0.95}
  }'
```

API keys can be generated from the Project > API Keys tab (admin only).

### Docker (PostgreSQL)

```bash
docker compose up -d
```

Set `DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/actionbridge` in `backend/.env`.

## Project Structure

```
backend/
├── app/
│   ├── auth/          # Authentication (JWT, API keys, permissions)
│   ├── models/        # SQLAlchemy models
│   ├── routers/       # FastAPI route handlers
│   ├── schemas/       # Pydantic request/response schemas
│   ├── services/      # Business logic
│   ├── config.py      # App configuration
│   └── main.py        # FastAPI entry point
├── alembic/           # Database migrations
└── requirements.txt

frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── contexts/      # React contexts (Auth, etc.)
│   ├── hooks/         # Custom React hooks (React Query)
│   ├── lib/           # Utilities (API client, RBAC, helpers)
│   ├── pages/         # Page-level components
│   ├── router/        # Route definitions
│   └── types/         # TypeScript interfaces
├── index.html
├── vite.config.ts
└── package.json
```

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/auth/status` | Check if setup is required |
| `POST` | `/api/v1/auth/setup` | Create initial admin account |
| `POST` | `/api/v1/auth/login` | Login with email/password |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/auth/users` | List users (admin) |
| `PATCH` | `/api/v1/auth/users/{id}` | Update user (admin) |
| `GET/POST/DELETE` | `/api/v1/auth/api-keys` | Manage API keys (admin) |
| `GET/POST` | `/api/v1/projects` | List / create projects |
| `GET` | `/api/v1/projects/{id}/stats` | Project dashboard stats |
| `GET/POST` | `/api/v1/projects/{id}/document-types` | List / create doc types |
| `GET` | `/api/v1/projects/{id}/documents` | List documents (inbox) |
| `POST` | `/api/v1/projects/{id}/documents/document-types/{type_id}` | Submit document |
| `PATCH` | `/api/v1/projects/{id}/documents/{doc_id}` | Update / approve / reject |

## License

**Action Bridge Non-Commercial License**

Copyright © 2026 Akash Panja

Permission is granted to any person to use, copy, modify, and distribute this software for any **non-commercial purpose**, including personal use, internal business use, educational use, and open-source contributions.

**Commercial use is prohibited** without prior written permission from the owner. Commercial use includes, but is not limited to:
- Selling the software, a modified version, or access to it
- Offering the software as a hosted or managed service for a fee
- Bundling the software into a commercial product that is sold

This software is provided "as is", without warranty of any kind.

For commercial licensing inquiries, contact the owner.
