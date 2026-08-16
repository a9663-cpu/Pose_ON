@echo off
cd /d "%~dp0"

set "PY=py"
where py >nul 2>nul || set "PY=python"

echo.
echo   Pose ON
echo   ----------------------------------------
echo   This PC : http://localhost:5173
echo   Phone   : use one of the IPv4 addresses
echo             below, with :5173  (same Wi-Fi)
ipconfig | findstr /i "IPv4"
echo   ----------------------------------------
echo   The server runs in the "Pose ON Server"
echo   window. Close that window to stop it.
echo.

start "Pose ON Server" /min %PY% -m http.server 5173
ping -n 4 127.0.0.1 >nul
start "" http://localhost:5173
