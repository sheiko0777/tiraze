@echo off
cd /d "%~dp0"
start "" http://localhost:8088
python -X utf8 serve.py 8088
pause
