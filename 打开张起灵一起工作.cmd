@echo off
cd /d "%~dp0"
node app/node_modules/electron/cli.js scripts/try-work-mode.cjs
