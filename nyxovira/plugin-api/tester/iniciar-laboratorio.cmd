@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Node.js nao foi encontrado. Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)
if not exist node_modules\playwright\package.json (
  call npm.cmd install || (
    echo Nao foi possivel instalar as dependencias do laboratorio.
    pause
    exit /b 1
  )
)
node server.mjs --open
endlocal

