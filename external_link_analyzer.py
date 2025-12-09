"""
Advanced External Link Analyzer
Deep crawling and detailed analysis of external links.
"""
import re
import requests
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse, urljoin
from collections import defaultdict
import time
from datetime import datetime


class ExternalLinkAnalyzer:
    """
    Advanced analyzer for external links with deep crawling and detailed analysis.
    """
    
    def __init__(self, timeout: int = 10, max_workers: int = 5):
        """
        Initialize the external link analyzer.
        
        Args:
            timeout: Request timeout in seconds
            max_workers: Maximum concurrent requests (for future async implementation)
        """
        self.timeout = timeout
        self.max_workers = max_workers
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Cache for analyzed links
        self.link_cache: Dict[str, Dict] = {}
        
        # Domain categories
        self.domain_categories = self._load_domain_categories()
    
    def _load_domain_categories(self) -> Dict[str, str]:
        """Load domain categories for classification."""
        return {
            # Social Media
            'facebook.com': 'Social Media',
            'twitter.com': 'Social Media',
            'x.com': 'Social Media',
            'linkedin.com': 'Social Media',
            'instagram.com': 'Social Media',
            'youtube.com': 'Social Media',
            'pinterest.com': 'Social Media',
            'tiktok.com': 'Social Media',
            'reddit.com': 'Social Media',
            'snapchat.com': 'Social Media',
            
            # E-commerce
            'amazon.com': 'E-commerce',
            'ebay.com': 'E-commerce',
            'etsy.com': 'E-commerce',
            'shopify.com': 'E-commerce',
            
            # News & Media
            'news.google.com': 'News',
            'bbc.com': 'News',
            'cnn.com': 'News',
            'reuters.com': 'News',
            
            # Search Engines
            'google.com': 'Search Engine',
            'bing.com': 'Search Engine',
            'yahoo.com': 'Search Engine',
            'duckduckgo.com': 'Search Engine',
            
            # Analytics & Tools
            'analytics.google.com': 'Analytics',
            'google-analytics.com': 'Analytics',
            'googletagmanager.com': 'Analytics',
            'facebook.com/tr': 'Analytics',
            
            # Payment
            'paypal.com': 'Payment',
            'stripe.com': 'Payment',
            'square.com': 'Payment',
        }
    
    def analyze_external_link(self, url: str, link_data: Dict = None) -> Dict:
        """
        Analyze a single external link with deep crawling.
        
        Args:
            url: External link URL
            link_data: Additional link data (anchor text, location, etc.)
            
        Returns:
            Dictionary with detailed analysis
        """
        if not url:
            return self._create_error_result(url, "Empty URL")
        
        # Check cache
        if url in self.link_cache:
            result = self.link_cache[url].copy()
            if link_data:
                result.update(link_data)
            return result
        
        # Parse URL
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            domain_base = self._get_base_domain(domain)
        except Exception as e:
            return self._create_error_result(url, f"Invalid URL: {str(e)}")
        
        # Start analysis
        analysis = {
            'url': url,
            'domain': domain,
            'domain_base': domain_base,
            'analyzed_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        # Add link attributes if provided
        if link_data:
            analysis.update({
                'anchor_text': link_data.get('anchor_text', ''),
                'rel_attributes': link_data.get('rel', []),
                'target': link_data.get('target', ''),
                'link_type': self._determine_link_type(link_data),
                'location_info': link_data.get('location_info', {}),
                'css_selector': link_data.get('css_selector', ''),
                'context': link_data.get('context', {})
            })
        
        # Categorize domain
        analysis['category'] = self._categorize_domain(domain_base)
        
        # Check link accessibility
        try:
            check_result = self._check_link_accessibility(url)
            analysis.update(check_result)
        except Exception as e:
            analysis['status'] = 'error'
            analysis['error'] = str(e)
            analysis['accessible'] = False
        
        # Analyze link quality
        analysis['quality_score'] = self._calculate_quality_score(analysis)
        
        # Cache result
        self.link_cache[url] = analysis.copy()
        
        return analysis
    
    def _check_link_accessibility(self, url: str) -> Dict:
        """
        Check if external link is accessible and get details.
        
        Args:
            url: URL to check
            
        Returns:
            Dictionary with accessibility information
        """
        result = {
            'accessible': False,
            'status_code': 0,
            'status_text': 'Unknown',
            'redirect_count': 0,
            'final_url': url,
            'response_time': 0,
            'content_type': '',
            'has_ssl': False,
            'redirect_chain': []
        }
        
        try:
            start_time = time.time()
            
            # Use HEAD request first (faster)
            response = self.session.head(
                url,
                timeout=self.timeout,
                allow_redirects=True,
                verify=True
            )
            
            result['response_time'] = round((time.time() - start_time) * 1000, 2)  # ms
            result['status_code'] = response.status_code
            result['status_text'] = self._get_status_text(response.status_code)
            result['final_url'] = response.url
            result['content_type'] = response.headers.get('Content-Type', '')
            result['has_ssl'] = response.url.startswith('https://')
            
            # Check redirects
            if hasattr(response, 'history'):
                result['redirect_count'] = len(response.history)
                result['redirect_chain'] = [r.url for r in response.history] + [response.url]
            
            # Determine accessibility
            if 200 <= response.status_code < 400:
                result['accessible'] = True
            elif response.status_code == 403:
                result['accessible'] = False
                result['error'] = 'Forbidden - Access denied'
            elif response.status_code == 404:
                result['accessible'] = False
                result['error'] = 'Not Found'
            elif response.status_code >= 500:
                result['accessible'] = False
                result['error'] = 'Server Error'
            
        except requests.exceptions.Timeout:
            result['error'] = 'Request Timeout'
            result['accessible'] = False
        except requests.exceptions.ConnectionError:
            result['error'] = 'Connection Error'
            result['accessible'] = False
        except requests.exceptions.SSLError:
            result['error'] = 'SSL Error'
            result['accessible'] = False
            result['has_ssl'] = False
        except requests.exceptions.TooManyRedirects:
            result['error'] = 'Too Many Redirects'
            result['accessible'] = False
        except Exception as e:
            result['error'] = str(e)
            result['accessible'] = False
        
        return result
    
    def _determine_link_type(self, link_data: Dict) -> str:
        """
        Determine the type of link based on attributes.
        
        Args:
            link_data: Link data dictionary
            
        Returns:
            Link type string
        """
        rel_attrs = link_data.get('rel', [])
        if isinstance(rel_attrs, str):
            rel_attrs = [r.strip() for r in rel_attrs.split()]
        
        if 'nofollow' in rel_attrs:
            if 'sponsored' in rel_attrs:
                return 'Sponsored (Nofollow)'
            elif 'ugc' in rel_attrs:
                return 'UGC (Nofollow)'
            else:
                return 'Nofollow'
        elif 'sponsored' in rel_attrs:
            return 'Sponsored'
        elif 'ugc' in rel_attrs:
            return 'UGC'
        elif link_data.get('target') == '_blank':
            return 'External (New Tab)'
        else:
            return 'Follow'
    
    def _categorize_domain(self, domain: str) -> str:
        """
        Categorize domain based on known patterns.
        
        Args:
            domain: Domain name
            
        Returns:
            Category string
        """
        # Check exact matches
        if domain in self.domain_categories:
            return self.domain_categories[domain]
        
        # Check partial matches
        for known_domain, category in self.domain_categories.items():
            if known_domain in domain or domain in known_domain:
                return category
        
        # Check TLD patterns
        if domain.endswith('.gov'):
            return 'Government'
        elif domain.endswith('.edu'):
            return 'Education'
        elif domain.endswith('.org'):
            return 'Organization'
        elif domain.endswith('.mil'):
            return 'Military'
        
        return 'Other'
    
    def _get_base_domain(self, domain: str) -> str:
        """
        Get base domain (remove www, subdomains for categorization).
        
        Args:
            domain: Full domain name
            
        Returns:
            Base domain
        """
        # Remove www
        domain = domain.replace('www.', '')
        
        # Get base domain (last two parts)
        parts = domain.split('.')
        if len(parts) >= 2:
            return '.'.join(parts[-2:])
        
        return domain
    
    def _calculate_quality_score(self, analysis: Dict) -> Dict:
        """
        Calculate quality score for external link.
        
        Args:
            analysis: Link analysis dictionary
            
        Returns:
            Quality score dictionary
        """
        score = 100
        factors = []
        
        # Accessibility (40 points)
        if analysis.get('accessible'):
            score += 0
            factors.append('Accessible')
        else:
            score -= 40
            factors.append('Not Accessible')
        
        # Status code (20 points)
        status_code = analysis.get('status_code', 0)
        if 200 <= status_code < 300:
            score += 0
            factors.append('Good Status')
        elif 300 <= status_code < 400:
            score -= 10
            factors.append('Redirect')
        elif status_code >= 400:
            score -= 20
            factors.append('Error Status')
        
        # SSL (10 points)
        if analysis.get('has_ssl'):
            score += 0
            factors.append('HTTPS')
        else:
            score -= 10
            factors.append('No SSL')
        
        # Response time (10 points)
        response_time = analysis.get('response_time', 0)
        if response_time > 0:
            if response_time < 500:
                score += 0
                factors.append('Fast')
            elif response_time < 2000:
                score -= 5
                factors.append('Moderate')
            else:
                score -= 10
                factors.append('Slow')
        
        # Link type (20 points)
        link_type = analysis.get('link_type', 'Follow')
        if 'Nofollow' in link_type:
            score -= 20
            factors.append('Nofollow Link')
        elif 'Sponsored' in link_type:
            score -= 15
            factors.append('Sponsored Link')
        elif 'UGC' in link_type:
            score -= 10
            factors.append('UGC Link')
        else:
            factors.append('Follow Link')
        
        # Ensure score is between 0 and 100
        score = max(0, min(100, score))
        
        # Determine quality level
        if score >= 80:
            level = 'Excellent'
        elif score >= 60:
            level = 'Good'
        elif score >= 40:
            level = 'Fair'
        else:
            level = 'Poor'
        
        return {
            'score': score,
            'level': level,
            'factors': factors
        }
    
    def _get_status_text(self, status_code: int) -> str:
        """Get human-readable status text."""
        status_map = {
            200: 'OK',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout'
        }
        return status_map.get(status_code, f'Status {status_code}')
    
    def _create_error_result(self, url: str, error: str) -> Dict:
        """Create error result dictionary."""
        return {
            'url': url,
            'status': 'error',
            'error': error,
            'accessible': False,
            'quality_score': {
                'score': 0,
                'level': 'Error',
                'factors': [error]
            }
        }
    
    def analyze_batch(self, links: List[Dict], progress_callback=None) -> List[Dict]:
        """
        Analyze multiple external links.
        
        Args:
            links: List of link dictionaries with 'url' and optional link data
            progress_callback: Optional callback function(progress, message)
            
        Returns:
            List of analyzed link dictionaries
        """
        results = []
        total = len(links)
        
        for i, link_data in enumerate(links):
            url = link_data.get('url') if isinstance(link_data, dict) else link_data
            
            if progress_callback and i % 5 == 0:
                progress = int((i / total) * 100) if total > 0 else 0
                progress_callback(progress, f'Analyzing external links... {i}/{total}')
            
            if isinstance(link_data, dict):
                result = self.analyze_external_link(url, link_data)
            else:
                result = self.analyze_external_link(url)
            
            results.append(result)
            
            # Small delay to avoid overwhelming servers
            time.sleep(0.1)
        
        if progress_callback:
            progress_callback(100, 'External link analysis complete')
        
        return results

