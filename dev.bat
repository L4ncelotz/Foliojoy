@echo off
REM Foliojoy one-command dev launcher (no Docker).
REM Starts the backend (own window) + frontend (this window).
cd /d "%~dp0"

start "Foliojoy Backend - uvicorn :8000" "%~dp0backend\dev-serve.bat"

cd /d "%~dp0frontend"
echo.
echo  Frontend : http://127.0.0.1:5173
echo  Backend  : http://127.0.0.1:8000
echo  (If another app already uses port 5173, run: npm run dev -- --port 5174)
echo.
npm run dev
