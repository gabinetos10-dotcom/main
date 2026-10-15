@echo off
rem GJS - lance le site en local (double-clic sous Windows).
if "%~1"==":open" goto open
pushd "%~dp0" || (echo Impossible d'ouvrir le dossier du site. & pause & exit /b 1)
if not exist "index.html" (echo Dezippez d'abord l'archive : clic droit sur le ZIP, Extraire tout, puis relancez ce fichier depuis le dossier extrait. & pause & exit /b 1)
echo GJS - serveur local. Fermez cette fenetre pour l'arreter.
echo Au premier lancement, l'installation peut prendre jusqu'a une minute : le navigateur s'ouvrira tout seul.
echo Si le pare-feu Windows pose une question, vous pouvez cliquer sur Annuler : le site reste accessible sur cet ordinateur.
echo.

where npx >nul 2>nul
if %errorlevel%==0 (
  start "" /min cmd /c ""%~f0" :open 3000"
  call npx --yes serve . -l tcp://127.0.0.1:3000
  if errorlevel 1 (echo. & echo Le serveur n'a pas pu demarrer : lisez le message ci-dessus. & pause)
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" /min cmd /c ""%~f0" :open 8000"
  py -m http.server 8000 --bind 127.0.0.1
  if errorlevel 1 (echo. & echo Le serveur n'a pas pu demarrer : lisez le message ci-dessus. & pause)
  goto :eof
)

echo Aucun outil trouve : installez Node.js (https://nodejs.org), puis relancez ce fichier.
pause
goto :eof

:open
rem Ouvre le navigateur des que le serveur repond (2 minutes maximum).
for /l %%i in (1,1,120) do (
  curl -s -o nul http://127.0.0.1:%~2/ && (start "" http://localhost:%~2/ & exit /b 0)
  timeout /t 1 /nobreak >nul
)
start "" http://localhost:%~2/
exit /b 0
