@echo off
cd /d "%~dp0"
echo Starting Clockify Report...
node index.js
echo.
echo Done. Press any key to close...
pause >nul
