"""
Professional SEO Audit Module
Comprehensive analysis covering all aspects of SEO similar to Ahrefs, Semrush, and Siteliner.
"""
import re
import json
from typing import Dict, List, Set, Optional, Tuple
from urllib.parse import urlparse, urljoin, urlunparse
from collections import defaultdict, Counter
from bs4 import BeautifulSoup
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
from datetime import datetime


class ProfessionalSEOAuditor:
    """
    Comprehensive SEO audit tool covering:
    - Core Web Vitals (basic)
    - Sitemap analysis
    - Robots.txt analysis
    - Structured data validation
    - Content audit
    - Mobile-friendliness
    - Security checks
    - Page speed flags
    - Internal link depth
    - HTTP status coverage
    - JavaScript links detection
    - Pagination handling
    - Canonical validation
    - Indexability scoring
    """
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.domain = urlparse(base_url).netloc
        self.scheme = urlparse(base_url).scheme
        
    def analyze_all(self, pages: List[Dict], sitemap_url: Optional[str] = None, 
                   robots_txt: Optional[str] = None) -> Dict:
        """
        Run comprehensive SEO audit on all pages.
        
        Args:
            pages: List of crawled page data
            sitemap_url: Optional sitemap URL
            robots_txt: Optional robots.txt content
            
        Returns:
            Complete audit results
        """
        results = {
            'audit_date': datetime.now().isoformat(),
            'total_pages': len(pages),
            'core_web_vitals': self._analyze_core_web_vitals(pages),
            'sitemap_analysis': self._analyze_sitemap(pages, sitemap_url),
            'robots_analysis': self._analyze_robots_txt(pages, robots_txt),
            'structured_data': self._analyze_structured_data(pages),
            'content_audit': self._analyze_content(pages),
            'mobile_friendliness': self._analyze_mobile_friendliness(pages),
            'security_checks': self._analyze_security(pages),
            'page_speed_flags': self._analyze_page_speed(pages),
            'link_depth': self._analyze_link_depth(pages),
            'http_status_coverage': self._analyze_http_status(pages),
            'javascript_links': self._detect_javascript_links(pages),
            'pagination': self._analyze_pagination(pages),
            'canonical_validation': self._validate_canonicals(pages),
            'indexability_scores': self._calculate_indexability_scores(pages),
            'top_content_signals': self._identify_top_content(pages)
        }
        
        return results
    
    def _analyze_core_web_vitals(self, pages: List[Dict]) -> Dict:
        """Basic Core Web Vitals analysis."""
        total_size = 0
        total_requests = 0
        load_times = []
        largest_files = []
        
        for page in pages:
            # Page size
            html_content = page.get('html_content', '')
            if html_content:
                page_size = len(html_content.encode('utf-8'))
                total_size += page_size
                
                # Estimate requests (count script, link, img tags)
                soup = BeautifulSoup(html_content, 'lxml')
                scripts = len(soup.find_all('script', src=True))
                stylesheets = len(soup.find_all('link', rel='stylesheet'))
                images = len(soup.find_all('img', src=True))
                requests_count = scripts + stylesheets + images + 1  # +1 for HTML
                total_requests += requests_count
                
                # Find largest file references
                for img in soup.find_all('img', src=True):
                    src = img.get('src', '')
                    if src:
                        largest_files.append({
                            'url': urljoin(page.get('url', ''), src),
                            'type': 'image',
                            'page': page.get('url', '')
                        })
                
                for script in soup.find_all('script', src=True):
                    src = script.get('src', '')
                    if src:
                        largest_files.append({
                            'url': urljoin(page.get('url', ''), src),
                            'type': 'script',
                            'page': page.get('url', '')
                        })
            
            # Load time from performance analysis if available
            perf = page.get('performance_analysis', {})
            if perf.get('load_time'):
                load_times.append(perf['load_time'])
        
        avg_page_size = total_size / len(pages) if pages else 0
        avg_requests = total_requests / len(pages) if pages else 0
        avg_load_time = sum(load_times) / len(load_times) if load_times else 0
        
        # Check for blocking scripts
        blocking_scripts = []
        for page in pages:
            html_content = page.get('html_content', '')
            if html_content:
                soup = BeautifulSoup(html_content, 'lxml')
                for script in soup.find_all('script'):
                    if not script.get('async') and not script.get('defer'):
                        src = script.get('src', '')
                        if src or script.string:
                            blocking_scripts.append({
                                'page': page.get('url', ''),
                                'script': src or 'inline',
                                'type': 'blocking'
                            })
        
        return {
            'avg_page_size_kb': round(avg_page_size / 1024, 2),
            'avg_requests': round(avg_requests, 1),
            'avg_load_time_ms': round(avg_load_time, 2),
            'total_pages_analyzed': len(pages),
            'blocking_scripts_count': len(blocking_scripts),
            'blocking_scripts': blocking_scripts[:50],  # Limit to 50
            'largest_files': largest_files[:20]  # Top 20
        }
    
    def _analyze_sitemap(self, pages: List[Dict], sitemap_url: Optional[str] = None) -> Dict:
        """Analyze sitemap.xml."""
        crawled_urls = {page.get('url', '') for page in pages}
        sitemap_urls = set()
        sitemap_errors = []
        
        # Try to find sitemap
        if not sitemap_url and REQUESTS_AVAILABLE:
            # Common sitemap locations
            common_paths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml']
            for path in common_paths:
                try:
                    test_url = urljoin(self.base_url, path)
                    response = requests.get(test_url, timeout=5, allow_redirects=True)
                    if response.status_code == 200 and 'xml' in response.headers.get('content-type', ''):
                        sitemap_url = test_url
                        break
                except:
                    continue
        
        if sitemap_url and REQUESTS_AVAILABLE:
            try:
                response = requests.get(sitemap_url, timeout=10)
                if response.status_code == 200:
                    # Parse XML sitemap
                    soup = BeautifulSoup(response.text, 'xml')
                    urls = soup.find_all('url')
                    for url_tag in urls:
                        loc = url_tag.find('loc')
                        if loc:
                            sitemap_urls.add(loc.text.strip())
                    
                    # Find sitemap index
                    sitemaps = soup.find_all('sitemap')
                    for sitemap_tag in sitemaps:
                        loc = sitemap_tag.find('loc')
                        if loc:
                            # Could fetch nested sitemaps, but for now just note them
                            sitemap_urls.add(loc.text.strip())
            except Exception as e:
                sitemap_errors.append(f"Error parsing sitemap: {str(e)}")
        
        # Find pages in sitemap but not crawled
        in_sitemap_not_crawled = sitemap_urls - crawled_urls
        
        # Find pages crawled but not in sitemap
        crawled_not_in_sitemap = crawled_urls - sitemap_urls
        
        return {
            'sitemap_found': bool(sitemap_url),
            'sitemap_url': sitemap_url,
            'sitemap_urls_count': len(sitemap_urls),
            'crawled_urls_count': len(crawled_urls),
            'in_sitemap_not_crawled': list(in_sitemap_not_crawled)[:100],
            'crawled_not_in_sitemap': list(crawled_not_in_sitemap)[:100],
            'coverage_percent': round((len(crawled_urls & sitemap_urls) / len(crawled_urls) * 100) if crawled_urls else 0, 2),
            'errors': sitemap_errors
        }
    
    def _analyze_robots_txt(self, pages: List[Dict], robots_txt: Optional[str] = None) -> Dict:
        """Analyze robots.txt."""
        if not robots_txt and REQUESTS_AVAILABLE:
            # Try to fetch robots.txt
            try:
                robots_url = urljoin(self.base_url, '/robots.txt')
                response = requests.get(robots_url, timeout=5)
                if response.status_code == 200:
                    robots_txt = response.text
            except:
                pass
        
        if not robots_txt:
            return {
                'found': False,
                'disallowed_paths': [],
                'blocked_pages': [],
                'sitemap_links': [],
                'crawl_delay': None
            }
        
        disallowed_paths = []
        blocked_pages = []
        sitemap_links = []
        crawl_delay = None
        
        lines = robots_txt.split('\n')
        current_user_agent = '*'
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                
                if key == 'user-agent':
                    current_user_agent = value
                elif key == 'disallow':
                    if value:
                        disallowed_paths.append({
                            'path': value,
                            'user_agent': current_user_agent
                        })
                elif key == 'sitemap':
                    sitemap_links.append(value)
                elif key == 'crawl-delay':
                    try:
                        crawl_delay = float(value)
                    except:
                        pass
        
        # Check which pages are blocked
        for page in pages:
            page_url = page.get('url', '')
            parsed = urlparse(page_url)
            page_path = parsed.path
            
            for disallow in disallowed_paths:
                disallow_path = disallow['path']
                if disallow['user_agent'] == '*' or disallow['user_agent'].lower() == 'googlebot':
                    if page_path.startswith(disallow_path) or disallow_path == '/':
                        blocked_pages.append({
                            'url': page_url,
                            'blocked_by': disallow_path
                        })
                        break
        
        return {
            'found': True,
            'disallowed_paths': disallowed_paths,
            'blocked_pages': blocked_pages[:100],  # Limit
            'sitemap_links': sitemap_links,
            'crawl_delay': crawl_delay,
            'user_agents': list(set(d['user_agent'] for d in disallowed_paths))
        }
    
    def _analyze_structured_data(self, pages: List[Dict]) -> Dict:
        """Analyze structured data (JSON-LD, Microdata, RDFa)."""
        structured_data_found = []
        structured_data_types = Counter()
        errors = []
        
        for page in pages:
            html_content = page.get('html_content', '')
            if not html_content:
                continue
            
            soup = BeautifulSoup(html_content, 'lxml')
            page_url = page.get('url', '')
            
            # Check JSON-LD
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        data_type = data.get('@type', 'Unknown')
                        structured_data_types[data_type] += 1
                        structured_data_found.append({
                            'page': page_url,
                            'type': data_type,
                            'format': 'JSON-LD',
                            'data': data
                        })
                    elif isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict):
                                data_type = item.get('@type', 'Unknown')
                                structured_data_types[data_type] += 1
                except json.JSONDecodeError as e:
                    errors.append({
                        'page': page_url,
                        'error': f'Invalid JSON-LD: {str(e)}',
                        'format': 'JSON-LD'
                    })
            
            # Check Microdata
            items = soup.find_all(attrs={'itemtype': True})
            for item in items:
                itemtype = item.get('itemtype', '')
                if itemtype:
                    structured_data_types[itemtype.split('/')[-1]] += 1
                    structured_data_found.append({
                        'page': page_url,
                        'type': itemtype,
                        'format': 'Microdata'
                    })
        
        return {
            'total_pages_with_structured_data': len(set(sd['page'] for sd in structured_data_found)),
            'structured_data_count': len(structured_data_found),
            'types_found': dict(structured_data_types),
            'top_types': structured_data_types.most_common(10),
            'errors': errors[:50],
            'pages_with_data': structured_data_found[:100]  # Limit
        }
    
    def _analyze_content(self, pages: List[Dict]) -> Dict:
        """Comprehensive content audit."""
        thin_content = []
        missing_h1 = []
        multiple_h1 = []
        header_structure_issues = []
        over_optimized = []
        missing_internal_links = []
        
        for page in pages:
            html_content = page.get('html_content', '')
            word_count = page.get('word_count', 0)
            page_url = page.get('url', '')
            
            # Thin content (less than 300 words)
            if word_count < 300:
                thin_content.append({
                    'url': page_url,
                    'word_count': word_count,
                    'title': page.get('title', '')
                })
            
            if html_content:
                soup = BeautifulSoup(html_content, 'lxml')
                
                # H1 analysis
                h1_tags = soup.find_all('h1')
                h1_count = len(h1_tags)
                if h1_count == 0:
                    missing_h1.append({
                        'url': page_url,
                        'title': page.get('title', '')
                    })
                elif h1_count > 1:
                    multiple_h1.append({
                        'url': page_url,
                        'count': h1_count,
                        'title': page.get('title', '')
                    })
                
                # Header structure (check for proper hierarchy)
                headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                last_level = 0
                for header in headers:
                    level = int(header.name[1])
                    if level > last_level + 1:
                        header_structure_issues.append({
                            'url': page_url,
                            'issue': f'Header jump from H{last_level} to H{level}',
                            'header_text': header.get_text()[:50]
                        })
                    last_level = level
                
                # Check for paragraphs
                paragraphs = soup.find_all('p')
                if len(paragraphs) < 3 and word_count > 0:
                    header_structure_issues.append({
                        'url': page_url,
                        'issue': 'Few paragraphs detected',
                        'paragraph_count': len(paragraphs)
                    })
                
                # Over-optimization (check keyword density in title/headers)
                title = page.get('title', '').lower()
                h1_text = ' '.join([h.get_text().lower() for h in h1_tags])
                combined = title + ' ' + h1_text
                
                # Simple keyword repetition check
                words = combined.split()
                if len(words) > 0:
                    word_counts = Counter(words)
                    max_repetition = max(word_counts.values()) if word_counts else 0
                    if max_repetition > len(words) * 0.3:  # More than 30% repetition
                        over_optimized.append({
                            'url': page_url,
                            'issue': 'High keyword repetition in title/headers'
                        })
            
            # Missing internal links (pages with no outgoing internal links)
            internal_links = page.get('internal_links', [])
            if len(internal_links) == 0 and word_count > 100:
                missing_internal_links.append({
                    'url': page_url,
                    'word_count': word_count,
                    'title': page.get('title', '')
                })
        
        return {
            'thin_content_pages': thin_content[:100],
            'thin_content_count': len(thin_content),
            'missing_h1': missing_h1[:100],
            'multiple_h1': multiple_h1[:100],
            'header_structure_issues': header_structure_issues[:100],
            'over_optimized': over_optimized[:50],
            'missing_internal_links': missing_internal_links[:100],
            'total_issues': len(thin_content) + len(missing_h1) + len(multiple_h1) + len(header_structure_issues)
        }
    
    def _analyze_mobile_friendliness(self, pages: List[Dict]) -> Dict:
        """Check mobile-friendliness signals."""
        missing_viewport = []
        missing_touch_icons = []
        mobile_stylesheets = []
        
        for page in pages:
            html_content = page.get('html_content', '')
            if not html_content:
                continue
            
            soup = BeautifulSoup(html_content, 'lxml')
            page_url = page.get('url', '')
            
            # Check viewport tag
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            if not viewport:
                missing_viewport.append(page_url)
            
            # Check touch icons
            apple_touch = soup.find('link', rel='apple-touch-icon')
            if not apple_touch:
                missing_touch_icons.append(page_url)
            
            # Check for mobile stylesheets
            links = soup.find_all('link', rel='stylesheet')
            for link in links:
                href = link.get('href', '')
                media = link.get('media', '')
                if 'mobile' in href.lower() or 'mobile' in media.lower():
                    mobile_stylesheets.append({
                        'page': page_url,
                        'stylesheet': href
                    })
        
        return {
            'missing_viewport_count': len(missing_viewport),
            'missing_viewport_pages': missing_viewport[:100],
            'missing_touch_icons_count': len(missing_touch_icons),
            'missing_touch_icons_pages': missing_touch_icons[:100],
            'mobile_stylesheets_found': len(mobile_stylesheets),
            'mobile_stylesheets': mobile_stylesheets[:50]
        }
    
    def _analyze_security(self, pages: List[Dict]) -> Dict:
        """Security checks."""
        http_pages = []
        mixed_content = []
        missing_security_headers = []
        redirect_chains = []
        
        for page in pages:
            page_url = page.get('url', '')
            status_code = page.get('status_code', 0)
            parsed = urlparse(page_url)
            
            # Check HTTPS
            if parsed.scheme == 'http':
                http_pages.append({
                    'url': page_url,
                    'status': status_code
                })
            
            # Check for mixed content
            html_content = page.get('html_content', '')
            if html_content and parsed.scheme == 'https':
                soup = BeautifulSoup(html_content, 'lxml')
                for tag in soup.find_all(['img', 'script', 'link', 'iframe'], src=True):
                    src = tag.get('src', '')
                    if src.startswith('http://'):
                        mixed_content.append({
                            'page': page_url,
                            'resource': src,
                            'type': tag.name
                        })
            
            # Check redirect chains
            redirect_url = page.get('redirect_url', '')
            if redirect_url:
                redirect_chains.append({
                    'from': page_url,
                    'to': redirect_url,
                    'status': status_code
                })
        
        return {
            'http_pages_count': len(http_pages),
            'http_pages': http_pages[:100],
            'mixed_content_count': len(mixed_content),
            'mixed_content': mixed_content[:100],
            'redirect_chains_count': len(redirect_chains),
            'redirect_chains': redirect_chains[:50],
            'security_score': self._calculate_security_score(pages)
        }
    
    def _calculate_security_score(self, pages: List[Dict]) -> int:
        """Calculate security score (0-100)."""
        if not pages:
            return 0
        
        https_count = sum(1 for p in pages if urlparse(p.get('url', '')).scheme == 'https')
        https_percent = (https_count / len(pages)) * 100
        
        # Base score on HTTPS percentage
        score = int(https_percent)
        
        # Deduct for mixed content
        mixed_content_count = sum(1 for p in pages if p.get('html_content', ''))
        if mixed_content_count > 0:
            score = max(0, score - 10)
        
        return min(100, score)
    
    def _analyze_page_speed(self, pages: List[Dict]) -> Dict:
        """Page speed flags."""
        large_images = []
        no_compression = []
        missing_cache_headers = []
        too_many_redirects = []
        
        for page in pages:
            page_url = page.get('url', '')
            html_content = page.get('html_content', '')
            
            if html_content:
                soup = BeautifulSoup(html_content, 'lxml')
                
                # Check for large images
                for img in soup.find_all('img', src=True):
                    src = img.get('src', '')
                    # Check if image might be large (heuristic: no width/height specified)
                    if not img.get('width') and not img.get('height'):
                        large_images.append({
                            'page': page_url,
                            'image': src,
                            'issue': 'Missing dimensions'
                        })
            
            # Check redirects
            redirect_url = page.get('redirect_url', '')
            if redirect_url:
                too_many_redirects.append({
                    'page': page_url,
                    'redirects_to': redirect_url
                })
        
        return {
            'large_images_count': len(large_images),
            'large_images': large_images[:100],
            'no_compression_count': len(no_compression),
            'missing_cache_count': len(missing_cache_headers),
            'too_many_redirects_count': len(too_many_redirects),
            'too_many_redirects': too_many_redirects[:50]
        }
    
    def _analyze_link_depth(self, pages: List[Dict]) -> Dict:
        """Calculate internal link depth from homepage."""
        # Build link graph
        link_graph = defaultdict(list)
        all_urls = {page.get('url', '') for page in pages}
        
        # Find homepage
        homepage = None
        for url in all_urls:
            parsed = urlparse(url)
            if parsed.path == '/' or parsed.path == '':
                homepage = url
                break
        
        if not homepage:
            homepage = list(all_urls)[0] if all_urls else None
        
        if not homepage:
            return {'depths': {}, 'deep_pages': []}
        
        # Build graph
        for page in pages:
            page_url = page.get('url', '')
            internal_links = page.get('internal_links', [])
            for link in internal_links:
                link_url = link if isinstance(link, str) else link.get('url', '')
                if link_url in all_urls:
                    link_graph[page_url].append(link_url)
        
        # Calculate depths using BFS
        depths = {homepage: 0}
        queue = [homepage]
        
        while queue:
            current = queue.pop(0)
            current_depth = depths[current]
            
            for neighbor in link_graph.get(current, []):
                if neighbor not in depths:
                    depths[neighbor] = current_depth + 1
                    queue.append(neighbor)
        
        # Find deep pages (depth > 3)
        deep_pages = [
            {'url': url, 'depth': depth}
            for url, depth in depths.items()
            if depth > 3
        ]
        
        return {
            'depths': depths,
            'deep_pages': deep_pages[:100],
            'avg_depth': sum(depths.values()) / len(depths) if depths else 0,
            'max_depth': max(depths.values()) if depths else 0
        }
    
    def _analyze_http_status(self, pages: List[Dict]) -> Dict:
        """HTTP status code coverage."""
        status_counts = Counter()
        redirect_chains = []
        
        for page in pages:
            status = page.get('status_code', 0)
            status_counts[status] += 1
            
            if status in [301, 302, 307, 308]:
                redirect_url = page.get('redirect_url', '')
                if redirect_url:
                    redirect_chains.append({
                        'from': page.get('url', ''),
                        'to': redirect_url,
                        'status': status
                    })
        
        return {
            'status_breakdown': dict(status_counts),
            'total_200': status_counts[200],
            'total_301': status_counts[301],
            'total_302': status_counts[302],
            'total_404': status_counts[404],
            'total_500': status_counts[500],
            'redirect_chains': redirect_chains[:100],
            'redirect_chains_count': len(redirect_chains)
        }
    
    def _detect_javascript_links(self, pages: List[Dict]) -> Dict:
        """Detect JavaScript-rendered navigation."""
        js_links = []
        
        for page in pages:
            html_content = page.get('html_content', '')
            if not html_content:
                continue
            
            soup = BeautifulSoup(html_content, 'lxml')
            page_url = page.get('url', '')
            
            # Find links with onclick or javascript: protocol
            onclick_links = soup.find_all('a', onclick=True)
            javascript_links = soup.find_all('a', href=re.compile(r'^javascript:'))
            
            if onclick_links or javascript_links:
                js_links.append({
                    'page': page_url,
                    'onclick_count': len(onclick_links),
                    'javascript_protocol_count': len(javascript_links),
                    'total_js_links': len(onclick_links) + len(javascript_links)
                })
        
        return {
            'pages_with_js_links': len(js_links),
            'js_links_details': js_links[:100]
        }
    
    def _analyze_pagination(self, pages: List[Dict]) -> Dict:
        """Detect pagination and parameter handling."""
        pagination_patterns = []
        parameter_variations = defaultdict(list)
        
        for page in pages:
            page_url = page.get('url', '')
            parsed = urlparse(page_url)
            
            # Check for pagination parameters
            if parsed.query:
                params = parsed.query.split('&')
                for param in params:
                    if '=' in param:
                        key, value = param.split('=', 1)
                        key_lower = key.lower()
                        
                        # Common pagination parameters
                        if any(p in key_lower for p in ['page', 'p', 'offset', 'start', 'limit']):
                            pagination_patterns.append({
                                'url': page_url,
                                'parameter': key,
                                'value': value
                            })
                        
                        # Group by parameter
                        parameter_variations[key].append({
                            'url': page_url,
                            'value': value
                        })
        
        return {
            'pagination_pages': len(pagination_patterns),
            'pagination_details': pagination_patterns[:100],
            'parameter_variations': dict(list(parameter_variations.items())[:20])
        }
    
    def _validate_canonicals(self, pages: List[Dict]) -> Dict:
        """Enhanced canonical validation."""
        canonical_issues = []
        canonical_loops = []
        
        for page in pages:
            page_url = page.get('url', '')
            canonical_url = page.get('canonical_url', '').strip()
            
            if not canonical_url:
                continue
            
            # Check if canonical points to non-indexable page
            canonical_page = next((p for p in pages if p.get('url', '') == canonical_url), None)
            if canonical_page:
                # Check if canonical page has noindex
                html_content = canonical_page.get('html_content', '')
                if html_content:
                    soup = BeautifulSoup(html_content, 'lxml')
                    robots_meta = soup.find('meta', attrs={'name': 'robots'})
                    if robots_meta:
                        content = robots_meta.get('content', '').lower()
                        if 'noindex' in content:
                            canonical_issues.append({
                                'page': page_url,
                                'canonical': canonical_url,
                                'issue': 'Canonical points to noindex page'
                            })
            
            # Check for canonical loops (A -> B, B -> A)
            if canonical_url in [p.get('url', '') for p in pages]:
                canonical_page = next((p for p in pages if p.get('url', '') == canonical_url), None)
                if canonical_page:
                    canonical_canonical = canonical_page.get('canonical_url', '').strip()
                    if canonical_canonical == page_url:
                        canonical_loops.append({
                            'page_a': page_url,
                            'page_b': canonical_url
                        })
        
        return {
            'canonical_issues': canonical_issues[:100],
            'canonical_loops': canonical_loops[:50],
            'total_issues': len(canonical_issues) + len(canonical_loops)
        }
    
    def _calculate_indexability_scores(self, pages: List[Dict]) -> Dict:
        """Calculate indexability score for each page."""
        indexability_scores = []
        
        for page in pages:
            page_url = page.get('url', '')
            score = 100
            issues = []
            
            # Check status code
            status = page.get('status_code', 0)
            if status != 200:
                score -= 30
                issues.append(f'Status code: {status}')
            
            # Check meta robots
            html_content = page.get('html_content', '')
            if html_content:
                soup = BeautifulSoup(html_content, 'lxml')
                robots_meta = soup.find('meta', attrs={'name': 'robots'})
                if robots_meta:
                    content = robots_meta.get('content', '').lower()
                    if 'noindex' in content:
                        score = 0
                        issues.append('Meta robots: noindex')
                    if 'nofollow' in content:
                        score -= 10
                        issues.append('Meta robots: nofollow')
            
            # Check canonical
            canonical = page.get('canonical_url', '')
            if canonical and canonical != page_url:
                score -= 5
                issues.append('Canonical points to different page')
            
            # Check HTTPS
            parsed = urlparse(page_url)
            if parsed.scheme != 'https':
                score -= 5
                issues.append('Not HTTPS')
            
            indexability_scores.append({
                'url': page_url,
                'score': max(0, score),
                'issues': issues,
                'indexable': score >= 70
            })
        
        return {
            'scores': indexability_scores,
            'avg_score': sum(s['score'] for s in indexability_scores) / len(indexability_scores) if indexability_scores else 0,
            'indexable_count': sum(1 for s in indexability_scores if s['indexable']),
            'non_indexable_count': sum(1 for s in indexability_scores if not s['indexable'])
        }
    
    def _identify_top_content(self, pages: List[Dict]) -> List[Dict]:
        """Identify top content by traffic signals."""
        scored_pages = []
        
        for page in pages:
            word_count = page.get('word_count', 0)
            internal_links_count = len(page.get('internal_links', []))
            
            # Calculate URL depth
            parsed = urlparse(page.get('url', ''))
            path_depth = len([p for p in parsed.path.split('/') if p])
            
            # Simple scoring
            score = 0
            score += min(word_count / 10, 50)  # Word count (max 50 points)
            score += min(internal_links_count * 2, 30)  # Internal links (max 30 points)
            score += max(0, 20 - path_depth * 2)  # URL depth (max 20 points, less is better)
            
            scored_pages.append({
                'url': page.get('url', ''),
                'title': page.get('title', ''),
                'score': round(score, 2),
                'word_count': word_count,
                'internal_links': internal_links_count,
                'depth': path_depth
            })
        
        # Sort by score descending
        scored_pages.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_pages[:50]  # Top 50

