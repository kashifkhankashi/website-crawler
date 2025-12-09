@echo off
REM Build script for creating Windows executable
REM This script automates the PyInstaller build process

echo ========================================
echo Website Crawler - Executable Builder
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

echo [1/5] Checking Python installation...
python --version
echo.

echo [2/5] Installing/Upgrading PyInstaller...
python -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)
echo.

echo [3/5] Installing application dependencies...
if exist requirements.txt (
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo WARNING: Some dependencies may have failed to install
    )
) else (
    echo WARNING: requirements.txt not found
)
echo.

echo [4/5] Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist __pycache__ rmdir /s /q __pycache__
echo Cleaned!
echo.

echo [5/5] Building executable with PyInstaller...
echo This may take several minutes, please wait...
echo.
python -m PyInstaller app.spec --clean --noconfirm
if errorlevel 1 (
    echo ERROR: Build failed! Check the error messages above.
    pause
    exit /b 1
)
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Your executable is located at:
echo   dist\WebsiteCrawler.exe
echo.
echo To run the application, double-click WebsiteCrawler.exe
echo or run it from command line:
echo   dist\WebsiteCrawler.exe
echo.
echo Note: First run may be slower as it extracts files.
echo.
pause

