@echo off
REM Dev backend for Foliojoy: apply migrations, then serve the API on http://127.0.0.1:8000
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment and installing dependencies...
  python -m venv .venv
  .venv\Scripts\pip install -r requirements-dev.txt
)

.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --port 8000
