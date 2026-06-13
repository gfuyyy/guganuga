@echo off
cd /d "%~dp0"
echo Starting ValuableCoins Server...
start cmd /k ""C:\Program Files\nodejs\node.exe" server.js"
echo.
echo Server should open in a new window...
echo Then go to: http://localhost:3000
pause
