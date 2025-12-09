# 🚀 Building an Executable (.exe) File

This guide will help you create a standalone Windows executable (.exe) file from your Flask application. The executable will include all dependencies and can be run on any Windows computer without requiring Python installation.

## 📋 Prerequisites

1. **Python 3.8+** installed on your system
2. **All project dependencies** installed (from `requirements.txt`)
3. **Windows OS** (for .exe file) or Linux/Mac (for other executables)

## 🔧 Step-by-Step Instructions

### Option 1: Using the Automated Build Script (Recommended)

#### For Windows:

1. Open Command Prompt or PowerShell in the project directory:
   ```bash
   cd siteliner_clone
   ```

2. Run the build script:
   ```bash
   build_exe.bat
   ```

3. Wait for the build to complete (this may take 5-15 minutes)

4. Find your executable at: `dist\WebsiteCrawler.exe`

#### For Linux/Mac:

1. Open Terminal in the project directory:
   ```bash
   cd siteliner_clone
   ```

2. Make the script executable:
   ```bash
   chmod +x build_exe.sh
   ```

3. Run the build script:
   ```bash
   ./build_exe.sh
   ```

4. Find your executable at: `dist/WebsiteCrawler`

### Option 2: Manual Build

1. **Install PyInstaller:**
   ```bash
   pip install pyinstaller
   ```

2. **Build the executable:**
   ```bash
   pyinstaller app.spec --clean --noconfirm
   ```

3. **Find the executable:**
   - Windows: `dist\WebsiteCrawler.exe`
   - Linux/Mac: `dist/WebsiteCrawler`

## 📦 What Gets Included

The executable includes:
- ✅ All Python code and dependencies
- ✅ Flask web server
- ✅ All analyzer modules
- ✅ Templates (HTML files)
- ✅ Static files (CSS, JavaScript)
- ✅ Scrapy and crawler modules
- ✅ All required libraries

## 🚀 Running the Executable

### Windows:
1. Double-click `WebsiteCrawler.exe` in the `dist` folder
2. Or run from command line:
   ```bash
   dist\WebsiteCrawler.exe
   ```

3. Open your browser and go to: **http://localhost:5000**

### Linux/Mac:
1. Make it executable:
   ```bash
   chmod +x dist/WebsiteCrawler
   ```

2. Run it:
   ```bash
   ./dist/WebsiteCrawler
   ```

3. Open your browser and go to: **http://localhost:5000**

## ⚙️ Configuration Options

### Hide Console Window (Windows)

If you want to hide the console window when running the executable:

1. Open `app.spec` in a text editor
2. Find the line: `console=True,`
3. Change it to: `console=False,`
4. Rebuild the executable

### Add an Icon

1. Create or find an `.ico` file (for Windows) or `.png` file
2. Place it in the project directory
3. In `app.spec`, find the line: `icon=None,`
4. Change it to: `icon='path/to/your/icon.ico',`
5. Rebuild the executable

### Change Executable Name

1. Open `app.spec` in a text editor
2. Find the line: `name='WebsiteCrawler',`
3. Change it to your desired name
4. Rebuild the executable

## 🔍 Troubleshooting

### Build Fails with "Module not found"

**Solution:** Add the missing module to `hiddenimports` in `app.spec`:
```python
hiddenimports = [
    # ... existing imports ...
    'your_missing_module',
]
```

Then rebuild.

### Executable is Very Large (>500MB)

**Solution:** This is normal! The executable includes:
- Python interpreter
- All dependencies (Flask, Scrapy, Playwright, etc.)
- All Python libraries

The first run extracts files, which may take time. This is expected.

### Executable Runs but Browser Shows Error

**Solution:**
1. Check if the port 5000 is already in use
2. Look at the console output for error messages
3. Ensure all data files (templates, static) were included in the build

### "Antivirus Detected as Threat"

**Solution:** This is a false positive. PyInstaller executables are sometimes flagged because they:
- Are packaged files that extract at runtime
- May contain executable code

To resolve:
1. Add an exception in your antivirus software
2. Sign the executable with a code signing certificate (advanced)

### Playwright Browser Not Found

**Solution:** Playwright browsers need to be installed separately:
1. Before building, run:
   ```bash
   playwright install chromium
   ```

2. The browsers will be included in the executable automatically

### Port Already in Use

**Solution:** The executable tries to use port 5000 by default. If it's busy:
1. Close other applications using port 5000
2. Or modify `app.py` to use a different port before building

## 📝 File Structure After Build

```
siteliner_clone/
├── dist/                    # Final executable location
│   └── WebsiteCrawler.exe   # Your executable file
├── build/                   # Temporary build files (can be deleted)
└── app.spec                 # PyInstaller specification file
```

## 🎯 Distribution

### Distributing Your Executable

To distribute your application:

1. **Single File Distribution:**
   - Just share `WebsiteCrawler.exe`
   - Users can run it directly (no installation needed)

2. **Folder Distribution:**
   - Share the entire `dist` folder
   - More reliable for complex applications

### Creating a Distribution Package

1. Create a folder with:
   - `WebsiteCrawler.exe`
   - `README.txt` (with instructions)
   - Any additional documentation

2. Zip the folder and distribute

## 🔄 Updating the Executable

After making code changes:

1. Make your changes to the Python files
2. Run the build script again:
   ```bash
   build_exe.bat  # Windows
   # or
   ./build_exe.sh  # Linux/Mac
   ```

3. The new executable will be in the `dist` folder

## 💡 Tips

1. **Test First:** Always test the executable on a clean machine before distributing
2. **Keep Source Code:** The executable doesn't replace your source code - keep both!
3. **Version Control:** Don't commit the `dist` or `build` folders to git (add them to `.gitignore`)
4. **Clean Builds:** Delete `build` and `dist` folders before rebuilding for a clean build
5. **Size Optimization:** The executable will be large (200-500MB+) due to all dependencies - this is normal

## 🆘 Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Review the PyInstaller documentation: https://pyinstaller.org/
3. Check the `app.spec` file configuration
4. Ensure all dependencies are properly listed in `requirements.txt`

## 📚 Additional Resources

- [PyInstaller Documentation](https://pyinstaller.org/)
- [PyInstaller Manual](https://pyinstaller.org/en/stable/usage.html)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/latest/deploying/)

---

**Note:** Building an executable bundles everything into one file. First-time execution may take longer as files are extracted. Subsequent runs will be faster.

Happy building! 🎉

