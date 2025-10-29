#!/bin/bash

echo "🚀 Starting NutriLabel Backend Server..."

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python is not installed."
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "✓ Python found: $($PYTHON_CMD --version)"

if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found"
    echo "Make sure you're running this script from the backend directory"
    exit 1
fi

echo "📦 Checking dependencies..."
$PYTHON_CMD -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Dependencies not installed. Installing now..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✓ Dependencies installed successfully"
else
    echo "✓ Dependencies already installed"
fi

echo "🎯 Starting server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

$PYTHON_CMD main.py
