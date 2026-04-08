# Trackify

Trackify is a Kanban-style task management dashboard built with Angular (standalone components), Angular Material, and CDK drag-and-drop.

This repository now includes:
- Frontend (`src/`) with protected auth routes/pages
- Backend (`backend/`) using FastAPI + Supabase

## Frontend setup
```bash
npm install
npm start
```

Frontend runs at:
- `http://localhost:4200`

## Backend setup (FastAPI + Supabase)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Run backend:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend docs:
- `http://localhost:8000/docs`

Seed demo users/workspace data:
```bash
cd backend
python scripts/seed_supabase.py
```

## Supabase schema
Apply SQL schema in:
- `backend/supabase/schema.sql`

## Auth routes added in frontend
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`

Workspace routes are protected and require authentication.

## Build
```bash
npm run build
```
