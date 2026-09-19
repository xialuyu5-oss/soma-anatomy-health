@echo off
cd /d "%~dp0"
python start.py --background --port 8766
if errorlevel 1 (
  echo.
  echo SOMA did not start. Python 3 must be installed; details are in validation\server.log.
) else (
  echo.
  echo Open the address printed above in your browser.
  echo The server keeps running after this window closes.
)
pause
