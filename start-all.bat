@echo off
REM Talisay ML - Start All Services (Batch file wrapper)
REM Double-click this file to start all services

echo ========================================
echo   TALISAY ML - Starting All Services  
echo ========================================
echo.

cd /d "%~dp0"

REM Start Python ML Backend
echo [1/3] Starting Python ML Backend...
start "ML Backend" cmd /k "cd ml && ..\\.venv\\Scripts\\python.exe api.py"
timeout /t 2 /nobreak >nul

REM Start Node.js Backend  
echo [2/3] Starting Node.js Backend...
start "Node Backend" cmd /k "cd server && npm start"
timeout /t 2 /nobreak >nul

REM Start Expo Frontend
echo [3/3] Starting Expo Frontend...
start "Expo Frontend" cmd /k "npx expo start"

echo.
echo ========================================
echo   All services are starting!          
echo ========================================
echo.
echo Services:
echo   - ML Backend:   http://localhost:5000
echo   - Node Backend: http://localhost:3000
echo   - Expo:         Check the Expo window
echo.
echo To stop all services, close the terminal windows.
echo.
pause
