@echo off
echo.
echo 🚀 Starting NutriLabel Backend Server...
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Python is not installed.
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo ✓ Python found
python --version
echo.

if not exist "requirements.txt" (
    echo ❌ Error: requirements.txt not found
    echo Make sure you're running this script from the backend directory
    pause
    exit /b 1
)

echo 📦 Checking dependencies...
python -c "import fastapi" >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Dependencies not installed. Installing now...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✓ Dependencies installed successfully
) else (
    echo ✓ Dependencies already installed
)

echo.
echo 🎯 Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

python main.py
