@echo off
echo ==================================================
echo   Starting Roolts App - Build. Learn. Share.
echo ==================================================

echo 1. Starting Backend Server...
start "Roolts Backend" cmd /k "cd backend && call venv\Scripts\activate && python app.py"

echo 2. Starting Frontend Server...
start "Roolts Frontend" cmd /k "cd frontend && npm run dev"

echo 3. Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo 4. Opening Application...
start http://localhost:3000

echo ==================================================
echo   Roolts is running!
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo   You can minimize the command windows, but 
echo   DO NOT close them until you are done.
echo ==================================================
pause
