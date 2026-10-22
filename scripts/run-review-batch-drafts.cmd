@echo off
setlocal
cd /d "%~dp0.."
echo Generating 20 draft store reviews with local Gemini CLI...
echo.
npm run review:batch
echo.
pause
