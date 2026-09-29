@echo off
set ELECTRON_RUN_AS_NODE=
start "" "%~dp0..\..\app\node_modules\electron\dist\electron.exe" "%~dp0..\..\scripts\test-pixi-effects.cjs" --preview
