@echo off
TITLE MIPS Sudoku Distributed IDE ^& SIMULATOR
COLOR 0B

echo ==============================================================
echo           MIPS SUDOKU DISTRIBUTED IDE ^& SIMULATOR
echo ==============================================================
echo.
echo  Cleaning up any previous server instances...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :6081') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :6082') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo  [1] Starting Node.js Backend...
echo  [2] Initializing Serveo Tunnel...
echo  [3] Waiting for Public URL...
echo.
echo  Admin Dashboard (Local only): http://localhost:6082
echo  Public Game Link: Will appear below in a few seconds...
echo.
echo ==============================================================
echo  Keep this window open. Closing it WILL stop the server.
echo ==============================================================
echo.

node web-ide.js

echo.
echo  Server stopped. Press any key to exit.
pause >nul
