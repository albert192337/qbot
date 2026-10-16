@echo off
cd /d "%~dp0"
node scripts\preview-desktop-pinball.cjs
if errorlevel 1 pause
