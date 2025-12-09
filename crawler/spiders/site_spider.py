"""
Main spider for crawling internal pages of a website.
"""
import re
from typing import Set, List, Optional, Dict
from urllib.parse import urljoin, urlparse, urlunparse
from datetime import datetime

import scrapy
from bs4 import BeautifulSoup
from scrapy.http import HtmlResponse
from scrapy.utils.response import get_base_url

from crawler.items import PageItem

# Import performance analyzer (optional, may fail if requests not available)
try:
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from performance_analyzer import PerformanceAnalyzer
    PERFORMANCE_ANALYZER_AVAILABLE = True
except ImportError:
    PERFORMANCE_ANALYZER_AVAILABLE = False


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
        
        # Track discovered URLs (visited + scheduled)
        self.discovered_urls: Set[str] = set()
        
        # Store all internal links found for broken link checking
        self.all_internal_links: Set[str] = set()
        
        # Statistics
        self.stats = {
            'pages_crawled': 0,
            'links_found': 0,
            'internal_links': 0,
            'external_links': 0,
            'discovered_urls': 0,
        }
        
        # Track skipped pages with reasons (similar to Siteliner)
        self.skipped_pages: List[Dict] = []
        
        # Initialize performance analyzer if available
        self.performance_analyzer = None
        if PERFORMANCE_ANALYZER_AVAILABLE:
            try:
                self.performance_analyzer = PerformanceAnalyzer()
            except Exception as e:
                self.logger.warning(f"Performance analyzer initialization failed: {e}")
                self.performance_analyzer = None
    
    def parse(self, response: HtmlResponse) -> scrapy.Request:
        """
        Parse the response and extract content.
        
        Args:
            response: The HTTP response to parse
            
        Yields:
            PageItem with extracted data and/or scrapy.Request for following links
        """
        # Normalize URL before checking visited (ensures trailing slash consistency)
        url = response.url
        normalized_url = self._normalize_url(url)
        if not normalized_url:
            return
        
        # Skip if already visited (using normalized URL)
        if normalized_url in self.visited_urls:
            return
        
        # Check for skip reasons BEFORE processing
        skip_reason = self._check_skip_reasons(response, normalized_url)
        if skip_reason:
            # Track as skipped page
            self.skipped_pages.append({
                'url': normalized_url,
                'skip_reason': skip_reason,
                'status_code': response.status,
                'links_in': 0  # Will be calculated later
            })
            self.discovered_urls.add(normalized_url)
            return  # Don't process this page
        
        self.visited_urls.add(normalized_url)
        self.discovered_urls.add(normalized_url)
        self.stats['pages_crawled'] += 1
        
        # Get current depth
        depth = response.meta.get('depth', 0)
        
        # Extract content from the page (will use normalized URL)
        item = self._extract_content(response, normalized_url)
        
        # Check if we should continue crawling
        if depth < self.max_depth:
            # Find and follow internal links
            links = self._extract_links(response)
            
            for link_data in links['internal']:
                # Extract URL from link data (can be dict or string for backward compatibility)
                link_url = link_data.get('url', link_data) if isinstance(link_data, dict) else link_data
                
                # Normalize link
                normalized_link = self._normalize_url(link_url)
                
                if normalized_link and normalized_link not in self.visited_urls:
                    self.all_internal_links.add(normalized_link)
                    # Track discovered URL (even if not yet visited)
                    if normalized_link not in self.discovered_urls:
                        self.discovered_urls.add(normalized_link)
                        self.stats['discovered_urls'] = len(self.discovered_urls)
                    yield scrapy.Request(
                        url=normalized_link,
                        callback=self.parse,
                        meta={'depth': depth + 1},
                        errback=self._handle_error,
                        dont_filter=False
                    )
        
        yield item
    
    def _extract_content(self, response: HtmlResponse, normalized_url: str = None) -> PageItem:
        """
        Extract content from the HTML response.
        
        Args:
            response: The HTTP response
            normalized_url: Normalized URL to use (if None, uses response.url)
            
        Returns:
            PageItem with extracted data
        """
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove script and style elements
        for script in soup(["script", "style", "noscript"]):
            script.decompose()
        
        # Extract title (HTML and fallbacks)
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

        # Extract additional on-page SEO signals
        # Meta keywords (legacy but still useful for audits)
        meta_keywords_tag = soup.find('meta', attrs={'name': 'keywords'})
        meta_keywords = meta_keywords_tag.get('content', '').strip() if meta_keywords_tag else ""

        # Canonical URL
        canonical_tag = soup.find('link', rel=lambda v: v and 'canonical' in v.lower())
        canonical_url = canonical_tag.get('href', '').strip() if canonical_tag else ""

        # Heading tags
        def _collect_headings(tag_name: str) -> List[str]:
            return [
                h.get_text(strip=True)
                for h in soup.find_all(tag_name)
                if h.get_text(strip=True)
            ]

        h1_tags = _collect_headings('h1')
        h2_tags = _collect_headings('h2')
        h3_tags = _collect_headings('h3')

        # Open Graph tags
        og_tags = {}
        for meta in soup.find_all('meta', attrs={'property': True}):
            prop = meta.get('property', '').strip()
            if prop.startswith('og:'):
                og_tags[prop] = meta.get('content', '').strip()

        # Twitter Card tags
        twitter_tags = {}
        for meta in soup.find_all('meta', attrs={'name': True}):
            name = meta.get('name', '').strip()
            if name.startswith('twitter:'):
                twitter_tags[name] = meta.get('content', '').strip()
        
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

        # Extract images (for SEO image analysis)
        images = self._extract_images(response)
        
        # Create item
        item = PageItem()
        # Use normalized URL to ensure consistency (trailing slash handling)
        item['url'] = normalized_url if normalized_url else response.url
        item['status_code'] = response.status
        item['title'] = title
        item['meta_description'] = meta_description
        item['meta_keywords'] = meta_keywords
        item['canonical_url'] = canonical_url
        item['h1_tags'] = h1_tags
        item['h2_tags'] = h2_tags
        item['h3_tags'] = h3_tags
        item['og_tags'] = og_tags
        item['twitter_tags'] = twitter_tags
        item['text_content'] = text_content
        item['internal_links'] = links['internal']
        item['external_links'] = links['external']
        item['images'] = images
        
        # Handle redirects
        if response.status in [301, 302, 303, 307, 308]:
            redirect_url = response.headers.get('Location', b'').decode('utf-8', errors='ignore')
            if redirect_url:
                item['redirect_url'] = urljoin(response.url, redirect_url)
        
        # Run performance analysis if analyzer is available
        if self.performance_analyzer:
            try:
                performance_results = self.performance_analyzer.analyze_page(
                    response.text,
                    normalized_url if normalized_url else response.url
                )
                item['performance_analysis'] = performance_results
            except Exception as e:
                self.logger.warning(f"Performance analysis failed for {response.url}: {e}")
                item['performance_analysis'] = {}
        else:
            item['performance_analysis'] = {}
        
        # Store HTML content for advanced analysis (DOM, etc.)
        item['html_content'] = response.text
        
        return item

    def _extract_images(self, response: HtmlResponse) -> List[dict]:
        """
        Extract image information (src, alt, basic size attributes) from the page.
        """
        soup = BeautifulSoup(response.text, 'lxml')
        base_url = get_base_url(response)
        images: List[dict] = []

        for img in soup.find_all('img'):
            src = img.get('src') or ''
            if not src:
                continue

            # Convert relative to absolute URL
            absolute_url = urljoin(base_url, src)
            # Normalize URL (will also drop unsupported schemes)
            normalized = self._normalize_url(absolute_url)
            if not normalized:
                continue

            alt_text = (img.get('alt') or '').strip()

            # Try to capture explicit width/height attributes (may be strings)
            def _parse_int(value):
                try:
                    return int(value)
                except (TypeError, ValueError):
                    return None

            width = _parse_int(img.get('width'))
            height = _parse_int(img.get('height'))

            images.append({
                'src': normalized,
                'alt': alt_text,
                'width': width,
                'height': height,
            })

        return images
    
    def _extract_links(self, response: HtmlResponse) -> dict:
        """
        Extract all links from the page with location information.
        
        Args:
            response: The HTTP response
            
        Returns:
            Dictionary with 'internal' and 'external' link lists (with location data)
        """
        soup = BeautifulSoup(response.text, 'lxml')
        base_url = get_base_url(response)
        
        internal_links = []
        external_links = []
        internal_links_dict = {}  # Track by URL to avoid duplicates but keep location data
        external_links_urls = set()  # Track external URLs to avoid duplicates
        
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
            
            # Extract location information
            anchor_text = link.get_text(strip=True)
            
            # Get parent element info
            parent = link.parent
            parent_tag = parent.name if parent else None
            parent_class = ' '.join(parent.get('class', [])) if parent and parent.get('class') else None
            parent_id = parent.get('id', None) if parent else None
            
            # Build CSS selector
            css_selector = self._build_css_selector(link, soup)
            
            # Get surrounding context (text before and after link)
            context = self._get_link_context(link)
            
            # Get line number (approximate)
            line_number = self._get_line_number(response.text, str(link))
            
            # Extract link attributes (rel, target, etc.) for external links
            rel_attr = link.get('rel', [])
            if isinstance(rel_attr, str):
                rel_attr = [r.strip() for r in rel_attr.split()]
            elif not isinstance(rel_attr, list):
                rel_attr = []
            
            target_attr = link.get('target', '')
            
            link_data = {
                'url': normalized,
                'anchor_text': anchor_text,
                'parent_tag': parent_tag,
                'parent_class': parent_class,
                'parent_id': parent_id,
                'css_selector': css_selector,
                'context': context,
                'line_number': line_number,
                'rel': rel_attr,  # Add rel attributes
                'target': target_attr  # Add target attribute
            }
            
            # Check if internal or external
            parsed_url = urlparse(normalized)
            if parsed_url.netloc in self.allowed_domains:
                # Store with location data, keep first occurrence if duplicate
                if normalized not in internal_links_dict:
                    internal_links_dict[normalized] = link_data
                    self.stats['internal_links'] += 1
            else:
                # Check if URL already exists in external links using set
                if normalized not in external_links_urls:
                    external_links_urls.add(normalized)
                    external_links.append(link_data)
                    self.stats['external_links'] += 1
        
        # Convert dict to list for internal links
        internal_links = list(internal_links_dict.values())
        
        self.stats['links_found'] += len(internal_links) + len(external_links)
        
        return {
            'internal': internal_links,
            'external': external_links
        }
    
    def _build_css_selector(self, element, soup) -> str:
        """Build a CSS selector for the element."""
        try:
            # Try to build a unique selector
            selector_parts = []
            current = element
            
            while current and current.name:
                part = current.name
                
                # Add ID if available
                if current.get('id'):
                    part += f"#{current.get('id')}"
                    selector_parts.insert(0, part)
                    break
                
                # Add class if available
                classes = current.get('class', [])
                if classes:
                    class_str = '.'.join(classes)
                    part += f".{class_str}"
                
                # Add nth-of-type if needed for uniqueness
                if current.parent:
                    siblings = [s for s in current.parent.children if hasattr(s, 'name') and s.name == current.name]
                    if len(siblings) > 1:
                        index = siblings.index(current) + 1
                        part += f":nth-of-type({index})"
                
                selector_parts.insert(0, part)
                current = current.parent
                
                # Limit depth
                if len(selector_parts) > 5:
                    break
            
            return ' > '.join(selector_parts) if selector_parts else 'a'
        except Exception:
            return 'a'
    
    def _get_link_context(self, link) -> dict:
        """Get surrounding text context for the link."""
        try:
            # Get text before link (from parent)
            parent = link.parent
            if parent:
                # Get all text nodes
                all_text = parent.get_text(separator=' ', strip=True)
                link_text = link.get_text(strip=True)
                
                # Find position of link text
                if link_text in all_text:
                    index = all_text.find(link_text)
                    before = all_text[:index].strip()[-100:]  # Last 100 chars before
                    after = all_text[index + len(link_text):].strip()[:100]  # First 100 chars after
                    
                    return {
                        'before': before,
                        'after': after,
                        'full_context': all_text[:200]  # First 200 chars
                    }
            
            return {
                'before': '',
                'after': '',
                'full_context': link.get_text(strip=True)
            }
        except Exception:
            return {
                'before': '',
                'after': '',
                'full_context': ''
            }
    
    def _get_line_number(self, html_content: str, element_str: str) -> int:
        """Get approximate line number of element in HTML."""
        try:
            lines = html_content.split('\n')
            for i, line in enumerate(lines, 1):
                if element_str[:50] in line:  # Match first 50 chars
                    return i
            return 0
        except Exception:
            return 0
    
    def _normalize_url(self, url: str) -> Optional[str]:
        """
        Normalize URL by removing trailing slashes and converting to lowercase.
        Ensures URLs with/without trailing slashes are treated as the same.
        
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
            
            # Normalize path: always remove trailing slash, but keep root as '/'
            # This ensures https://example.com/ and https://example.com normalize to the same
            path = parsed.path.rstrip('/')
            # If path is empty after stripping, it was root or empty - normalize to empty string
            # (we'll handle root path specially)
            if not path:
                path = ''  # Empty path (not '/') - this ensures consistency
            
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
    
    def _check_skip_reasons(self, response: HtmlResponse, normalized_url: str) -> Optional[str]:
        """
        Check if a page should be skipped and return the reason.
        Similar to Siteliner's skipped pages feature.
        
        Args:
            response: The HTTP response
            normalized_url: Normalized URL
            
        Returns:
            Skip reason string if page should be skipped, None otherwise
        """
        # Check for 404 errors
        if response.status == 404:
            return "Error 404 - Not Found"
        
        # Check for redirects (301, 302, etc.)
        if response.status in [301, 302, 303, 307, 308]:
            redirect_url = response.headers.get('Location', b'').decode('utf-8', errors='ignore')
            if redirect_url:
                # Make absolute if relative
                from urllib.parse import urljoin
                absolute_redirect = urljoin(response.url, redirect_url)
                return f"HTTP Header Redirect {absolute_redirect}"
        
        # Check for robots meta noindex
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'lxml')
            robots_meta = soup.find('meta', attrs={'name': 'robots'})
            if robots_meta:
                robots_content = robots_meta.get('content', '').lower()
                if 'noindex' in robots_content:
                    return "Robots meta tag contains noindex instruction"
        except Exception:
            pass  # If parsing fails, continue with normal processing
        
        # Check for character set issues
        try:
            # Try to detect encoding issues
            content_type = response.headers.get('Content-Type', b'').decode('utf-8', errors='ignore').lower()
            if 'charset' in content_type:
                # Check if we can decode the response
                try:
                    response.text  # This will raise if encoding is wrong
                except (UnicodeDecodeError, LookupError):
                    return "The character set of this page was not recognized."
        except Exception:
            pass
        
        return None
    
    def _handle_error(self, failure):
        """
        Handle request errors.
        Track errors as skipped pages.
        
        Args:
            failure: The failure object
        """
        url = failure.request.url
        normalized_url = self._normalize_url(url)
        if normalized_url:
            error_msg = str(failure.value) if failure.value else "Unknown error"
            
            # Determine skip reason from error type
            skip_reason = "Error accessing page"
            if "404" in error_msg or "Not Found" in error_msg:
                skip_reason = "Error 404 - Not Found"
            elif "timeout" in error_msg.lower():
                skip_reason = "Request Timeout"
            elif "connection" in error_msg.lower():
                skip_reason = "Connection Error"
            else:
                skip_reason = f"Error: {error_msg[:100]}"  # Limit length
            
            # Track as skipped page
            if normalized_url not in [sp['url'] for sp in self.skipped_pages]:
                self.skipped_pages.append({
                    'url': normalized_url,
                    'skip_reason': skip_reason,
                    'status_code': 0,
                    'links_in': 0
                })
        
        self.logger.error(f"Request failed: {url} - {failure.value}")
    
    def closed(self, reason):
        """
        Called when the spider closes.
        
        Args:
            reason: Reason why the spider closed
        """
        self.logger.info(f"Spider closed: {reason}")
        self.logger.info(f"Statistics: {self.stats}")
        self.logger.info(f"Total internal links found: {len(self.all_internal_links)}")

