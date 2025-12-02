# Web Interface Guide

The website crawler now includes a **beautiful web interface** for easy use!

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Web Server

```bash
python app.py
```

### 3. Open Your Browser

Navigate to: **http://localhost:5000**

## 📱 Using the Web Interface

### Starting a Crawl

1. **Enter Website URL**: Type the website you want to crawl (e.g., `https://example.com`)
2. **Set Max Depth**: Choose how deep to crawl (1-20 levels)
3. **Output Directory**: Leave default or specify custom folder
4. **Click "Start Crawling"**

### Watching Progress

- **Real-time Progress Bar**: See crawl progress in real-time
- **Live Statistics**: Watch pages and links being discovered
- **Status Updates**: Get notified of each phase (crawling, checking links, etc.)

### Viewing Results

After the crawl completes:

- **View Results**: Click to see detailed results page
- **Download Reports**: Download JSON, CSV, or Sitemap files
- **Filter & Search**: Use filters to find specific pages
- **Summary Cards**: Quick overview of crawl statistics

## 🎨 Features

### Main Page
- Clean, modern interface
- Easy-to-use form
- Real-time progress tracking
- Error handling and notifications

### Results Page
- **Summary Dashboard**: 
  - Total pages crawled
  - Unique pages
  - Broken links count
  - Duplicate pages
  
- **Interactive Table**:
  - Sortable columns
  - Search functionality
  - Filter by duplicate status
  - Filter by HTTP status
  
- **Download Options**:
  - JSON report (full data)
  - CSV summary (spreadsheet)
  - Sitemap (URL list)

## 🔧 Command Line vs Web Interface

### Command Line (crawl.py)
- Faster for automation
- Better for scripts
- No GUI needed

### Web Interface (app.py)
- User-friendly
- Visual progress
- Easy result browsing
- No command line needed

## 🌐 Accessing from Other Devices

The web server runs on `0.0.0.0:5000`, so you can access it from other devices on your network:

1. Find your computer's IP address
2. On another device, go to: `http://YOUR_IP:5000`

## 🛠️ Troubleshooting

### Port Already in Use
If port 5000 is busy, edit `app.py` and change:
```python
socketio.run(app, debug=True, host='0.0.0.0', port=5000)
```
Change `port=5000` to another port like `5001`.

### Module Not Found
Make sure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Connection Issues
- Make sure the server is running
- Check firewall settings
- Try `http://127.0.0.1:5000` instead of `localhost`

## 📊 Example Workflow

1. Start server: `python app.py`
2. Open browser: `http://localhost:5000`
3. Enter URL: `https://example.com`
4. Set depth: `3`
5. Click "Start Crawling"
6. Watch progress bar fill up
7. When done, click "View Results"
8. Browse the results table
9. Download reports as needed

Enjoy crawling! 🕷️

