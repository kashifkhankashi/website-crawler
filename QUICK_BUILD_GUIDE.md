# ⚡ Quick Build Guide - Create .exe File

## 🚀 Fastest Way to Build

### Windows:

```bash
cd siteliner_clone
build_exe.bat
```

That's it! The executable will be in `dist\WebsiteCrawler.exe`

## 📋 Prerequisites Check

Before building, make sure you have:

1. ✅ Python installed (check with: `python --version`)
2. ✅ All dependencies installed: `pip install -r requirements.txt`
3. ✅ PyInstaller will be installed automatically by the build script

## 🎯 Quick Steps

1. **Navigate to project folder:**
   ```bash
   cd siteliner_clone
   ```

2. **Run build script:**
   - **Windows:** Double-click `build_exe.bat` or run in CMD
   - **Linux/Mac:** Run `./build_exe.sh` in terminal

3. **Wait 5-15 minutes** for build to complete

4. **Find your .exe** at: `dist\WebsiteCrawler.exe`

5. **Run it!** Double-click the .exe file

6. **Open browser** to: http://localhost:5000

## ⚠️ Important Notes

- **First build takes longer** (10-15 minutes) - be patient!
- **Executable will be large** (200-500MB) - this is normal
- **First run may be slow** - files are being extracted
- **Keep console window open** - it shows server status

## 🔧 Troubleshooting

**Build fails?**
- Make sure Python is installed: `python --version`
- Install dependencies: `pip install -r requirements.txt`
- Check error messages in console

**Executable doesn't work?**
- Check console for error messages
- Make sure port 5000 is not in use
- Try running from command line to see errors

**Need help?**
- Read full guide: `BUILD_EXECUTABLE.md`
- Check PyInstaller docs: https://pyinstaller.org/

## 📝 What You Get

After building, you'll have:
- `WebsiteCrawler.exe` - Standalone executable
- Works on any Windows PC (no Python needed!)
- All features included
- Ready to distribute

---

**That's it!** Just run the build script and you're done! 🎉

