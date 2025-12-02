
import sys
import os
import json

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from crawler.spiders.site_spider import SiteSpider
from crawler.pipelines import ItemStoragePipeline

# Clear previous collections
ItemStoragePipeline.clear()

# Configure and run
settings = get_project_settings()
process = CrawlerProcess(settings)
process.crawl(SiteSpider, start_url='https://longhorn-menu.us/', max_depth=1)
process.start()

# Get results
items = ItemStoragePipeline.get_collected_items()
links = ItemStoragePipeline.get_collected_links()

# Save to temp file
result_file = os.path.join(current_dir, 'temp_crawl_results.json')
with open(result_file, 'w', encoding='utf-8') as f:
    json.dump({'items': items, 'links': list(links)}, f, ensure_ascii=False)
