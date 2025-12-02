# 🚀 How to Run the Web Interface

## Step 1: Make sure you're in the project directory

```bash
cd siteliner_clone
```

## Step 2: Start the web server

```bash
python app.py
```

You should see:
```
============================================================
Website Crawler - Web Interface
============================================================

Starting server...
Open your browser and go to: http://localhost:5000

Press Ctrl+C to stop the server
```

## Step 3: Open your browser

Go to: **http://localhost:5000**

## Step 4: Use the interface!

1. Enter a website URL (e.g., `https://example.com`)
2. Set the max depth (how deep to crawl)
3. Click "Start Crawling"
4. Watch the progress in real-time!
5. View results when done

## That's it! 🎉

The web interface provides:
- ✅ Beautiful, modern UI
- ✅ Real-time progress tracking
- ✅ Interactive results table
- ✅ Download reports (JSON, CSV, Sitemap)
- ✅ Search and filter functionality
- ✅ Summary statistics

## Troubleshooting

**Port already in use?**
- Edit `app.py` and change `port=5000` to another port (e.g., `5001`)
- Then access `http://localhost:5001`

**Module not found?**
- Run: `pip install -r requirements.txt`

**Can't connect?**
- Make sure the server is running
- Try `http://127.0.0.1:5000` instead

Enjoy! 🕷️

