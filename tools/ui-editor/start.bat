@echo off
REM 와벨리 UI 에디터 실행 — localhost로 띄워야 '직접 저장'이 동작해요.
cd /d "%~dp0"
echo.
echo  와벨리 UI 에디터를 http://localhost:8077 에서 엽니다...
echo  (창을 닫으면 종료됩니다. 앱 미리보기는 따로 8081에서 돌고 있어야 해요.)
echo.
start "" http://localhost:8077
python -m http.server 8077
