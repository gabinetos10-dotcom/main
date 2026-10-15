@echo off
rem GJS - lance le site en local (double-clic sous Windows).
cd /d "%~dp0"
echo GJS - serveur local. Fermez cette fenetre pour l'arreter.

where npx >nul 2>nul
if %errorlevel%==0 (
  echo Site disponible sur http://localhost:3000
  start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"
  call npx --yes serve . -l 3000
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Site disponible sur http://localhost:8000
  start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:8000"
  py -m http.server 8000
  goto :eof
)

echo Aucun outil trouve : installez Node.js (https://nodejs.org), puis relancez ce fichier.
pause
