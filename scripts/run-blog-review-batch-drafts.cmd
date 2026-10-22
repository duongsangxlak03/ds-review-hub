@echo off
setlocal
cd /d "%~dp0.."
echo Generating 10 draft blog review posts with local Gemini CLI...
echo.
npm run blog:batch
echo.
pause
