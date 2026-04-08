# Trackify Backend (FastAPI + Supabase)

Production-ready backend for Trackify with:
- FastAPI
- Supabase Auth + Postgres
- Token-protected APIs for boards, columns, tasks, and swimlanes

## 1) Prerequisites
- Python 3.11+
- Supabase project

## 2) Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Fill `.env` with your Supabase keys.

## 3) Create database schema in Supabase
Run the SQL in `supabase/schema.sql` inside Supabase SQL Editor.

## 4) Run backend
```bash
uvicorn app.main:app --reload --port 8000
```

API docs:
- Swagger: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`

## 5) Frontend integration
Frontend auth pages use:
- `http://localhost:8000/api/v1/auth/*`

Boards/workspace route is protected in frontend using auth guard.

## 6) Main endpoints
### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`

### Boards
- `GET /api/v1/boards`
- `POST /api/v1/boards`
- `GET /api/v1/boards/{board_id}`
- `PATCH /api/v1/boards/{board_id}`
- `DELETE /api/v1/boards/{board_id}`
- `GET /api/v1/boards/{board_id}/snapshot`

### Columns
- `GET /api/v1/boards/{board_id}/columns`
- `POST /api/v1/boards/{board_id}/columns`
- `PATCH /api/v1/columns/{column_id}`
- `POST /api/v1/boards/{board_id}/columns/reorder`
- `DELETE /api/v1/boards/{board_id}/columns/{column_id}`

### Tasks
- `GET /api/v1/boards/{board_id}/tasks`
- `POST /api/v1/boards/{board_id}/tasks`
- `PATCH /api/v1/tasks/{task_id}`
- `POST /api/v1/tasks/{task_id}/move`
- `DELETE /api/v1/tasks/{task_id}`

### Swimlanes
- `GET /api/v1/boards/{board_id}/swimlanes`
- `POST /api/v1/boards/{board_id}/swimlanes`
- `PATCH /api/v1/swimlanes/{swimlane_id}`
- `DELETE /api/v1/swimlanes/{swimlane_id}`

## 7) Seed demo users and data
The project includes a Supabase seeding script:
- `scripts/seed_supabase.py`

Run all seed users:
```bash
python scripts/seed_supabase.py
```

Run selected seed users only:
```bash
python scripts/seed_supabase.py --users product_manager,engineering_lead
```

Skip reset (append without deleting old rows):
```bash
python scripts/seed_supabase.py --skip-reset
```

Seed user keys:
- `product_manager`
- `engineering_lead`
- `operations_manager`
