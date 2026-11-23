@echo off
start "Backend Python" cmd /k "cd backend && python api.py"
timeout /t 2 /nobreak >nul
start "Frontend Node" cmd /k "node build/server/server.js"
timeout /t 2 /nobreak >nul
start http://localhost:3000