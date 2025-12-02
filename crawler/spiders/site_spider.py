"""
Main spider for crawling internal pages of a website.
"""
import re
from typing import Set, List, Optional
from urllib.parse import urljoin, urlparse, urlunparse
from datetime import datetime

import scrapy
from bs4 import BeautifulSoup
from scrapy.http import HtmlResponse
from scrapy.utils.response import get_base_url

from crawler.items import PageItem


class SiteSpider(scrapy.Spider):
    """
    Spider to crawl internal pages of a website.
    
    Features:
    - Only follows internal links
    - Respects robots.txt
    - Extracts text content
    - Collects all links for broken link checking
    - Supports depth limiting
    """
    
    name = 'site_spider'
    
    def __init__(self, start_url: str = None, max_depth: int = 10, *args, **kwargs):
        """
        Initialize the spider.
        
        Args:
            start_url: The starting URL to crawl from
            max_depth: Maximum depth to crawl (default: 10)
        """
        super(SiteSpider, self).__init__(*args, **kwargs)
        
        if not start_url:
            raise ValueError("start_url parameter is required")
        
        # Normalize start URL
        if not start_url.startswith(('http://', 'https://')):
            start_url = 'https://' + start_url
        
        self.start_urls = [start_url]
        self.allowed_domains = [urlparse(start_url).netloc]
        self.max_depth = int(max_depth)
        
        # Track visited URLs to avoid duplicates
        self.visited_urls: Set[str] = set()
        
        # Store all internal links found for broken link checking
        self.all_internal_links: Set[str] = set()
        
        # Statistics
        self.stats = {
            'pages_crawled': 0,
            'links_found': 0,
            'internal_links': 0,
            'external_links': 0,
        }
    
    def parse(self, response: HtmlResponse) -> scrapy.Request:
        """
        Parse the response and extract content.
        
        Args:
            response: The HTTP response to parse
            
        Yields:
            PageItem with extracted data and/or scrapy.Request for following links
        """
        # Skip if already visited (shouldn't happen, but safety check)
        url = response.url
        if url in self.visited_urls:
            return
        
        self.visited_urls.add(url)
        self.stats['pages_crawled'] += 1
        
        # Get current depth
        depth = response.meta.get('depth', 0)
        
        # Extract content from the page
        item = self._extract_content(response)
        
        # Check if we should continue crawling
        if depth < self.max_depth:
            # Find and follow internal links
            links = self._extract_links(response)
            
            for link in links['internal']:
                # Normalize link
                normalized_link = self._normalize_url(link)
                
                if normalized_link and normalized_link not in self.visited_urls:
                    self.all_internal_links.add(normalized_link)
                    yield scrapy.Request(
                        url=normalized_link,
                        callback=self.parse,
                        meta={'depth': depth + 1},
                        errback=self._handle_error,
                        dont_filter=False
                    )
        
        yield item
    
    def _extract_content(self, response: HtmlResponse) -> PageItem:
        """
        Extract content from the HTML response.
        
        Args:
            response: The HTTP response
            
        Returns:
            PageItem with extracted data
        """
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove script and style elements
        for script in soup(["script", "style", "noscript"]):
            script.decompose()
        
        # Extract title
        title = ""
        if soup.title:
            title = soup.title.get_text().strip()
        elif soup.find('meta', property='og:title'):
            title = soup.find('meta', property='og:title').get('content', '').strip()
        
        # Extract meta description
        meta_description = ""
        meta_desc_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_desc_tag:
            meta_description = meta_desc_tag.get('content', '').strip()
        elif soup.find('meta', property='og:description'):
            meta_description = soup.find('meta', property='og:description').get('content', '').strip()
        
        # Remove navigation, header, footer elements
        for element in soup.find_all(['nav', 'header', 'footer', 'aside']):
            element.decompose()
        
        # Extract main text content
        # Try to find main content area
        main_content = None
        for selector in ['main', 'article', '[role="main"]', '.content', '#content', 'body']:
            main_content = soup.select_one(selector)
            if main_content:
                break
        
        if not main_content:
            main_content = soup.body if soup.body else soup
        
        # Get text content
        text_content = main_content.get_text(separator=' ', strip=True) if main_content else ""
        
        # Extract links
        links = self._extract_links(response)
        
        # Create item
        item = PageItem()
        item['url'] = response.url
        item['status_code'] = response.status
        item['title'] = title
        item['meta_description'] = meta_description
        item['text_content'] = text_content
        item['internal_links'] = links['internal']
        item['external_links'] = links['external']
        
        # Handle redirects
        if response.status in [301, 302, 303, 307, 308]:
            redirect_url = response.headers.get('Location', b'').decode('utf-8', errors='ignore')
            if redirect_url:
                item['redirect_url'] = urljoin(response.url, redirect_url)
        
        return item
    
    def _extract_links(self, response: HtmlResponse) -> dict:
        """
        Extract all links from the page.
        
        Args:
            response: The HTTP response
            
        Returns:
            Dictionary with 'internal' and 'external' link lists
        """
        soup = BeautifulSoup(response.text, 'lxml')
        base_url = get_base_url(response)
        
        internal_links = []
        external_links = []
        
        # Find all anchor tags
        for link in soup.find_all('a', href=True):
            href = link['href']
            
            # Skip empty or javascript links
            if not href or href.startswith(('javascript:', 'mailto:', 'tel:', '#')):
                continue
            
            # Convert relative to absolute URL
            absolute_url = urljoin(base_url, href)
            
            # Remove fragment
            parsed = urlparse(absolute_url)
            clean_url = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                parsed.query,
                ''  # Remove fragment
            ))
            
            # Normalize URL
            normalized = self._normalize_url(clean_url)
            if not normalized:
                continue
            
            # Check if internal or external
            parsed_url = urlparse(normalized)
            if parsed_url.netloc in self.allowed_domains:
                if normalized not in internal_links:
                    internal_links.append(normalized)
                    self.stats['internal_links'] += 1
            else:
                if normalized not in external_links:
                    external_links.append(normalized)
                    self.stats['external_links'] += 1
        
        self.stats['links_found'] += len(internal_links) + len(external_links)
        
        return {
            'internal': internal_links,
            'external': external_links
        }
    
    def _normalize_url(self, url: str) -> Optional[str]:
        """
        Normalize URL by removing trailing slashes and converting to lowercase.
        
        Args:
            url: URL to normalize
            
        Returns:
            Normalized URL or None if invalid
        """
        if not url:
            return None
        
        try:
            parsed = urlparse(url)
            
            # Check if it's a valid HTTP/HTTPS URL
            if parsed.scheme not in ['http', 'https']:
                return None
            
            # Check if file extension should be ignored
            path = parsed.path.lower()
            if any(path.endswith(f'.{ext}') for ext in self.settings.get('IGNORED_EXTENSIONS', [])):
                return None
            
            # Normalize path (remove trailing slash except for root)
            path = parsed.path.rstrip('/') or '/'
            
            # Reconstruct URL
            normalized = urlunparse((
                parsed.scheme.lower(),
                parsed.netloc.lower(),
                path,
                parsed.params,
                parsed.query,
                ''  # Remove fragment
            ))
            
            return normalized
        except Exception:
            return None
    
    def _handle_error(self, failure):
        """
        Handle request errors.
        
        Args:
            failure: The failure object
        """
        self.logger.error(f"Request failed: {failure.request.url} - {failure.value}")
    
    def closed(self, reason):
        """
        Called when the spider closes.
        
        Args:
            reason: Reason why the spider closed
        """
        self.logger.info(f"Spider closed: {reason}")
        self.logger.info(f"Statistics: {self.stats}")
        self.logger.info(f"Total internal links found: {len(self.all_internal_links)}")

