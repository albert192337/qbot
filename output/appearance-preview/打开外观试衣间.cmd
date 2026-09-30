@echo off
set ELECTRON_RUN_AS_NODE=
start "" "%~dp0..\..\app\node_modules\electron\dist\electron.exe" "%~dp0..\..\scripts\test-appearance-preview.cjs" --preview
