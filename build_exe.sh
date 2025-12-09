#!/bin/bash
# Build script for creating executable (Linux/Mac)
# For Windows, use build_exe.bat instead

echo "========================================"
echo "Website Crawler - Executable Builder"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3 and try again"
    exit 1
fi

echo "[1/5] Checking Python installation..."
python3 --version
echo ""

echo "[2/5] Installing/Upgrading PyInstaller..."
python3 -m pip install --upgrade pyinstaller
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install PyInstaller"
    exit 1
fi
echo ""

echo "[3/5] Installing application dependencies..."
if [ -f "requirements.txt" ]; then
    python3 -m pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "WARNING: Some dependencies may have failed to install"
    fi
else
    echo "WARNING: requirements.txt not found"
fi
echo ""

echo "[4/5] Cleaning previous builds..."
rm -rf build dist __pycache__ *.spec.bak
echo "Cleaned!"
echo ""

echo "[5/5] Building executable with PyInstaller..."
echo "This may take several minutes, please wait..."
echo ""
python3 -m PyInstaller app.spec --clean --noconfirm
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed! Check the error messages above."
    exit 1
fi
echo ""

echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Your executable is located at:"
echo "  dist/WebsiteCrawler"
echo ""
echo "To run the application:"
echo "  ./dist/WebsiteCrawler"
echo ""
echo "Note: First run may be slower as it extracts files."
echo ""

