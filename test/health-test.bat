@echo off
echo Sending request to /health...

curl --silent http://localhost:5000/health > response.txt

findstr /C:"\"status\":\"ok\"" response.txt > nul

IF %ERRORLEVEL% EQU 0 (
    echo Health check passed.
    if not exist app.pid (
        for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| findstr "node.exe"') do (
            echo %%~i > app.pid
        )
    )
    exit /b 0
) ELSE (
    echo Health check failed.
    type response.txt
    exit /b 1
)
