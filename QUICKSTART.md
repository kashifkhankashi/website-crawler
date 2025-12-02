# Quick Start Guide

## Step 1: Navigate to the Project Directory

Open your terminal/command prompt and navigate to the `siteliner_clone` folder:

```bash
cd siteliner_clone
```

## Step 2: Install Dependencies

Install all required Python packages:

```bash
pip install -r requirements.txt
```

**Note:** If you're using Python 3, you might need to use `pip3` instead:
```bash
pip3 install -r requirements.txt
```

## Step 3: Run the Crawler

### Basic Usage

Run the crawler with a website URL:

```bash
python crawl.py https://example.com
```

**Note:** On some systems, you might need to use `python3`:
```bash
python3 crawl.py https://example.com
```

### With Options

```bash
# Limit crawl depth to 3 levels
python crawl.py https://example.com --max-depth 3

# Specify custom output directory
python crawl.py https://example.com --output-dir ./my_results

# Combine options
python crawl.py https://example.com --max-depth 5 --output-dir ./results
```

## Step 4: Check the Results

After the crawl completes, check the `output/` directory for:

- `report.json` - Detailed report with all page data
- `summary.csv` - CSV summary for easy analysis
- `sitemap.txt` - List of all crawled URLs

## Example Commands

```bash
# Crawl a small website (shallow depth)
python crawl.py https://example.com --max-depth 2

# Crawl a larger site with custom output
python crawl.py https://www.example.com --max-depth 10 --output-dir ./crawl_results
```

## Troubleshooting

### "Module not found" error
Make sure you've installed all dependencies:
```bash
pip install -r requirements.txt
```

### "Python not found" error
Try using `python3` instead of `python`:
```bash
python3 crawl.py https://example.com
```

### Permission errors
On Windows, you might need to run as administrator or use a virtual environment.

### SSL/Certificate errors
Some websites may have SSL issues. The crawler should handle most cases automatically.

