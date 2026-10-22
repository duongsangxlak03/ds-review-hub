@echo off
setlocal
cd /d "%~dp0.."
set /p STORE_NAME=Store name or slug: 
if "%STORE_NAME%"=="" exit /b 1
echo.
npm run blog:review -- --store "%STORE_NAME%"
echo.
pause
