# 🔧 Troubleshooting Executable Issues

## Problem: Executable Opens and Closes Immediately

If the executable window opens for a moment and then closes, there's an error occurring. Here's how to fix it:

### Solution 1: Use the Wrapper Script

I've created a wrapper script that will keep the console open so you can see errors:

1. Navigate to the `dist` folder
2. Double-click `RUN_WEBSITE_CRAWLER.bat` instead of `WebsiteCrawler.exe`
3. This will show any error messages before closing

### Solution 2: Run from Command Prompt

1. Open Command Prompt (cmd.exe)
2. Navigate to the `dist` folder:
   ```cmd
   cd C:\Users\LENOVO\Desktop\check\siteliner_clone\dist
   ```
3. Run the executable:
   ```cmd
   WebsiteCrawler.exe
   ```
4. You'll see the error message in the console

### Solution 3: Common Fixes

#### Fix 1: SocketIO Async Mode Issue

The error was: `ValueError: Invalid async_mode specified`

**Fixed!** I've already updated the code to remove the problematic async_mode. The new executable should work.

**To rebuild with the fix:**
```bash
cd siteliner_clone
python -m PyInstaller app.spec --clean --noconfirm
```

#### Fix 2: Port Already in Use

If you see: `Address already in use` or `Port 5000 is already in use`

**Solution:**
- Close other applications using port 5000
- Or modify `app.py` to use a different port before rebuilding

#### Fix 3: Missing Dependencies

If you see: `ModuleNotFoundError` or `ImportError`

**Solution:**
- Rebuild the executable after ensuring all dependencies are installed
- Check that all modules are listed in `hiddenimports` in `app.spec`

#### Fix 4: Missing Data Files

If templates or static files are missing:

**Solution:**
- Check that `app.spec` includes all necessary files in the `datas` section
- Rebuild the executable

## 🔍 Testing the New Executable

After rebuilding, test it:

1. **Use the wrapper script:**
   - Run `RUN_WEBSITE_CRAWLER.bat` from the `dist` folder
   - This will show errors if any occur

2. **Or run from command line:**
   ```cmd
   cd dist
   WebsiteCrawler.exe
   ```

3. **Expected behavior:**
   - Console window opens
   - Shows: "Starting server..."
   - Shows: "Open your browser and go to: http://localhost:5000"
   - Window stays open (don't close it!)
   - Open browser to http://localhost:5000

## 📝 Recent Fixes Applied

1. ✅ Removed problematic `async_mode='threading'` from SocketIO
2. ✅ Added error handling to keep console open on errors
3. ✅ Disabled debug mode for production executable
4. ✅ Added better error messages

## 🚀 Next Steps

1. **Rebuild the executable** (if not already done):
   ```bash
   cd siteliner_clone
   python -m PyInstaller app.spec --clean --noconfirm
   ```

2. **Test using the wrapper script:**
   - Use `RUN_WEBSITE_CRAWLER.bat` from the `dist` folder

3. **If still having issues:**
   - Run from command prompt to see the exact error
   - Check the error message and let me know what it says
   - Common issues are listed above

## 💡 Tips

- **Always use the wrapper script** (`RUN_WEBSITE_CRAWLER.bat`) - it shows errors better
- **Keep the console window open** - closing it stops the server
- **Check port 5000** - make sure nothing else is using it
- **First run is slower** - wait 10-30 seconds for extraction

---

If you still have issues, run from command prompt and share the error message!

