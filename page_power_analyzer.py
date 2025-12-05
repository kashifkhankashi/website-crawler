"""
Page Power Analyzer - Calculates page prominence based on internal linking patterns.
Similar to Siteliner's Page Power feature.

This module implements a PageRank-like algorithm to determine which pages
are most influential within the site based on internal link structure.
"""
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict
from urllib.parse import urlparse
import re


class PagePowerAnalyzer:
    """
    Calculate page power/authority based on internal linking patterns.
    
    Page Power is calculated using a simplified PageRank algorithm:
    - Pages with more incoming internal links have higher power
    - Links from high-power pages contribute more
    - Homepage typically has highest power
    """
    
    def __init__(self):
        self.link_graph = defaultdict(set)  # url -> set of linked URLs
        self.incoming_links = defaultdict(int)  # url -> count of incoming links
        self.outgoing_links = defaultdict(int)  # url -> count of outgoing links
        self.page_powers = {}  # url -> power score (0-100)
        # Utility page patterns (case-insensitive)
        self.utility_page_patterns = [
            r'/about',
            r'/privacy',
            r'/terms',
            r'/policy',
            r'/contact',
            r'/legal',
            r'/cookie',
            r'/disclaimer',
            r'/sitemap',
            r'/search',
            r'/login',
            r'/signup',
            r'/register',
            r'/cart',
            r'/checkout',
            r'/account',
            r'/profile',
            r'/faq',
            r'/help',
            r'/support'
        ]
    
    def analyze_site(self, pages: List[Dict]) -> Dict[str, float]:
        """
        Analyze all pages and calculate page power scores.
        
        Args:
            pages: List of page dictionaries with 'url' and 'internal_links' fields
            
        Returns:
            Dictionary mapping URL to page power score (0-100)
        """
        if not pages:
            return {}
        
        # Build link graph
        self._build_link_graph(pages)
        
        # Calculate page power using iterative algorithm
        self._calculate_page_powers(pages)
        
        return self.page_powers
    
    def _build_link_graph(self, pages: List[Dict]):
        """Build internal link graph from all pages."""
        self.link_graph.clear()
        self.incoming_links.clear()
        self.outgoing_links.clear()
        
        # Get all page URLs
        all_urls = {page.get('url', '') for page in pages if page.get('url')}
        
        for page in pages:
            page_url = page.get('url', '')
            if not page_url:
                continue
            
            # Get internal links from this page
            internal_links = page.get('internal_links', [])
            
            # Handle different formats: list of strings or list of dicts
            linked_urls = set()
            for link in internal_links:
                if isinstance(link, str):
                    linked_urls.add(link)
                elif isinstance(link, dict):
                    link_url = link.get('url') or link.get('href')
                    if link_url:
                        linked_urls.add(link_url)
                else:
                    # Fallback: try to convert to string
                    linked_urls.add(str(link))
            
            # Only count links to pages we actually crawled
            valid_links = linked_urls & all_urls
            
            # Update graph
            self.link_graph[page_url] = valid_links
            self.outgoing_links[page_url] = len(valid_links)
            
            # Count incoming links
            for linked_url in valid_links:
                self.incoming_links[linked_url] += 1
    
    def _calculate_page_powers(self, pages: List[Dict]):
        """
        Calculate page power using a simplified PageRank algorithm.
        
        Algorithm:
        1. Start with equal power for all pages
        2. Iteratively distribute power based on incoming links
        3. Pages with more incoming links get more power
        4. Links from high-power pages contribute more
        5. Normalize to 0-100 scale
        """
        if not pages:
            return
        
        all_urls = [page.get('url', '') for page in pages if page.get('url')]
        if not all_urls:
            return
        
        # Initialize: all pages start with equal power
        power = {url: 1.0 for url in all_urls}
        
        # Identify homepage (usually has path '/' or '')
        homepage = None
        for url in all_urls:
            parsed = urlparse(url)
            if parsed.path == '/' or parsed.path == '':
                homepage = url
                break
        
        # Homepage gets initial boost
        if homepage and homepage in power:
            power[homepage] = 2.0
        
        # Iterative power calculation (simplified PageRank)
        damping_factor = 0.85  # Standard PageRank damping
        iterations = 10  # Number of iterations
        
        for _ in range(iterations):
            new_power = {}
            
            for url in all_urls:
                # Base power (damping factor)
                new_power[url] = (1 - damping_factor) / len(all_urls)
                
                # Power from incoming links
                for source_url, linked_urls in self.link_graph.items():
                    if url in linked_urls and source_url in power:
                        # Distribute source page's power among its outbound links
                        outbound_count = len(linked_urls) or 1
                        contribution = (power[source_url] * damping_factor) / outbound_count
                        new_power[url] += contribution
            
            power = new_power
        
        # Normalize to 0-100 scale
        if power:
            max_power = max(power.values())
            min_power = min(power.values())
            power_range = max_power - min_power if max_power > min_power else 1
            
            self.page_powers = {
                url: round(((p - min_power) / power_range) * 100, 2)
                for url, p in power.items()
            }
        else:
            self.page_powers = {}
    
    def get_page_power_stats(self, pages: List[Dict]) -> Dict:
        """
        Get statistics about page power distribution.
        
        Returns:
            Dictionary with power statistics
        """
        if not self.page_powers:
            self.analyze_site(pages)
        
        if not self.page_powers:
            return {
                'total_pages': 0,
                'average_power': 0,
                'highest_power': 0,
                'lowest_power': 0,
                'top_pages': [],
                'link_analysis': {},
                'orphan_pages': [],
                'hub_pages': [],
                'power_distribution': {}
            }
        
        powers = list(self.page_powers.values())
        
        # Classify pages
        page_classifications = self.classify_pages(pages)
        
        # Get top pages by power (filter utility pages for main ranking)
        sorted_pages = sorted(
            self.page_powers.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Separate main and utility pages
        main_pages_sorted = [p for p in sorted_pages if page_classifications.get(p[0], 'main') == 'main']
        utility_pages_sorted = [p for p in sorted_pages if page_classifications.get(p[0], 'main') == 'utility']
        
        # Find page titles for top pages
        page_dict = {page.get('url', ''): page for page in pages}
        
        # Top 10 main pages
        top_pages = []
        for url, power_score in main_pages_sorted[:10]:
            page = page_dict.get(url, {})
            top_pages.append({
                'url': url,
                'title': page.get('title', 'No Title'),
                'power': power_score,
                'incoming_links': self.incoming_links.get(url, 0),
                'outgoing_links': self.outgoing_links.get(url, 0),
                'page_type': page_classifications.get(url, 'main')
            })
        
        # Top utility pages (for reference)
        top_utility_pages = []
        for url, power_score in utility_pages_sorted[:5]:
            page = page_dict.get(url, {})
            top_utility_pages.append({
                'url': url,
                'title': page.get('title', 'No Title'),
                'power': power_score,
                'incoming_links': self.incoming_links.get(url, 0),
                'outgoing_links': self.outgoing_links.get(url, 0),
                'page_type': 'utility'
            })
        
        # Get link analysis for all pages
        link_analysis = {}
        for url in self.page_powers.keys():
            # Get pages that link TO this page (incoming)
            incoming_sources = []
            for source_url, linked_urls in self.link_graph.items():
                if url in linked_urls:
                    source_page = page_dict.get(source_url, {})
                    incoming_sources.append({
                        'url': source_url,
                        'title': source_page.get('title', 'No Title'),
                        'power': self.page_powers.get(source_url, 0)
                    })
            
            # Get pages this page links TO (outgoing)
            outgoing_targets = []
            for target_url in self.link_graph.get(url, set()):
                target_page = page_dict.get(target_url, {})
                outgoing_targets.append({
                    'url': target_url,
                    'title': target_page.get('title', 'No Title'),
                    'power': self.page_powers.get(target_url, 0)
                })
            
            link_analysis[url] = {
                'incoming_links': incoming_sources,
                'outgoing_links': outgoing_targets,
                'incoming_count': len(incoming_sources),
                'outgoing_count': len(outgoing_targets)
            }
        
        # Get orphan pages
        orphan_pages = self.get_orphan_pages(pages)
        orphan_pages_data = []
        for url in orphan_pages:
            page = page_dict.get(url, {})
            orphan_pages_data.append({
                'url': url,
                'title': page.get('title', 'No Title'),
                'power': self.page_powers.get(url, 0),
                'word_count': page.get('word_count', 0)
            })
        
        # Get hub pages (pages with many outgoing links)
        hub_pages = sorted(
            [(url, self.outgoing_links.get(url, 0)) for url in self.page_powers.keys()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        hub_pages_data = []
        for url, outgoing_count in hub_pages:
            page = page_dict.get(url, {})
            hub_pages_data.append({
                'url': url,
                'title': page.get('title', 'No Title'),
                'outgoing_links': outgoing_count,
                'power': self.page_powers.get(url, 0)
            })
        
        # Power distribution (buckets)
        power_distribution = {
            'high': sum(1 for p in powers if p >= 70),
            'medium': sum(1 for p in powers if 40 <= p < 70),
            'low': sum(1 for p in powers if p < 40)
        }
        
        # Count main vs utility pages (page_classifications already computed above)
        main_pages_count = sum(1 for url in self.page_powers.keys() if page_classifications.get(url, 'main') == 'main')
        utility_pages_count = sum(1 for url in self.page_powers.keys() if page_classifications.get(url, 'main') == 'utility')
        
        return {
            'total_pages': len(self.page_powers),
            'main_pages_count': main_pages_count,
            'utility_pages_count': utility_pages_count,
            'average_power': round(sum(powers) / len(powers), 2) if powers else 0,
            'highest_power': round(max(powers), 2) if powers else 0,
            'lowest_power': round(min(powers), 2) if powers else 0,
            'top_pages': top_pages,
            'top_utility_pages': top_utility_pages,
            'link_analysis': link_analysis,
            'orphan_pages': orphan_pages_data,
            'hub_pages': hub_pages_data,
            'power_distribution': power_distribution,
            'page_classifications': page_classifications
        }
    
    def get_orphan_pages(self, pages: List[Dict]) -> List[str]:
        """
        Get pages with no incoming internal links (orphan pages).
        
        Returns:
            List of URLs that are orphaned
        """
        if not self.incoming_links:
            self._build_link_graph(pages)
        
        all_urls = {page.get('url', '') for page in pages if page.get('url')}
        
        # Find homepage
        homepage = None
        for url in all_urls:
            parsed = urlparse(url)
            if parsed.path == '/' or parsed.path == '':
                homepage = url
                break
        
        # Orphan pages are those with no incoming links (except homepage)
        orphan_pages = []
        for url in all_urls:
            if url != homepage and self.incoming_links.get(url, 0) == 0:
                orphan_pages.append(url)
        
        return orphan_pages
    
    def _classify_page_type(self, url: str, title: Optional[str] = None) -> str:
        """
        Classify page as 'main', 'utility', or 'other' based on URL patterns and title.
        
        Args:
            url: Page URL
            title: Page title (optional)
            
        Returns:
            Page type: 'main', 'utility', or 'other'
        """
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Check if homepage
        if path == '/' or path == '':
            return 'main'
        
        # Check URL patterns for utility pages
        for pattern in self.utility_page_patterns:
            if re.search(pattern, path, re.IGNORECASE):
                return 'utility'
        
        # Check title for utility page keywords
        if title:
            title_lower = title.lower()
            utility_keywords = [
                'about us', 'about', 'privacy policy', 'privacy',
                'terms of service', 'terms', 'legal', 'contact us',
                'contact', 'cookie policy', 'disclaimer', 'sitemap',
                'faq', 'help', 'support', 'login', 'sign up', 'register'
            ]
            for keyword in utility_keywords:
                if keyword in title_lower:
                    return 'utility'
        
        # Default to main content page
        return 'main'
    
    def classify_pages(self, pages: List[Dict]) -> Dict[str, str]:
        """
        Classify all pages by type.
        
        Args:
            pages: List of page dictionaries
            
        Returns:
            Dictionary mapping URL to page type ('main', 'utility', 'other')
        """
        classifications = {}
        for page in pages:
            url = page.get('url', '')
            title = page.get('title', '')
            classifications[url] = self._classify_page_type(url, title)
        return classifications
    
    def get_main_pages_only(self, pages: List[Dict]) -> List[Dict]:
        """
        Filter pages to return only main content pages (exclude utility pages).
        
        Args:
            pages: List of all pages
            
        Returns:
            Filtered list containing only main content pages
        """
        classifications = self.classify_pages(pages)
        return [page for page in pages if classifications.get(page.get('url', ''), 'main') == 'main']

