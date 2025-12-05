# Performance Optimizations for Website Crawler

This document outlines the performance optimizations implemented to significantly speed up website crawling.

## 🚀 Key Optimizations

### 1. **Increased Concurrency**
- **Before**: 4 concurrent requests per domain
- **After**: 16 concurrent requests per domain, 32 total concurrent requests
- **Impact**: 4x more pages crawled simultaneously

### 2. **Reduced Delays**
- **Before**: 250ms delay between requests
- **After**: 100ms delay between requests
- **Impact**: 2.5x faster request rate

### 3. **Disabled AutoThrottle**
- **Before**: AutoThrottle enabled with 0.5s start delay
- **After**: AutoThrottle disabled for maximum speed
- **Impact**: No adaptive throttling overhead

### 4. **Optimized HTML Parsing**
- **Before**: Using 'lxml' parser (slower, requires C library)
- **After**: Using 'html.parser' (faster, pure Python)
- **Impact**: Faster HTML parsing for each page

### 5. **Disabled Expensive Operations**
- **Performance Analysis**: Disabled by default (was running on every page)
- **HTML Storage**: Disabled by default (saves memory)
- **Similarity Calculation**: Disabled during crawl (can be done post-crawl)
- **Impact**: Eliminates blocking operations during crawl

### 6. **Optimized Broken Link Checking**
- **Before**: 10 concurrent requests, 0.5s delay
- **After**: 32 concurrent requests, 0.1s delay
- **Impact**: 3x faster link checking

### 7. **Reduced Timeouts and Retries**
- **Timeout**: Reduced from 30s to 15s
- **Retries**: Reduced from 3 to 2
- **Impact**: Faster failure detection and recovery

### 8. **Memory Optimizations**
- HTML content not stored by default
- Limited similarity comparisons
- Reduced logging overhead (INFO → WARNING)

## 📊 Expected Performance Improvements

### Small Sites (< 100 pages)
- **Before**: ~2-5 minutes
- **After**: ~30-60 seconds
- **Improvement**: 4-5x faster

### Medium Sites (100-500 pages)
- **Before**: ~10-20 minutes
- **After**: ~2-4 minutes
- **Improvement**: 5x faster

### Large Sites (500-1000+ pages)
- **Before**: ~30-60 minutes
- **After**: ~5-10 minutes
- **Improvement**: 6x faster

## ⚙️ Configuration Options

You can enable expensive features if needed by modifying `crawler/settings.py`:

```python
# Enable performance analysis (slower but detailed)
ENABLE_PERFORMANCE_ANALYSIS = True

# Store full HTML content (uses more memory)
STORE_HTML_CONTENT = True

# Enable similarity calculation during crawl (much slower)
ENABLE_SIMILARITY_DURING_CRAWL = True
MAX_SIMILARITY_COMPARISONS = 100  # Limit comparisons
```

## 🎯 Best Practices

1. **For Speed**: Use default settings (all optimizations enabled)
2. **For Detailed Analysis**: Enable features as needed after initial crawl
3. **For Large Sites**: Consider increasing `MEMUSAGE_LIMIT_MB` if needed
4. **For Slow Servers**: Re-enable AutoThrottle if server is overloaded

## 🔧 Fine-Tuning

If you need to adjust speed vs. politeness:

```python
# More aggressive (faster but less polite)
DOWNLOAD_DELAY = 0.05
CONCURRENT_REQUESTS_PER_DOMAIN = 32

# More polite (slower but respectful)
DOWNLOAD_DELAY = 0.25
CONCURRENT_REQUESTS_PER_DOMAIN = 8
AUTOTHROTTLE_ENABLED = True
```

## 📝 Notes

- All optimizations maintain respect for robots.txt
- Rate limiting is still in place (100ms delay)
- Memory usage is optimized to prevent crashes
- Similarity analysis can be done post-crawl using the duplicate content checker

## 🐛 Troubleshooting

If you experience:
- **Server errors (429, 503)**: Reduce `CONCURRENT_REQUESTS_PER_DOMAIN`
- **Memory issues**: Disable `STORE_HTML_CONTENT` and reduce concurrency
- **Timeout errors**: Increase `DOWNLOAD_TIMEOUT` if server is slow






