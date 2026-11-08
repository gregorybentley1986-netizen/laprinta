@echo off
setlocal
cd /d "%~dp0..\.."
set NODE_ENV=production

REM Load gitignored env file if present
if exist ".env.production.local" (
  for /f "usebackq tokens=1* delims== eol=#" %%A in (".env.production.local") do (
    if not "%%A"=="" set "%%A=%%B"
  )
)
if not defined ADMIN_PASSWORD set ADMIN_PASSWORD=laprinta
if not defined ADMIN_SESSION_SECRET set ADMIN_SESSION_SECRET=%ADMIN_PASSWORD%

if not exist "storage\logs" mkdir "storage\logs"
set LOG=storage\logs\next-start.log

echo [%date% %time%] starting next start -H 0.0.0.0 -p 3000 >> "%LOG%"
"node" "node_modules\next\dist\bin\next" start -H 0.0.0.0 -p 3000 >> "%LOG%" 2>&1
set EXIT=%ERRORLEVEL%
echo [%date% %time%] next exited %EXIT% >> "%LOG%"
exit /b %EXIT%
