@echo off
setlocal
cd /d "%~dp0.."
echo This will generate and publish 20 store reviews with local Gemini CLI.
choice /M "Continue"
if errorlevel 2 exit /b 1
echo.
npm run review:batch:publish
echo.
pause
