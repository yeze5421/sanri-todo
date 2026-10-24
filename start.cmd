@echo off
setlocal
cd /d "%~dp0"
if exist "dist\Three-Days-Windows-x64.exe" (
  start "" "%~dp0dist\Three-Days-Windows-x64.exe"
  exit /b 0
)
where node >nul 2>nul
if errorlevel 1 (
  echo Open Three-Days-Windows-x64.exe to use the app without Node.js.
  echo Developers: install Node.js 22.14 or newer, then run npm install.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\electron.cmd" (
  echo Run npm install in this folder first, then try again.
  pause
  exit /b 1
)
call npm start
pause
endlocal
