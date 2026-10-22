@echo off
setlocal
cd /d "%~dp0.."
echo Starting Local Blog Generator Bridge...
echo Keep this window open while using Admin Blog.
echo.
npm run blog:local-server
echo.
pause
