# Analysis Configuration System

## Overview

The application now includes a comprehensive analysis configuration system that allows users to choose exactly what analysis they want. **Full Deep Analysis is the default** - all analysis features are enabled by default, ensuring no compromise on analysis quality.

## User Interface

### Analysis Configuration Section

When starting a new crawl, users will see an "Analysis Configuration" section with:

1. **Preset Buttons**:
   - **Full Deep Analysis (Recommended)**: Everything enabled, maximum comparisons (200)
   - **Standard Analysis**: Balanced settings (100 comparisons)
   - **Fast Analysis**: Minimal analysis for speed (50 comparisons)

2. **Individual Options**:
   - ✅ **Performance Analysis**: Analyze page load speed, heavy images, slow JS/CSS files
   - ✅ **Store HTML Content**: Required for Schema Analysis, DOM Analysis
   - ✅ **Similarity Analysis During Crawl**: Detect duplicate and similar content
   - **Max Similarity Comparisons**: 10-500 (default: 100)
   - **Crawl Speed**: Full Analysis / Balanced / Fast

## Default Settings (Full Deep Analysis)

All analysis features are **enabled by default**:

```python
ENABLE_PERFORMANCE_ANALYSIS = True
STORE_HTML_CONTENT = True
ENABLE_SIMILARITY_DURING_CRAWL = True
MAX_SIMILARITY_COMPARISONS = 100
CRAWL_SPEED = 'balanced'
```

## Configuration Options

### Performance Analysis
- **Enabled**: Analyzes every page for performance issues
- **Disabled**: Skips performance analysis (faster crawling)

### HTML Content Storage
- **Enabled**: Stores full HTML for Schema Analysis, DOM Analysis
- **Disabled**: Saves memory but disables advanced features

### Similarity Analysis
- **Enabled**: Detects duplicate and similar content during crawl
- **Disabled**: Similarity analysis skipped (much faster)

### Max Similarity Comparisons
- **10-50**: Fast but less accurate
- **50-100**: Balanced (recommended)
- **100-200**: Comprehensive analysis
- **200-500**: Maximum accuracy (slowest)

### Crawl Speed
- **Full Analysis**: Slower, more thorough (0.2s delay, 8 concurrent)
- **Balanced**: Recommended (0.1s delay, 16 concurrent)
- **Fast**: Maximum speed (0.05s delay, 32 concurrent)

## How It Works

1. User selects analysis options in the web interface
2. Configuration is sent to backend via `/api/start-crawl`
3. Backend stores configuration in `active_crawls[job_id]['analysis_config']`
4. Configuration is passed to `CrawlerRunner`
5. Settings are applied before crawling starts
6. All analysis respects user's choices

## Preset Configurations

### Full Deep Analysis
```json
{
  "enable_performance_analysis": true,
  "store_html_content": true,
  "enable_similarity_during_crawl": true,
  "max_similarity_comparisons": 200,
  "crawl_speed": "full"
}
```

### Standard Analysis
```json
{
  "enable_performance_analysis": true,
  "store_html_content": true,
  "enable_similarity_during_crawl": true,
  "max_similarity_comparisons": 100,
  "crawl_speed": "balanced"
}
```

### Fast Analysis
```json
{
  "enable_performance_analysis": false,
  "store_html_content": true,
  "enable_similarity_during_crawl": true,
  "max_similarity_comparisons": 50,
  "crawl_speed": "fast"
}
```

## Benefits

1. **No Compromise**: Full analysis is default - users get everything
2. **User Choice**: Users can customize if they want faster crawling
3. **Transparency**: Users know exactly what analysis is running
4. **Flexibility**: Balance between speed and thoroughness

## Technical Implementation

- Frontend: `templates/index.html` - Configuration UI
- Frontend JS: `static/js/main.js` - Form submission with config
- Backend API: `app.py` - Receives and stores configuration
- Crawler: `crawl.py` - Applies configuration to Scrapy settings
- Settings: `crawler/settings.py` - Default values (all enabled)

## Notes

- **Default is Full Analysis**: All features enabled by default
- **No Feature Reduction**: New features don't reduce analysis quality
- **User Control**: Users can choose to speed up if needed
- **Comprehensive**: All analysis types available

