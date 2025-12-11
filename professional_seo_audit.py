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
                page_url = page.get('url', '')
                
                for script in soup.find_all('script'):
                    if not script.get('async') and not script.get('defer'):
                        src = script.get('src', '')
                        script_content = script.string or ''
                        is_inline = not src
                        
                        # Determine script type and location
                        if is_inline:
                            script_type = 'inline'
                            script_url = 'inline'
                            script_size = len(script_content.encode('utf-8'))
                            location = 'in <head>' if script.find_parent('head') else 'in <body>'
                        else:
                            script_type = 'external'
                            script_url = urljoin(page_url, src) if src else 'inline'
                            script_size = 0  # Size would need to be fetched
                            location = 'in <head>' if script.find_parent('head') else 'in <body>'
                        
                        # Determine priority/severity
                        priority = 'high'
                        if is_inline and script.find_parent('head'):
                            priority = 'critical'  # Inline scripts in head are most critical
                        elif not is_inline and script.find_parent('head'):
                            priority = 'high'
                        elif is_inline and len(script_content) > 1000:
                            priority = 'high'
                        else:
                            priority = 'medium'
                        
                        # Get script purpose hints
                        script_hints = []
                        if is_inline:
                            script_text = script_content.lower()
                            if 'google' in script_text or 'analytics' in script_text or 'gtag' in script_text:
                                script_hints.append('Analytics/Tracking')
                            if 'facebook' in script_text or 'fbq' in script_text:
                                script_hints.append('Facebook Pixel')
                            if 'jquery' in script_text or '$(' in script_text:
                                script_hints.append('jQuery')
                            if 'document.ready' in script_text or 'DOMContentLoaded' in script_text:
                                script_hints.append('DOM Ready Handler')
                            if not script_hints:
                                script_hints.append('Custom JavaScript')
                        else:
                            if 'jquery' in src.lower():
                                script_hints.append('jQuery Library')
                            elif 'bootstrap' in src.lower():
                                script_hints.append('Bootstrap')
                            elif 'analytics' in src.lower() or 'gtag' in src.lower() or 'ga(' in src.lower():
                                script_hints.append('Google Analytics')
                            elif 'facebook' in src.lower():
                                script_hints.append('Facebook SDK')
                            else:
                                script_hints.append('External Script')
                        
                        blocking_scripts.append({
                            'page': page_url,
                            'page_title': page.get('title', ''),
                            'script': script_url,
                            'script_src': src if src else None,
                            'type': script_type,
                            'location': location,
                            'size_bytes': script_size,
                            'size_kb': round(script_size / 1024, 2) if script_size > 0 else None,
                            'priority': priority,
                            'purpose': ', '.join(script_hints) if script_hints else 'Unknown',
                            'is_inline': is_inline,
                            'needs_defer': script_type == 'external',
                            'needs_async': is_inline and 'analytics' in ' '.join(script_hints).lower()
                        })
        
        return {
            'avg_page_size_kb': round(avg_page_size / 1024, 2),
            'avg_requests': round(avg_requests, 1),
            'avg_load_time_ms': round(avg_load_time, 2),
            'total_pages_analyzed': len(pages),
            'blocking_scripts_count': len(blocking_scripts),
            'blocking_scripts': blocking_scripts[:200],  # Limit to 200 for detailed analysis
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
        import re
        
        missing_viewport = []
        invalid_viewport = []
        missing_touch_icons = []
        mobile_stylesheets = []
        non_responsive_images = []
        fixed_width_elements = []
        small_tap_targets = []
        flash_content = []
        mobile_menu_issues = []
        font_size_issues = []
        responsive_design_indicators = []
        
        # Performance data aggregation
        mobile_speed_metrics = {
            'total_pages': len(pages),
            'pages_with_performance_data': 0,
            'avg_page_size_kb': 0,
            'avg_load_time_ms': 0,
            'pages_with_heavy_images': 0,
            'pages_with_render_blocking': 0
        }
        
        total_size = 0
        total_load_time = 0
        performance_pages = 0
        
        for page in pages:
            html_content = page.get('html_content', '')
            if not html_content:
                continue
            
            soup = BeautifulSoup(html_content, 'lxml')
            page_url = page.get('url', '')
            
            # Check viewport tag
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            if not viewport:
                missing_viewport.append({
                    'url': page_url,
                    'title': page.get('title', '')
                })
            else:
                viewport_content = viewport.get('content', '')
                # Check if viewport is properly configured
                if 'width=device-width' not in viewport_content.lower():
                    invalid_viewport.append({
                        'url': page_url,
                        'title': page.get('title', ''),
                        'current': viewport_content,
                        'issue': 'Missing width=device-width'
                    })
                elif 'initial-scale=1' not in viewport_content.lower() and 'user-scalable=no' not in viewport_content.lower():
                    invalid_viewport.append({
                        'url': page_url,
                        'title': page.get('title', ''),
                        'current': viewport_content,
                        'issue': 'Should include initial-scale=1'
                    })
            
            # Check touch icons
            apple_touch = soup.find('link', rel='apple-touch-icon') or soup.find('link', rel='apple-touch-icon-precomposed')
            if not apple_touch:
                missing_touch_icons.append({
                    'url': page_url,
                    'title': page.get('title', '')
                })
            
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
            
            # Check for responsive images (srcset)
            images = soup.find_all('img')
            images_with_srcset = 0
            for img in images:
                if img.get('srcset'):
                    images_with_srcset += 1
                    continue
                # Check if image might be too large for mobile
                width = img.get('width')
                height = img.get('height')
                src = img.get('src', '')
                if not width and not height and src and not src.startswith('data:'):
                    non_responsive_images.append({
                        'url': page_url,
                        'image': src[:100],
                        'issue': 'Missing dimensions and srcset'
                    })
            
            # Check for fixed width elements (bad for mobile)
            fixed_elements = soup.find_all(attrs={'style': re.compile(r'width:\s*\d+px', re.I)})
            for elem in fixed_elements[:5]:  # Limit per page
                style = elem.get('style', '')
                width_match = re.search(r'width:\s*(\d+)px', style, re.I)
                if width_match:
                    width_val = int(width_match.group(1))
                    if width_val > 320:  # Wider than typical mobile screen
                        fixed_width_elements.append({
                            'url': page_url,
                            'element': elem.name,
                            'width': f'{width_val}px',
                            'issue': 'Fixed width may not fit mobile screens'
                        })
            
            # Check for Flash/plugins (not supported on mobile)
            flash_elements = soup.find_all(['embed', 'object'], type=re.compile(r'shockwave|flash|application/x-shockwave-flash', re.I))
            for flash in flash_elements:
                flash_content.append({
                    'url': page_url,
                    'element': flash.name,
                    'type': flash.get('type', 'Flash/Plugin')
                })
            
            # Check for mobile menu indicators
            mobile_menu_selectors = [
                'mobile-menu', 'mobile-nav', 'hamburger', 'menu-toggle', 
                'nav-toggle', 'mobile-toggle', 'burger-menu'
            ]
            has_mobile_menu = False
            for selector in mobile_menu_selectors:
                if soup.find(attrs={'class': re.compile(selector, re.I)}) or \
                   soup.find(attrs={'id': re.compile(selector, re.I)}):
                    has_mobile_menu = True
                    break
            
            if not has_mobile_menu:
                # Check if there's a traditional menu that might not work on mobile
                nav_elements = soup.find_all('nav')
                if nav_elements:
                    for nav in nav_elements:
                        nav_style = nav.get('style', '')
                        if 'display: none' not in nav_style.lower():
                            links_in_nav = nav.find_all('a', limit=5)
                            if len(links_in_nav) > 5:  # More than 5 links might need mobile menu
                                mobile_menu_issues.append({
                                    'url': page_url,
                                    'links_count': len(nav.find_all('a')),
                                    'issue': 'Large navigation may not be mobile-friendly'
                                })
                            break
            
            # Check font sizes (too small text is bad for mobile)
            small_text_elements = []
            for elem in soup.find_all(['p', 'span', 'div', 'a', 'li'], style=True):
                style = elem.get('style', '')
                font_size_match = re.search(r'font-size:\s*(\d+)px', style, re.I)
                if font_size_match:
                    font_size = int(font_size_match.group(1))
                    if font_size < 14:  # Google recommends at least 14px for mobile
                        small_text_elements.append({
                            'url': page_url,
                            'size': f'{font_size}px',
                            'text_preview': elem.get_text()[:50]
                        })
            
            if small_text_elements:
                font_size_issues.extend(small_text_elements[:3])  # Limit per page
            
            # Collect performance data
            perf_analysis = page.get('performance_analysis', {})
            if perf_analysis:
                mobile_speed_metrics['pages_with_performance_data'] += 1
                heavy_images = perf_analysis.get('heavy_images', [])
                render_blocking = perf_analysis.get('render_blocking_resources', [])
                
                if heavy_images:
                    mobile_speed_metrics['pages_with_heavy_images'] += 1
                if render_blocking:
                    mobile_speed_metrics['pages_with_render_blocking'] += 1
        
        # Calculate averages
        if performance_pages > 0:
            mobile_speed_metrics['avg_page_size_kb'] = total_size / performance_pages
            mobile_speed_metrics['avg_load_time_ms'] = total_load_time / performance_pages
        
        return {
            'missing_viewport_count': len(missing_viewport),
            'missing_viewport_pages': missing_viewport[:100],
            'invalid_viewport_count': len(invalid_viewport),
            'invalid_viewport_pages': invalid_viewport[:100],
            'missing_touch_icons_count': len(missing_touch_icons),
            'missing_touch_icons_pages': missing_touch_icons[:100],
            'mobile_stylesheets_found': len(mobile_stylesheets),
            'mobile_stylesheets': mobile_stylesheets[:50],
            'non_responsive_images_count': len(non_responsive_images),
            'non_responsive_images': non_responsive_images[:100],
            'fixed_width_elements_count': len(fixed_width_elements),
            'fixed_width_elements': fixed_width_elements[:100],
            'flash_content_count': len(flash_content),
            'flash_content': flash_content[:50],
            'mobile_menu_issues_count': len(mobile_menu_issues),
            'mobile_menu_issues': mobile_menu_issues[:50],
            'font_size_issues_count': len(font_size_issues),
            'font_size_issues': font_size_issues[:100],
            'mobile_speed_metrics': mobile_speed_metrics
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
        """Calculate internal link depth from homepage with comprehensive analysis."""
        # Build link graph
        link_graph = defaultdict(list)
        incoming_links = defaultdict(int)
        outgoing_links = defaultdict(int)
        all_urls = {page.get('url', '') for page in pages}
        page_titles = {page.get('url', ''): page.get('title', '') for page in pages}
        page_internal_link_counts = {}
        
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
            return {'depths': {}, 'deep_pages': [], 'orphan_pages': [], 'depth_distribution': {}}
        
        # Build graph and track links
        for page in pages:
            page_url = page.get('url', '')
            internal_links = page.get('internal_links', [])
            
            # Count internal links on this page
            valid_internal_count = 0
            for link in internal_links:
                link_url = link if isinstance(link, str) else link.get('url', '')
                if link_url in all_urls:
                    link_graph[page_url].append(link_url)
                    incoming_links[link_url] += 1
                    valid_internal_count += 1
            
            outgoing_links[page_url] = valid_internal_count
            page_internal_link_counts[page_url] = valid_internal_count
        
        # Calculate depths using BFS and track paths
        depths = {homepage: 0}
        paths = {homepage: [homepage]}  # Store path from homepage to each page
        queue = [homepage]
        
        while queue:
            current = queue.pop(0)
            current_depth = depths[current]
            current_path = paths[current]
            
            for neighbor in link_graph.get(current, []):
                if neighbor not in depths:
                    depths[neighbor] = current_depth + 1
                    paths[neighbor] = current_path + [neighbor]
                    queue.append(neighbor)
        
        # Find orphan pages (no incoming links except homepage)
        orphan_pages = []
        for url in all_urls:
            if url != homepage and url not in depths:
                orphan_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'outgoing_links': outgoing_links.get(url, 0),
                    'issue': 'No internal links pointing to this page (orphan page)'
                })
        
        # Categorize pages by depth
        depth_distribution = defaultdict(int)
        for depth in depths.values():
            depth_distribution[depth] += 1
        
        # Find deep pages with priority levels
        deep_pages = []
        very_deep_pages = []
        moderate_deep_pages = []
        
        for url, depth in depths.items():
            if depth > 5:
                very_deep_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'depth': depth,
                    'path': paths.get(url, [])[:4],  # First 4 steps of path
                    'outgoing_links': outgoing_links.get(url, 0),
                    'incoming_links': incoming_links.get(url, 0),
                    'priority': 'critical',
                    'issue': f'Very deep page (depth {depth}). Requires {depth} clicks from homepage.',
                    'impact': 'High - Very difficult for users and search engines to discover'
                })
            elif depth > 3:
                moderate_deep_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'depth': depth,
                    'path': paths.get(url, [])[:4],
                    'outgoing_links': outgoing_links.get(url, 0),
                    'incoming_links': incoming_links.get(url, 0),
                    'priority': 'warning',
                    'issue': f'Deep page (depth {depth}). Requires {depth} clicks from homepage.',
                    'impact': 'Medium - May be harder for search engines to crawl and index'
                })
        
        deep_pages = very_deep_pages + moderate_deep_pages
        
        # Find pages with poor link structure
        poorly_linked_pages = []
        for url in depths:
            if url == homepage:
                continue
            incoming = incoming_links.get(url, 0)
            outgoing = outgoing_links.get(url, 0)
            depth = depths.get(url, 0)
            
            # Priority issues
            if incoming == 0 and url != homepage:
                poorly_linked_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'depth': depth,
                    'incoming_links': 0,
                    'outgoing_links': outgoing,
                    'priority': 'critical',
                    'issue': 'Orphan page - No incoming internal links',
                    'impact': 'Critical - Page may not be discovered by search engines'
                })
            elif incoming == 1 and depth > 2:
                poorly_linked_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'depth': depth,
                    'incoming_links': 1,
                    'outgoing_links': outgoing,
                    'priority': 'warning',
                    'issue': f'Weak link structure - Only 1 incoming link at depth {depth}',
                    'impact': 'Medium - Limited link equity flow'
                })
        
        # Pages with good link structure (shallow depth, good incoming links)
        well_linked_pages = []
        for url, depth in depths.items():
            if url == homepage:
                continue
            incoming = incoming_links.get(url, 0)
            if depth <= 2 and incoming >= 3:
                well_linked_pages.append({
                    'url': url,
                    'title': page_titles.get(url, ''),
                    'depth': depth,
                    'incoming_links': incoming,
                    'outgoing_links': outgoing_links.get(url, 0),
                    'status': 'good'
                })
        
        # Calculate statistics
        total_pages = len(all_urls)
        pages_with_depth = len(depths)
        unreachable_pages = len(orphan_pages)
        
        return {
            'depths': depths,
            'paths': {url: path for url, path in paths.items()},
            'deep_pages': deep_pages[:200],
            'very_deep_pages': very_deep_pages[:100],
            'moderate_deep_pages': moderate_deep_pages[:100],
            'orphan_pages': orphan_pages[:100],
            'poorly_linked_pages': poorly_linked_pages[:100],
            'well_linked_pages': well_linked_pages[:50],
            'depth_distribution': dict(depth_distribution),
            'incoming_links': dict(incoming_links),
            'outgoing_links': dict(outgoing_links),
            'homepage': homepage,
            'avg_depth': sum(depths.values()) / len(depths) if depths else 0,
            'max_depth': max(depths.values()) if depths else 0,
            'total_pages': total_pages,
            'pages_with_depth': pages_with_depth,
            'unreachable_pages': unreachable_pages,
            'pages_at_depth_0': depth_distribution.get(0, 0),
            'pages_at_depth_1': depth_distribution.get(1, 0),
            'pages_at_depth_2': depth_distribution.get(2, 0),
            'pages_at_depth_3': depth_distribution.get(3, 0),
            'pages_deeper_than_3': sum(count for depth, count in depth_distribution.items() if depth > 3)
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

