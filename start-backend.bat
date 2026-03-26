@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "LOG_DIR=%ROOT_DIR%logs"
set "LOG_FILE=%LOG_DIR%\backend.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%NODE_EXE%" (
  echo No se encontro Node.js en "%NODE_EXE%".
  exit /b 1
)

cd /d "%BACKEND_DIR%"
"%NODE_EXE%" server.js >> "%LOG_FILE%" 2>&1
