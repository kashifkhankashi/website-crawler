# Siteliner Clone - Website Crawler

A Python + Scrapy based website crawler similar to Siteliner. This tool crawls internal pages of a domain, extracts text content, detects duplicate content, and reports broken links.

## Features

- **Internal Link Crawling**: Only follows internal URLs, respects robots.txt
- **Content Extraction**: Extracts main text content, titles, and meta descriptions
- **Broken Link Detection**: Checks all internal links and reports their status
- **Duplicate Content Detection**:
  - Exact duplicates (identical content hash)
  - Near duplicates (similarity scoring 0-100%)
- **Comprehensive Reports**: JSON and CSV output formats
- **Configurable**: Depth limits, crawl delays, retry logic

## Installation

1. **Clone or download this project**

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python crawl.py https://example.com
```

### Advanced Usage

```bash
# Set maximum crawl depth
python crawl.py https://example.com --max-depth 5

# Specify output directory
python crawl.py https://example.com --output-dir ./results
```

## Output Files

After crawling, the following files will be generated in the `output/` directory:

1. **report.json**: Detailed JSON report with all page data
2. **summary.csv**: CSV summary with key metrics
3. **sitemap.txt**: List of all crawled URLs

### Report Structure

#### JSON Report (`report.json`)
- Page URL
- HTTP status code
- Title and meta description
- Word count
- Internal and external links
- Broken links list
- Duplicate status (Exact/High/Medium/Low/Unique)
- Similarity scores with other pages
- Content hash

#### CSV Summary (`summary.csv`)
- URL
- Status
- Word Count
- Duplicate (Yes/No)
- Similarity %
- Broken Links Count
- Internal/External Links Count

## Project Structure

```
siteliner_clone/
├── scrapy.cfg                 # Scrapy configuration
├── crawl.py                   # Main run script
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── crawler/                   # Scrapy project
│   ├── __init__.py
│   ├── items.py              # Data structures
│   ├── pipelines.py          # Content processing & duplicate detection
│   ├── settings.py           # Scrapy settings
│   ├── middlewares.py        # Middleware components
│   └── spiders/
│       ├── __init__.py
│       └── site_spider.py    # Main spider
└── output/                    # Generated reports (created automatically)
    ├── report.json
    ├── summary.csv
    └── sitemap.txt
```

## Configuration

### Crawler Settings

Edit `crawler/settings.py` to customize:

- **DOWNLOAD_DELAY**: Delay between requests (default: 1 second)
- **CONCURRENT_REQUESTS_PER_DOMAIN**: Concurrent requests (default: 2)
- **MAX_DEPTH**: Maximum crawl depth (can be set via command line)
- **IGNORED_EXTENSIONS**: File types to skip (PDFs, images, etc.)

### Duplicate Detection Thresholds

Similarity levels (defined in report generator):
- **90%+**: High duplicate
- **70-89%**: Medium duplicate
- **40-69%**: Low duplicate
- **<40%**: Unique

## How It Works

1. **Crawling Phase**:
   - Starts from the provided URL
   - Follows only internal links
   - Respects robots.txt
   - Extracts content using BeautifulSoup
   - Removes navigation, headers, footers

2. **Content Processing**:
   - Normalizes text (lowercase, removes extra spaces)
   - Calculates SHA256 hash for exact duplicate detection
   - Counts words

3. **Duplicate Detection**:
   - Exact duplicates: Compares content hashes
   - Near duplicates: Uses SequenceMatcher for similarity scoring

4. **Broken Link Checking**:
   - Checks all collected internal links
   - Reports HTTP status codes
   - Identifies redirects, 404s, timeouts

5. **Report Generation**:
   - Generates JSON with full details
   - Creates CSV summary
   - Exports sitemap

## Requirements

- Python 3.10+
- Scrapy 2.11+
- BeautifulSoup4 4.12+
- lxml 4.9+
- requests 2.31+ (for broken link checking)

## Limitations

- Only crawls internal links (same domain)
- Respects robots.txt (can be disabled in settings)
- Skips binary files (PDFs, images, etc.)
- May take time for large websites

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **SSL errors**: Some sites may have SSL issues. You can disable SSL verification in settings (not recommended for production).

3. **Timeout errors**: Increase `DOWNLOAD_TIMEOUT` in settings.py

4. **Memory issues**: For very large sites, consider reducing `max_depth` or implementing pagination

## License

This project is provided as-is for educational and development purposes.

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

# -Website-Crawler
# -Website-Crawler
