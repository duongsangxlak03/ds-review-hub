@echo off
setlocal
cd /d "%~dp0.."
echo This will generate and publish 10 blog review posts with local Gemini CLI.
choice /M "Continue"
if errorlevel 2 exit /b 1
echo.
npm run blog:batch:publish
echo.
pause
