"""
Scrapy settings for crawler project.

For simplicity, this file contains only settings considered important or
commonly used. You can find more settings consulting the documentation:

    https://docs.scrapy.org/en/latest/topics/settings.html
    https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
    https://docs.scrapy.org/en/latest/topics/spider-middleware.html
"""

BOT_NAME = 'crawler'

SPIDER_MODULES = ['crawler.spiders']
NEWSPIDER_MODULE = 'crawler.spiders'

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure a delay for requests for the same website (default: 0)
# See https://docs.scrapy.org/en/latest/topics/settings.html#download-delay
# Optimized for faster crawling while still being respectful
DOWNLOAD_DELAY = 0.1  # 100ms delay between requests (reduced from 250ms)

# The download delay setting will honor only one of:
CONCURRENT_REQUESTS_PER_DOMAIN = 16  # Increased from 4 for faster crawling
CONCURRENT_REQUESTS_PER_IP = 16
CONCURRENT_REQUESTS = 32  # Total concurrent requests (increased for speed)

# Disable cookies (enabled by default)
COOKIES_ENABLED = False

# Disable Telnet Console (enabled by default)
TELNETCONSOLE_ENABLED = False

# Override the default request headers:
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Enable or disable spider middlewares
# See https://docs.scrapy.org/en/latest/topics/spider-middleware.html
SPIDER_MIDDLEWARES = {
    'crawler.middlewares.CrawlerSpiderMiddleware': 543,
}

# Enable or disable downloader middlewares
# See https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
DOWNLOADER_MIDDLEWARES = {
    'crawler.middlewares.CrawlerDownloaderMiddleware': 543,
}

# Configure item pipelines
# See https://docs.scrapy.org/en/latest/topics/item-pipeline.html
ITEM_PIPELINES = {
    'crawler.pipelines.ContentProcessingPipeline': 300,
    'crawler.pipelines.DuplicateDetectionPipeline': 400,
    'crawler.pipelines.ItemStoragePipeline': 500,
}

# Enable and configure the AutoThrottle extension (disabled for maximum speed)
# See https://docs.scrapy.org/en/latest/topics/autothrottle.html
AUTOTHROTTLE_ENABLED = False  # Disabled for faster crawling
AUTOTHROTTLE_START_DELAY = 0.5
AUTOTHROTTLE_MAX_DELAY = 5
AUTOTHROTTLE_TARGET_CONCURRENCY = 4.0
AUTOTHROTTLE_DEBUG = False

# Enable and configure HTTP caching
# Set to False to always get fresh data (recommended for website analysis)
# Set to True to cache responses (faster but may return stale data)
# See https://docs.scrapy.org/en/latest/topics/downloader-middleware.html#httpcache-middleware-settings
HTTPCACHE_ENABLED = False  # Disabled by default to always get fresh data
HTTPCACHE_EXPIRATION_SECS = 3600  # 1 hour (only used if HTTPCACHE_ENABLED = True)
HTTPCACHE_DIR = 'httpcache'
HTTPCACHE_IGNORE_HTTP_CODES = []
HTTPCACHE_STORAGE = 'scrapy.extensions.httpcache.FilesystemCacheStorage'

# Retry settings (optimized for faster failure handling)
RETRY_ENABLED = True
RETRY_TIMES = 2  # Reduced from 3 for faster failure detection
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Timeout settings (reduced for faster failure detection)
DOWNLOAD_TIMEOUT = 15  # Reduced from 30 seconds

# Logging (reduced logging for better performance)
LOG_LEVEL = 'WARNING'  # Reduced from INFO to reduce I/O overhead

# Performance optimization settings
# Disable expensive operations by default for faster crawling
ENABLE_PERFORMANCE_ANALYSIS = False  # Performance analysis is expensive, disable by default
STORE_HTML_CONTENT = True  # Keep enabled for schema analysis, but can be disabled if not needed
ENABLE_SIMILARITY_DURING_CRAWL = True  # Keep enabled but will use efficient MinHash
MAX_SIMILARITY_COMPARISONS = 50  # Limit similarity comparisons per page to avoid O(n²) slowdown

# File extensions to ignore
IGNORED_EXTENSIONS = [
    # Images
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'ico', 'webp',
    # Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    # Archives
    'zip', 'rar', 'tar', 'gz',
    # Media
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv',
    # Other
    'css', 'js', 'xml', 'json', 'rss', 'atom'
]

