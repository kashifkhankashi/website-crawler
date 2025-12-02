"""
Scrapy Items for storing crawled page data.
"""
import scrapy
from typing import List, Optional


class PageItem(scrapy.Item):
    """
    Item to store information about a crawled page.
    """
    # Page identification
    url = scrapy.Field()  # type: str
    status_code = scrapy.Field()  # type: int
    redirect_url = scrapy.Field()  # type: Optional[str]
    
    # Content information / on-page SEO
    title = scrapy.Field()  # type: str
    meta_description = scrapy.Field()  # type: Optional[str]
    meta_keywords = scrapy.Field()  # type: Optional[str]
    canonical_url = scrapy.Field()  # type: Optional[str]
    h1_tags = scrapy.Field()  # type: List[str]
    h2_tags = scrapy.Field()  # type: List[str]
    h3_tags = scrapy.Field()  # type: List[str]
    og_tags = scrapy.Field()  # type: dict   # {'og:title': '...', ...}
    twitter_tags = scrapy.Field()  # type: dict  # {'twitter:title': '...', ...}
    text_content = scrapy.Field()  # type: str
    word_count = scrapy.Field()  # type: int
    images = scrapy.Field()  # type: List[dict]  # [{'src': str, 'alt': str, 'width': int, 'height': int}]
    
    # Links found on the page
    internal_links = scrapy.Field()  # type: List[str]
    external_links = scrapy.Field()  # type: List[str]
    
    # Processing results
    content_hash = scrapy.Field()  # type: str
    is_duplicate = scrapy.Field()  # type: bool
    duplicate_urls = scrapy.Field()  # type: List[str]
    similarity_scores = scrapy.Field()  # type: dict
    
    # Timestamp
    crawled_at = scrapy.Field()  # type: str
    
    # Performance analysis
    performance_analysis = scrapy.Field()  # type: Dict  # Performance analysis results
    html_content = scrapy.Field()  # type: Optional[str]  # Raw HTML content for advanced analysis

