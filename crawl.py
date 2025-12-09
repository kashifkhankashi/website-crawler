#!/usr/bin/env python
"""
Main script to run the website crawler.

Usage:
    python crawl.py <start_url> [--max-depth DEPTH] [--output-dir DIR]

Example:
    python crawl.py https://example.com
    python crawl.py https://example.com --max-depth 5
    python crawl.py https://example.com --output-dir ./results
"""
import os
import sys
import json
import csv
import argparse
import math
import re
from typing import Dict, List, Set, Tuple
from urllib.parse import urlparse, urlunparse
from datetime import datetime

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scrapy.http import Request

from crawler.spiders.site_spider import SiteSpider

# Import SEO scorer (optional)
try:
    import sys
    import os as os_module
    current_dir = os_module.path.dirname(os_module.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    from seo_scorer import SEOScorer
    SEO_SCORER_AVAILABLE = True
except ImportError:
    SEO_SCORER_AVAILABLE = False
    SEOScorer = None
    # Silently fail - SEO scoring is optional

# Import advanced analyzers (optional)
try:
    from advanced_seo_analyzer import AdvancedSEOAnalyzer
    from dom_analyzer import DOMAnalyzer
    ADVANCED_ANALYZERS_AVAILABLE = True
except ImportError:
    ADVANCED_ANALYZERS_AVAILABLE = False

# Import professional SEO auditor
try:
    from professional_seo_audit import ProfessionalSEOAuditor
    PROFESSIONAL_AUDIT_AVAILABLE = True
except ImportError:
    PROFESSIONAL_AUDIT_AVAILABLE = False
    ProfessionalSEOAuditor = None

# Import page power analyzer
try:
    from page_power_analyzer import PagePowerAnalyzer
    PAGE_POWER_AVAILABLE = True
except ImportError:
    PAGE_POWER_AVAILABLE = False
    PagePowerAnalyzer = None
    AdvancedSEOAnalyzer = None
    DOMAnalyzer = None


class BrokenLinkChecker:
    """
    Check broken links after crawling is complete.
    """
    
    def __init__(self, internal_links: Set[str], process: CrawlerProcess):
        """
        Initialize the broken link checker.
        
        Args:
            internal_links: Set of all internal links found during crawl
            process: CrawlerProcess instance for making requests
        """
        self.internal_links = internal_links
        self.process = process
        self.link_statuses: Dict[str, dict] = {}
    
    def check_links(self) -> Dict[str, dict]:
        """
        Check all internal links and return their statuses.
        
        Returns:
            Dictionary mapping URLs to their status information
        """
        # This will be populated by the spider callback
        results = {}
        
        def parse_link(response):
            """Callback for checking individual links."""
            url = response.url
            status = response.status
            
            result = {
                'url': url,
                'status': status,
                'status_text': self._get_status_text(status),
                'is_broken': status >= 400,
                'redirect_url': None
            }
            
            # Handle redirects
            if status in [301, 302, 303, 307, 308]:
                redirect_url = response.headers.get('Location', b'').decode('utf-8', errors='ignore')
                if redirect_url:
                    result['redirect_url'] = redirect_url
                    result['status_text'] = f'Redirect ({status})'
            
            results[url] = result
            return None
        
        # Create a simple spider for checking links
        class LinkCheckerSpider(scrapy.Spider):
            name = 'link_checker'
            custom_settings = {
                'ROBOTSTXT_OBEY': False,
                'DOWNLOAD_DELAY': 0.5,
                'CONCURRENT_REQUESTS': 10,
            }
            
            def start_requests(self):
                for link in self.internal_links:
                    yield Request(
                        url=link,
                        callback=parse_link,
                        errback=self.handle_error,
                        dont_filter=True
                    )
            
            def handle_error(self, failure):
                url = failure.request.url
                results[url] = {
                    'url': url,
                    'status': 0,
                    'status_text': 'Error',
                    'is_broken': True,
                    'error': str(failure.value)
                }
        
        # Run the link checker
        process = CrawlerProcess(get_project_settings())
        process.crawl(LinkCheckerSpider, internal_links=self.internal_links)
        process.start()
        
        return results
    
    def _get_status_text(self, status: int) -> str:
        """Get human-readable status text."""
        status_map = {
            200: 'OK',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect',
            404: 'Not Found',
            403: 'Forbidden',
            500: 'Internal Server Error',
            503: 'Service Unavailable',
        }
        return status_map.get(status, f'Status {status}')


class ReportGenerator:
    """
    Generate JSON and CSV reports from crawled data.
    """
    
    def __init__(self, output_dir: str = 'output'):
        """
        Initialize the report generator.
        
        Args:
            output_dir: Directory to save reports
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_reports(self, items: List[dict], broken_links: Dict[str, dict], skipped_pages: List[dict] = None):
        """
        Generate JSON and CSV reports.
        
        Args:
            items: List of crawled page dictionaries
            broken_links: Dictionary of broken link statuses
            skipped_pages: List of skipped pages with reasons
        """
        if skipped_pages is None:
            skipped_pages = []
        
        # Generate JSON report
        self._generate_json_report(items, broken_links, skipped_pages)
        
        # Generate CSV summary
        self._generate_csv_summary(items, broken_links)
        
        # Generate sitemap
        self._generate_sitemap(items)
    
    def _generate_json_report(self, items: List[dict], broken_links: Dict[str, dict], skipped_pages: List[dict] = None):
        """Generate detailed JSON report, including keyword and image analysis for SEO."""
        if skipped_pages is None:
            skipped_pages = []
        
        report_data = {
            'crawl_date': datetime.now().isoformat(),
            'total_pages': len(items),
            'skipped_pages': skipped_pages,  # Add skipped pages to report
            # robots.txt and technical SEO info can be extended later
            'pages': []
        }

        # Pre-compute keyword analysis across all pages
        keyword_analysis, page_keyword_map = self._compute_keyword_analysis(items)
        report_data['keyword_analysis'] = keyword_analysis

        # Pre-compute image analysis across all pages
        image_analysis = self._analyze_images(items)
        report_data['image_analysis'] = image_analysis
        
        # Calculate SEO scores if scorer is available
        seo_scorer = None
        try:
            # Check if SEO_SCORER_AVAILABLE is defined
            if 'SEO_SCORER_AVAILABLE' in globals():
                if SEO_SCORER_AVAILABLE and 'SEOScorer' in globals():
                    seo_scorer = SEOScorer()
                else:
                    # Try direct import as fallback
                    try:
                        from seo_scorer import SEOScorer
                        seo_scorer = SEOScorer()
                    except ImportError:
                        pass
            else:
                # SEO_SCORER_AVAILABLE not defined, try direct import
                try:
                    from seo_scorer import SEOScorer
                    seo_scorer = SEOScorer()
                except ImportError:
                    pass
        except (NameError, ImportError, Exception) as e:
            # SEO scorer not available - this is optional, fail silently
            seo_scorer = None
        
        # Detect orphan pages (pages with no internal links pointing to them)
        orphan_pages = self._detect_orphan_pages(items)
        report_data['orphan_pages'] = orphan_pages
        
        # Run Professional SEO Audit (comprehensive analysis)
        professional_audit = {}
        if PROFESSIONAL_AUDIT_AVAILABLE and ProfessionalSEOAuditor and items:
            try:
                # Get start URL from first item
                start_url = items[0].get('url', '') if items else ''
                if start_url:
                    parsed = urlparse(start_url)
                    base_url = f"{parsed.scheme}://{parsed.netloc}"
                    
                    auditor = ProfessionalSEOAuditor(base_url)
                    professional_audit = auditor.analyze_all(items)
                    report_data['professional_audit'] = professional_audit
            except Exception as e:
                print(f"Warning: Professional SEO Audit failed: {e}")
                import traceback
                traceback.print_exc()
                professional_audit = {}
        
        # Calculate Page Power (prominence based on internal linking)
        page_powers = {}
        page_power_stats = {}
        if PAGE_POWER_AVAILABLE and PagePowerAnalyzer:
            try:
                power_analyzer = PagePowerAnalyzer()
                page_powers = power_analyzer.analyze_site(items)
                page_power_stats = power_analyzer.get_page_power_stats(items)
                report_data['page_power_stats'] = page_power_stats
            except Exception as e:
                print(f"Warning: Page Power calculation failed: {e}")
                page_powers = {}
        
        for item in items:
            url = item['url']
            
            # Get broken links for this page
            page_broken_links = []
            internal_links_list = item.get('internal_links', [])
            
            # Handle both old format (list of strings) and new format (list of dicts)
            for link_item in internal_links_list:
                # Extract URL from either format
                if isinstance(link_item, dict):
                    link_url = link_item.get('url', '')
                    link_location = link_item  # Keep full location data
                else:
                    link_url = link_item
                    link_location = {'url': link_url}  # Minimal location data
                
                if link_url in broken_links and broken_links[link_url]['is_broken']:
                    broken_link_data = {
                        'url': link_url,
                        'status': broken_links[link_url]['status'],
                        'status_text': broken_links[link_url]['status_text'],
                        # Add location information
                        'anchor_text': link_location.get('anchor_text', ''),
                        'parent_tag': link_location.get('parent_tag'),
                        'parent_class': link_location.get('parent_class'),
                        'parent_id': link_location.get('parent_id'),
                        'css_selector': link_location.get('css_selector', ''),
                        'context': link_location.get('context', {}),
                        'line_number': link_location.get('line_number', 0)
                    }
                    page_broken_links.append(broken_link_data)
            
            # Determine duplicate status
            duplicate_status = 'Exact Duplicate' if item.get('is_duplicate') else 'Unique'
            similarity_scores = item.get('similarity_scores', {})
            
            if similarity_scores:
                max_similarity = max(similarity_scores.values())
                if max_similarity >= 90:
                    duplicate_status = 'High Duplicate'
                elif max_similarity >= 70:
                    duplicate_status = 'Medium Duplicate'
                elif max_similarity >= 40:
                    duplicate_status = 'Low Duplicate'
            
            page_data = {
                'url': url,
                'status_code': item.get('status_code', 0),
                'title': item.get('title', ''),
                'meta_description': item.get('meta_description', ''),
                'meta_keywords': item.get('meta_keywords', ''),
                'canonical_url': item.get('canonical_url', ''),
                'h1_tags': item.get('h1_tags', []),
                'h2_tags': item.get('h2_tags', []),
                'h3_tags': item.get('h3_tags', []),
                'og_tags': item.get('og_tags', {}),
                'twitter_tags': item.get('twitter_tags', {}),
                'text_content': item.get('text_content', ''),  # Include text content for keyword search
                'word_count': item.get('word_count', 0),
                'internal_links': item.get('internal_links', []),
                'external_links': item.get('external_links', []),
                'images': item.get('images', []),
                'broken_links': page_broken_links,
                'duplicate_status': duplicate_status,
                'is_exact_duplicate': item.get('is_duplicate', False),
                'duplicate_urls': item.get('duplicate_urls', []),
                'similarity_scores': similarity_scores,
                'content_hash': item.get('content_hash', ''),
                'crawled_at': item.get('crawled_at', ''),
                'performance_analysis': item.get('performance_analysis', {}),  # Include performance analysis
                'html_content': item.get('html_content', '')  # Include HTML for advanced analysis
            }

            # Attach per-page keyword stats if available
            if url in page_keyword_map:
                page_data['keywords'] = page_keyword_map[url]
            
            # Calculate SEO score for this page
            if seo_scorer:
                try:
                    seo_score = seo_scorer.calculate_page_score(page_data)
                    page_data['seo_score'] = seo_score
                except Exception as e:
                    print(f"Warning: SEO score calculation failed for {url}: {e}")
            
            # Add content quality metrics
            content_quality = self._calculate_content_quality(page_data)
            page_data['content_quality'] = content_quality
            
            # Advanced SEO audit
            if ADVANCED_ANALYZERS_AVAILABLE and AdvancedSEOAnalyzer:
                try:
                    seo_analyzer = AdvancedSEOAnalyzer()
                    # Get HTML content if available (stored in item)
                    html_content = item.get('html_content', '')
                    seo_audit = seo_analyzer.analyze_page(page_data, html_content)
                    page_data['advanced_seo_audit'] = seo_audit
                except Exception as e:
                    print(f"Warning: Advanced SEO audit failed for {url}: {e}")
            
            # DOM analysis
            if ADVANCED_ANALYZERS_AVAILABLE and DOMAnalyzer:
                try:
                    dom_analyzer = DOMAnalyzer()
                    html_content = item.get('html_content', '')
                    if html_content:
                        dom_analysis = dom_analyzer.analyze(html_content)
                        page_data['dom_analysis'] = dom_analysis
                except Exception as e:
                    print(f"Warning: DOM analysis failed for {url}: {e}")
            
            # Add Page Power score
            if url in page_powers:
                page_data['page_power'] = page_powers[url]
            
            report_data['pages'].append(page_data)
        
        # Calculate site-wide SEO score
        if seo_scorer:
            try:
                site_score = seo_scorer.calculate_site_score(report_data['pages'])
                report_data['site_seo_score'] = site_score
            except Exception as e:
                print(f"Warning: Site SEO score calculation failed: {e}")
                import traceback
                traceback.print_exc()
        
        # Analyze external links (deep crawling)
        try:
            from external_link_analyzer import ExternalLinkAnalyzer
            print("Analyzing external links with deep crawling...")
            external_analyzer = ExternalLinkAnalyzer(timeout=10)
            
            # Collect all external links with their data
            external_links_to_analyze = []
            for item in items:
                for ext_link in item.get('external_links', []):
                    if isinstance(ext_link, dict):
                        external_links_to_analyze.append(ext_link)
                    else:
                        external_links_to_analyze.append({'url': ext_link})
            
            # Analyze external links (with progress callback)
            def progress_callback(progress, message):
                if progress % 20 == 0:
                    print(f"External link analysis: {progress}% - {message}")
            
            analyzed_links = external_analyzer.analyze_batch(
                external_links_to_analyze[:100],  # Limit to first 100 for performance
                progress_callback
            )
            
            # Add analyzed external links to report
            report_data['external_links_analysis'] = {
                'total_analyzed': len(analyzed_links),
                'analyzed_links': analyzed_links,
                'summary': self._summarize_external_links(analyzed_links)
            }
            
            print(f"✓ Analyzed {len(analyzed_links)} external links")
        except ImportError:
            print("Warning: External link analyzer not available. Install requests library.")
        except Exception as e:
            print(f"Warning: External link analysis failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Save JSON report
        json_path = os.path.join(self.output_dir, 'report.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ JSON report saved to: {json_path}")

    def _compute_keyword_analysis(self, items: List[dict]) -> Tuple[dict, Dict[str, dict]]:
        """
        Compute basic keyword analysis using TF-IDF-style scoring.

        Returns a tuple of:
        - global keyword analysis dict for the whole site
        - mapping of page URL -> per-page keyword stats suitable for embedding in JSON
        """
        page_tokens: Dict[str, List[str]] = {}
        doc_freqs: Dict[str, int] = {}
        term_counts_per_page: Dict[str, Dict[str, int]] = {}
        total_tokens_per_page: Dict[str, int] = {}

        stopwords = self._get_stopwords()

        # Tokenize each page and build term/document statistics
        for item in items:
            url = item.get('url')
            text_content = item.get('text_content', '') or ''
            if not url or not text_content:
                continue

            tokens = self._tokenize(text_content)
            if not tokens:
                continue

            # Remove stopwords and very short tokens
            filtered_tokens = [t for t in tokens if t not in stopwords and len(t) > 2 and not t.isdigit()]
            if not filtered_tokens:
                continue

            page_tokens[url] = filtered_tokens
            total_tokens_per_page[url] = len(filtered_tokens)

            term_counts: Dict[str, int] = {}
            for tok in filtered_tokens:
                term_counts[tok] = term_counts.get(tok, 0) + 1
            term_counts_per_page[url] = term_counts

            # Update document frequencies
            unique_terms = set(term_counts.keys())
            for term in unique_terms:
                doc_freqs[term] = doc_freqs.get(term, 0) + 1

        num_docs = len(page_tokens)
        if num_docs == 0:
            # No text content available; return empty analysis
            return {'global_top_keywords': []}, {}

        # Compute IDF for each term
        idf: Dict[str, float] = {}
        for term, df in doc_freqs.items():
            # +1 smoothing to avoid division by zero, add 1 so IDF is always positive
            idf[term] = math.log((num_docs) / (1 + df)) + 1.0

        # Per-page TF-IDF and keyword stats
        page_keyword_map: Dict[str, dict] = {}
        global_term_totals: Dict[str, int] = {}

        for url, term_counts in term_counts_per_page.items():
            total_tokens = total_tokens_per_page.get(url, 0) or 1
            keyword_entries = []

            for term, count in term_counts.items():
                tf = count / total_tokens
                tf_idf = tf * idf.get(term, 0.0)
                keyword_entries.append({
                    'keyword': term,
                    'count': count,
                    'tf': round(tf, 6),
                    'tf_idf': round(tf_idf, 6)
                })
                global_term_totals[term] = global_term_totals.get(term, 0) + count

            # Sort keywords by TF-IDF descending, then by count
            keyword_entries.sort(key=lambda x: (x['tf_idf'], x['count']), reverse=True)
            top_keywords = keyword_entries[:20]

            # Keyword ratio: share of total tokens covered by top keywords
            top_keyword_tokens = sum(k['count'] for k in top_keywords)
            keyword_ratio = top_keyword_tokens / total_tokens if total_tokens > 0 else 0.0

            page_keyword_map[url] = {
                'top_keywords': top_keywords,
                'keyword_ratio': round(keyword_ratio, 4),
                # Full term counts allow advanced per-keyword queries in the UI
                'term_counts': term_counts
            }

        # Global top keywords across the site by total TF-IDF weight
        global_scores: List[Tuple[str, float]] = []
        for term, df in doc_freqs.items():
            # Approximate global importance as idf * doc_freq
            score = idf.get(term, 0.0) * df
            global_scores.append((term, score))

        global_scores.sort(key=lambda x: x[1], reverse=True)
        global_top_terms = [t for t, _ in global_scores[:50]]

        global_top_keywords = []
        for term in global_top_terms:
            global_top_keywords.append({
                'keyword': term,
                'doc_count': doc_freqs.get(term, 0),
                'total_count': global_term_totals.get(term, 0),
                'idf': round(idf.get(term, 0.0), 6)
            })

        # For each page, compute missing important (global) keywords
        global_keyword_set = set(global_top_terms[:20])
        for url, page_stats in page_keyword_map.items():
            present_keywords = {k['keyword'] for k in page_stats.get('top_keywords', [])}
            missing = sorted(global_keyword_set - present_keywords)
            page_stats['missing_important_keywords'] = missing[:20]

        keyword_analysis = {
            'global_top_keywords': global_top_keywords
        }

        return keyword_analysis, page_keyword_map
    
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple tokenizer for keyword analysis."""
        if not text:
            return []
        # Ensure lowercase and split on non-alphanumeric characters
        text = text.lower()
        return re.findall(r"[a-z0-9']+", text)

    @staticmethod
    def _get_stopwords() -> Set[str]:
        """Basic English stopword list to exclude from keyword analysis."""
        # Small built-in list to avoid external dependencies
        return {
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while',
            'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'up', 'down',
            'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'it', 'its', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'they', 'we', 'me', 'him', 'her', 'them', 'us',
            'my', 'your', 'his', 'her', 'their', 'our',
            'not', 'no', 'yes',
            'so', 'too', 'very',
            'can', 'could', 'should', 'would', 'will', 'just',
            'do', 'does', 'did', 'done',
            'have', 'has', 'had',
            'about', 'into', 'over', 'after', 'before', 'again', 'once',
        }

    def _analyze_images(self, items: List[dict]) -> Dict[str, List[dict]]:
        """
        Analyze images across all pages for SEO:
        - Missing ALT text
        - Large (by content-length) images
        - Duplicate images used on multiple pages
        """
        # Collect all images with page context
        image_usage: Dict[str, Dict[str, dict]] = {}  # src -> page_url -> info
        missing_alt_list: List[dict] = []

        for item in items:
            page_url = item.get('url')
            title = item.get('title', '')
            for img in item.get('images', []) or []:
                src = img.get('src')
                if not src:
                    continue

                if src not in image_usage:
                    image_usage[src] = {}

                image_usage[src][page_url] = {
                    'page_url': page_url,
                    'page_title': title,
                    'alt': img.get('alt', ''),
                    'width': img.get('width'),
                    'height': img.get('height'),
                }

                # Missing or empty ALT text on this page
                alt_text = (img.get('alt') or '').strip()
                if not alt_text:
                    missing_alt_list.append({
                        'image_url': src,
                        'page_url': page_url,
                        'page_title': title,
                    })

        # Detect duplicate images (same src used on multiple pages)
        duplicate_images: List[dict] = []
        for src, pages in image_usage.items():
            if len(pages) > 1:
                duplicate_images.append({
                    'image_url': src,
                    'pages': list(pages.values())
                })

        # Detect large images by HEAD request (content-length), limited to avoid slowness
        large_images: List[dict] = []
        max_images_to_check = 200
        size_threshold_bytes = 300 * 1024  # ~300KB

        try:
            import requests
            from requests.adapters import HTTPAdapter
            from urllib3.util.retry import Retry

            session = requests.Session()
            retry_strategy = Retry(
                total=1,
                backoff_factor=0.3,
                status_forcelist=[429, 500, 502, 503, 504],
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })

            checked = 0
            for src, pages in image_usage.items():
                if checked >= max_images_to_check:
                    break
                checked += 1
                try:
                    resp = session.head(src, allow_redirects=True, timeout=8)
                    size_str = resp.headers.get('Content-Length')
                    if not size_str:
                        continue
                    size = int(size_str)
                    if size >= size_threshold_bytes:
                        large_images.append({
                            'image_url': src,
                            'size_bytes': size,
                            'pages': list(pages.values())
                        })
                except Exception:
                    # Ignore individual failures; this is best-effort analysis
                    continue

        except ImportError:
            # If requests is not available, skip large image analysis gracefully
            pass

        return {
            'missing_alt': missing_alt_list,
            'large_images': large_images,
            'duplicate_images': duplicate_images,
        }
    
    def _summarize_external_links(self, analyzed_links: List[dict]) -> dict:
        """Summarize external links analysis."""
        if not analyzed_links:
            return {}
        
        total = len(analyzed_links)
        accessible = sum(1 for link in analyzed_links if link.get('accessible', False))
        has_ssl = sum(1 for link in analyzed_links if link.get('has_ssl', False))
        
        # Count by category
        categories = {}
        for link in analyzed_links:
            category = link.get('category', 'Other')
            categories[category] = categories.get(category, 0) + 1
        
        # Count by link type
        link_types = {}
        for link in analyzed_links:
            link_type = link.get('link_type', 'Follow')
            link_types[link_type] = link_types.get(link_type, 0) + 1
        
        # Count by quality
        quality_levels = {}
        for link in analyzed_links:
            quality = link.get('quality_score', {}).get('level', 'Unknown')
            quality_levels[quality] = quality_levels.get(quality, 0) + 1
        
        return {
            'total': total,
            'accessible': accessible,
            'inaccessible': total - accessible,
            'with_ssl': has_ssl,
            'without_ssl': total - has_ssl,
            'by_category': categories,
            'by_link_type': link_types,
            'by_quality': quality_levels
        }
    
    def _generate_csv_summary(self, items: List[dict], broken_links: Dict[str, dict]):
        """Generate CSV summary report."""
        csv_path = os.path.join(self.output_dir, 'summary.csv')
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write header
            writer.writerow([
                'URL',
                'Status',
                'Word Count',
                'Duplicate',
                'Similarity %',
                'Broken Links Count',
                'Internal Links Count',
                'External Links Count'
            ])
            
            # Write data rows
            for item in items:
                url = item['url']
                
                # Get status
                status = item.get('status_code', 0)
                status_text = f"{status} OK" if status == 200 else f"{status}"
                
                # Get duplicate status
                is_duplicate = 'Yes' if item.get('is_duplicate') else 'No'
                
                # Get max similarity
                similarity_scores = item.get('similarity_scores', {})
                max_similarity = max(similarity_scores.values()) if similarity_scores else 0
                similarity_pct = f"{max_similarity:.1f}%" if max_similarity > 0 else "0%"
                
                # Count broken links
                broken_count = 0
                for link in item.get('internal_links', []):
                    # Extract URL from dict format or use string directly
                    link_url = link.get('url', '') if isinstance(link, dict) else link
                    if link_url and link_url in broken_links and broken_links[link_url]['is_broken']:
                        broken_count += 1
                
                writer.writerow([
                    url,
                    status_text,
                    item.get('word_count', 0),
                    is_duplicate,
                    similarity_pct,
                    broken_count,
                    len(item.get('internal_links', [])),
                    len(item.get('external_links', []))
                ])
        
        print(f"✓ CSV summary saved to: {csv_path}")
    
    def _generate_sitemap(self, items: List[dict]):
        """Generate sitemap list."""
        sitemap_path = os.path.join(self.output_dir, 'sitemap.txt')
        
        with open(sitemap_path, 'w', encoding='utf-8') as f:
            for item in items:
                f.write(f"{item['url']}\n")
        
        print(f"✓ Sitemap saved to: {sitemap_path}")
    
    def _normalize_url_for_orphan(self, url: str) -> str:
        """
        Normalize URL for orphan page detection (matches spider normalization).
        Removes trailing slashes, converts to lowercase, removes fragments.
        
        Args:
            url: URL to normalize
            
        Returns:
            Normalized URL or empty string if invalid
        """
        if not url:
            return ''
        
        try:
            parsed = urlparse(url)
            
            # Check if it's a valid HTTP/HTTPS URL
            if parsed.scheme not in ['http', 'https']:
                return ''
            
            # Normalize path: remove trailing slash (except for root)
            path = parsed.path.rstrip('/')
            if not path:
                path = ''  # Empty path for root
            
            # Reconstruct URL (lowercase scheme and netloc, remove fragment)
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
            return ''
    
    def _detect_orphan_pages(self, items: List[dict]) -> List[str]:
        """
        Detect orphan pages - pages that have no internal links pointing to them.
        Uses proper URL normalization to handle variations (trailing slashes, etc.).
        
        Args:
            items: List of crawled page items
            
        Returns:
            List of orphan page URLs (normalized)
        """
        if not items:
            return []
        
        # Normalize all URLs and collect them
        all_urls_normalized = {}  # normalized -> original
        linked_urls_normalized = set()
        
        # Find homepage/start URL (to exclude from orphan detection)
        homepage_normalized = None
        for item in items:
            url = item.get('url', '')
            if url:
                normalized = self._normalize_url_for_orphan(url)
                if normalized:
                    all_urls_normalized[normalized] = url
                    
                    # Check if this is homepage (path is empty or just '/')
                    parsed = urlparse(normalized)
                    if parsed.path == '' or parsed.path == '/':
                        homepage_normalized = normalized
        
        # If no homepage found, use the first URL as start URL
        if not homepage_normalized and all_urls_normalized:
            homepage_normalized = list(all_urls_normalized.keys())[0]
        
        # Collect all internal links (normalized)
        for item in items:
            internal_links = item.get('internal_links', [])
            
            for link in internal_links:
                # Extract URL from dict format or use string directly
                link_url = ''
                if isinstance(link, dict):
                    link_url = link.get('url', '')
                elif isinstance(link, str):
                    link_url = link
                else:
                    try:
                        link_url = str(link)
                    except (TypeError, ValueError):
                        continue
                
                if link_url:
                    normalized_link = self._normalize_url_for_orphan(link_url)
                    if normalized_link:
                        linked_urls_normalized.add(normalized_link)
        
        # Orphan pages are pages that exist but are never linked to
        # (excluding the homepage/start URL)
        orphan_pages = []
        for normalized_url, original_url in all_urls_normalized.items():
            # Skip homepage
            if normalized_url == homepage_normalized:
                continue
            
            # Check if this URL is linked to (using normalized comparison)
            if normalized_url not in linked_urls_normalized:
                # Double-check: also check if any variation of this URL is linked
                # (e.g., with/without trailing slash)
                is_linked = False
                for linked_url in linked_urls_normalized:
                    # Check if URLs match (accounting for variations)
                    if self._urls_match(normalized_url, linked_url):
                        is_linked = True
                        break
                
                if not is_linked:
                    orphan_pages.append(original_url)  # Return original URL
        
        return orphan_pages
    
    def _urls_match(self, url1: str, url2: str) -> bool:
        """
        Check if two normalized URLs match (accounting for minor variations).
        
        Args:
            url1: First URL (normalized)
            url2: Second URL (normalized)
            
        Returns:
            True if URLs match
        """
        if url1 == url2:
            return True
        
        # Parse both URLs
        try:
            parsed1 = urlparse(url1)
            parsed2 = urlparse(url2)
            
            # Compare scheme, netloc, and path (ignore query params and fragments)
            if (parsed1.scheme == parsed2.scheme and 
                parsed1.netloc == parsed2.netloc):
                
                path1 = parsed1.path.rstrip('/')
                path2 = parsed2.path.rstrip('/')
                
                # If both paths are empty after stripping, they're both root
                if not path1 and not path2:
                    return True
                
                # Compare paths
                if path1 == path2:
                    return True
        
        except Exception:
            pass
        
        return False
    
    def _calculate_content_quality(self, page: Dict) -> Dict:
        """
        Calculate content quality metrics.
        
        Returns:
            Dictionary with readability score, thin content flag, etc.
        """
        word_count = page.get('word_count', 0)
        text_content = page.get('text_content', '')
        
        quality = {
            'word_count': word_count,
            'is_thin_content': word_count < 300,
            'readability_score': None,
            'readability_grade': None,
            'content_length_status': self._get_content_length_status(word_count)
        }
        
        # Calculate readability score (Flesch Reading Ease approximation)
        if text_content and word_count > 0:
            try:
                readability = self._calculate_readability(text_content, word_count)
                quality['readability_score'] = readability['score']
                quality['readability_grade'] = readability['grade']
            except:
                pass
        
        return quality
    
    def _get_content_length_status(self, word_count: int) -> str:
        """Get status based on content length."""
        if word_count >= 1000:
            return 'excellent'
        elif word_count >= 500:
            return 'good'
        elif word_count >= 300:
            return 'acceptable'
        elif word_count > 0:
            return 'thin'
        else:
            return 'empty'
    
    def _calculate_readability(self, text: str, word_count: int) -> Dict:
        """
        Calculate Flesch Reading Ease score (simplified version).
        
        Returns:
            Dictionary with score and grade
        """
        if not text or word_count == 0:
            return {'score': 0, 'grade': 'N/A'}
        
        # Count sentences (approximate)
        sentences = len(re.findall(r'[.!?]+', text))
        if sentences == 0:
            sentences = 1
        
        # Count syllables (approximate - count vowel groups)
        syllables = len(re.findall(r'[aeiouy]+', text.lower()))
        if syllables == 0:
            syllables = word_count
        
        # Average sentence length
        avg_sentence_length = word_count / sentences if sentences > 0 else 0
        
        # Average syllables per word
        avg_syllables = syllables / word_count if word_count > 0 else 0
        
        # Simplified Flesch Reading Ease formula
        # Score = 206.835 - (1.015 * ASL) - (84.6 * ASW)
        # Where ASL = average sentence length, ASW = average syllables per word
        score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
        score = max(0, min(100, score))
        
        # Convert to grade level
        if score >= 90:
            grade = 'Very Easy (5th grade)'
        elif score >= 80:
            grade = 'Easy (6th grade)'
        elif score >= 70:
            grade = 'Fairly Easy (7th grade)'
        elif score >= 60:
            grade = 'Standard (8th-9th grade)'
        elif score >= 50:
            grade = 'Fairly Difficult (10th-12th grade)'
        elif score >= 30:
            grade = 'Difficult (College)'
        else:
            grade = 'Very Difficult (College Graduate)'
        
        return {
            'score': round(score, 1),
            'grade': grade
        }


class CrawlerRunner:
    """
    Main crawler runner that orchestrates crawling, link checking, and reporting.
    """
    
    def __init__(self, start_url: str, max_depth: int = 10, output_dir: str = 'output', use_subprocess: bool = False, progress_file: str = None, job_id: str = None):
        """
        Initialize the crawler runner.
        
        Args:
            start_url: Starting URL to crawl
            max_depth: Maximum crawl depth
            output_dir: Output directory for reports
            use_subprocess: If True, run crawl in subprocess (for web interface)
            progress_file: File to write progress updates (for web interface)
            job_id: Job ID for progress tracking (for web interface)
        """
        self.start_url = start_url
        self.max_depth = max_depth
        self.output_dir = output_dir
        self.use_subprocess = use_subprocess
        self.progress_file = progress_file
        self.job_id = job_id
        self.crawled_items: List[dict] = []
        self.all_internal_links: Set[str] = set()
        self.skipped_pages: List[dict] = []  # Track skipped pages
    
    def run(self):
        """Run the complete crawling and reporting process."""
        print(f"\n{'='*60}")
        print(f"Starting crawl of: {self.start_url}")
        print(f"Max depth: {self.max_depth}")
        print(f"{'='*60}\n")
        
        # Step 1: Crawl the website
        self._crawl_website()
        
        # Step 2: Check broken links
        print("\n" + "="*60)
        print("Checking broken links...")
        print("="*60 + "\n")
        broken_links = self._check_broken_links()
        
        # Step 3: Generate reports
        print("\n" + "="*60)
        print("Generating reports...")
        print("="*60 + "\n")
        report_generator = ReportGenerator(self.output_dir)
        report_generator.generate_reports(self.crawled_items, broken_links, self.skipped_pages)
        
        # Print summary
        self._print_summary(broken_links)
    
    def _crawl_website(self):
        """Crawl the website using Scrapy."""
        # Clear previous collections
        from crawler.pipelines import ItemStoragePipeline
        ItemStoragePipeline.clear()
        
        # Configure settings
        settings = get_project_settings()
        
        # For web interface (use_subprocess=True), run in subprocess
        # For command line, use CrawlerProcess directly
        if self.use_subprocess:
            import subprocess
            import json as json_module
            import tempfile
            import threading
            import time
            
            # Create a temporary script file
            script_file = os.path.join(tempfile.gettempdir(), f'crawl_{os.getpid()}_{id(self)}.py')
            result_file = os.path.join(tempfile.gettempdir(), f'crawl_results_{os.getpid()}_{id(self)}.json')
            progress_file_path = self.progress_file or os.path.join(tempfile.gettempdir(), f'progress_{os.getpid()}_{id(self)}.json')
            
            # Ensure progress file directory exists
            if self.progress_file:
                os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)
            
            try:
                # Write script with progress tracking
                script_content = f'''import sys
import os
import json
import time

# Add current directory to path
sys.path.insert(0, r"{os.getcwd().replace(chr(92), chr(92)+chr(92))}")

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from crawler.spiders.site_spider import SiteSpider
from crawler.pipelines import ItemStoragePipeline

# Clear previous collections
ItemStoragePipeline.clear()

# Progress tracking function
def update_progress():
    items = ItemStoragePipeline.get_collected_items()
    links = ItemStoragePipeline.get_collected_links()
    
    # Calculate internal vs external links
    internal_count = 0
    external_count = 0
    current_page_url = ""
    
    if items:
        last_item = items[-1]
        current_page_url = last_item.get("url", "")
        internal_count = len(last_item.get("internal_links", []))
        external_count = len(last_item.get("external_links", []))
    
    # Count total internal/external across all pages
    total_internal = sum(len(item.get("internal_links", [])) for item in items)
    total_external = sum(len(item.get("external_links", [])) for item in items)
    
    # Get discovered URLs from spider stats (if available)
    discovered_urls = len(items)  # Default to pages_crawled if stats not available
    
    progress_data = {{
        "pages_crawled": len(items),
        "links_found": len(links),
        "internal_links": total_internal,
        "external_links": total_external,
        "current_page": current_page_url,
        "discovered_urls": discovered_urls,
        "timestamp": time.time()
    }}
    try:
        with open(r"{progress_file_path.replace(chr(92), chr(92)+chr(92))}", "w") as f:
            json.dump(progress_data, f)
    except:
        pass

# Custom pipeline to track progress with spider stats
class ProgressPipeline:
    def __init__(self):
        self.last_update_time = 0
    
    def open_spider(self, spider):
        """Called when spider opens."""
        self.spider = spider
    
    def process_item(self, item, spider):
        # Update progress every time an item is processed
        current_time = time.time()
        # Update at least every 0.5 seconds to avoid too frequent writes
        if current_time - self.last_update_time >= 0.5:
            # Get discovered URLs from spider stats if available
            discovered_urls = 0
            if hasattr(spider, 'stats') and 'discovered_urls' in spider.stats:
                discovered_urls = spider.stats.get('discovered_urls', 0)
            
            items = ItemStoragePipeline.get_collected_items()
            # If discovered_urls not available, use a better estimate
            if discovered_urls == 0 or discovered_urls < len(items):
                # Use pages_crawled + some buffer for pages being discovered
                discovered_urls = max(len(items), len(items) * 1.2)
            
            links = ItemStoragePipeline.get_collected_links()
            
            # Calculate internal vs external links
            total_internal = sum(len(item.get("internal_links", [])) for item in items)
            total_external = sum(len(item.get("external_links", [])) for item in items)
            current_page_url = item.get("url", "") if item else ""
            
            progress_data = {{
                "pages_crawled": len(items),
                "links_found": len(links),
                "internal_links": total_internal,
                "external_links": total_external,
                "current_page": current_page_url,
                "discovered_urls": int(discovered_urls),
                "timestamp": current_time
            }}
            try:
                with open(r"{progress_file_path.replace(chr(92), chr(92)+chr(92))}", "w") as f:
                    json.dump(progress_data, f)
            except:
                pass
            self.last_update_time = current_time
        return item

# Note: ProgressPipeline is now defined above in the update_progress section

# Configure and run
settings = get_project_settings()
# Add progress pipeline and skipped pages pipeline
original_pipelines = settings.get("ITEM_PIPELINES", {{}})
settings["ITEM_PIPELINES"] = original_pipelines.copy()
settings["ITEM_PIPELINES"]["__main__.ProgressPipeline"] = 1000
settings["ITEM_PIPELINES"]["__main__.SkippedPagesPipeline"] = 999

# Custom signal handler to capture skipped pages
skipped_pages_list = []

class SkippedPagesPipeline:
    def open_spider(self, spider):
        self.spider = spider
    
    def close_spider(self, spider):
        global skipped_pages_list
        if hasattr(spider, 'skipped_pages'):
            skipped_pages_list = spider.skipped_pages

# Add pipeline to settings
settings["ITEM_PIPELINES"]["__main__.SkippedPagesPipeline"] = 999

process = CrawlerProcess(settings)
process.crawl(SiteSpider, start_url="{self.start_url}", max_depth={self.max_depth})
process.start()

# Get results
items = ItemStoragePipeline.get_collected_items()
links = ItemStoragePipeline.get_collected_links()

# Get skipped pages (captured by pipeline)
skipped_pages = skipped_pages_list

# Calculate links_in for each skipped page
all_internal_links_list = []
for item in items:
    for link in item.get("internal_links", []):
        if isinstance(link, dict):
            all_internal_links_list.append(link.get("url", ""))
        else:
            all_internal_links_list.append(link)

# Count how many links point to each skipped page
for skipped in skipped_pages:
    skipped_url = skipped.get("url", "")
    links_in = sum(1 for link_url in all_internal_links_list if link_url == skipped_url)
    skipped["links_in"] = links_in

# Save to temp file
with open(r"{result_file.replace(chr(92), chr(92)+chr(92))}", "w", encoding="utf-8") as f:
    json.dump({{"items": items, "links": list(links), "skipped_pages": skipped_pages}}, f, ensure_ascii=False)
'''
                
                with open(script_file, 'w', encoding='utf-8') as f:
                    f.write(script_content)
                
                # Run subprocess
                result = subprocess.run(
                    [sys.executable, script_file],
                    cwd=os.getcwd(),
                    capture_output=True,
                    text=True,
                    timeout=3600
                )
                
                if result.returncode != 0:
                    error_msg = result.stderr or result.stdout or "Unknown error"
                    raise Exception(f"Crawl failed: {error_msg}")
                
                # Load results
                if os.path.exists(result_file):
                    with open(result_file, 'r', encoding='utf-8') as f:
                        results = json_module.load(f)
                        self.crawled_items = results.get('items', [])
                        links_data = results.get('links', [])
                        # Ensure all_internal_links only contains strings
                        self.all_internal_links = {link if isinstance(link, str) else (link.get('url', '') if isinstance(link, dict) else str(link))
                                                  for link in links_data if link}
                        # Get skipped pages from results and calculate links_in
                        skipped_pages_raw = results.get('skipped_pages', [])
                        # Calculate links_in for each skipped page
                        all_internal_links_list = []
                        for item in self.crawled_items:
                            for link in item.get("internal_links", []):
                                if isinstance(link, dict):
                                    all_internal_links_list.append(link.get("url", ""))
                                else:
                                    all_internal_links_list.append(link)
                        
                        # Count how many links point to each skipped page
                        for skipped in skipped_pages_raw:
                            skipped_url = skipped.get("url", "")
                            links_in = sum(1 for link_url in all_internal_links_list if link_url == skipped_url)
                            skipped["links_in"] = links_in
                        
                        self.skipped_pages = skipped_pages_raw
                else:
                    raise Exception("Crawl completed but results file not found")
                    
            except subprocess.TimeoutExpired:
                raise Exception("Crawl timed out after 1 hour")
            except Exception as e:
                raise Exception(f"Subprocess crawl failed: {str(e)}")
            finally:
                # Cleanup
                for f in [script_file, result_file]:
                    if os.path.exists(f):
                        try:
                            os.remove(f)
                        except:
                            pass
                # Keep progress file for a bit, then clean up
                if os.path.exists(progress_file_path) and not self.progress_file:
                    try:
                        time.sleep(2)
                        os.remove(progress_file_path)
                    except:
                        pass
        else:
            # Use CrawlerProcess for command line usage
            # Create a pipeline to capture skipped pages
            skipped_pages_list = []
            
            class SkippedPagesPipeline:
                def open_spider(self, spider):
                    self.spider = spider
                
                def close_spider(self, spider):
                    nonlocal skipped_pages_list
                    if hasattr(spider, 'skipped_pages'):
                        skipped_pages_list = spider.skipped_pages
            
            # Add pipeline to settings
            settings["ITEM_PIPELINES"]["__main__.SkippedPagesPipeline"] = 999
            
            process = CrawlerProcess(settings)
            process.crawl(SiteSpider, start_url=self.start_url, max_depth=self.max_depth)
            process.start()
            
            # Retrieve collected items and links
            self.crawled_items = ItemStoragePipeline.get_collected_items()
            collected_links = ItemStoragePipeline.get_collected_links()
            # Ensure all_internal_links only contains strings (filter out any dicts that might have slipped through)
            self.all_internal_links = {link if isinstance(link, str) else (link.get('url', '') if isinstance(link, dict) else str(link)) 
                                      for link in collected_links if link}
            
            # Get skipped pages and calculate links_in
            self.skipped_pages = skipped_pages_list
            # Calculate links_in for each skipped page
            all_internal_links_list = []
            for item in self.crawled_items:
                for link in item.get("internal_links", []):
                    if isinstance(link, dict):
                        all_internal_links_list.append(link.get("url", ""))
                    else:
                        all_internal_links_list.append(link)
            
            # Count how many links point to each skipped page
            for skipped in self.skipped_pages:
                skipped_url = skipped.get("url", "")
                links_in = sum(1 for link_url in all_internal_links_list if link_url == skipped_url)
                skipped["links_in"] = links_in
    
    def _check_broken_links(self) -> Dict[str, dict]:
        """Check all internal links for broken status."""
        if not self.all_internal_links:
            return {}
        
        broken_links = {}
        
        # Simple synchronous checking using requests
        try:
            import requests
            from requests.adapters import HTTPAdapter
            from urllib3.util.retry import Retry
            
            session = requests.Session()
            retry_strategy = Retry(
                total=2,
                backoff_factor=0.5,
                status_forcelist=[429, 500, 502, 503, 504],
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            total = len(self.all_internal_links)
            checked = 0
            
            for link in self.all_internal_links:
                checked += 1
                try:
                    response = session.head(link, allow_redirects=True, timeout=10)
                    status = response.status_code
                    
                    broken_links[link] = {
                        'url': link,
                        'status': status,
                        'status_text': self._get_status_text(status),
                        'is_broken': status >= 400,
                        'redirect_url': response.url if response.url != link else None
                    }
                except requests.exceptions.RequestException as e:
                    broken_links[link] = {
                        'url': link,
                        'status': 0,
                        'status_text': 'Error',
                        'is_broken': True,
                        'error': str(e)
                    }
                
                if checked % 10 == 0:
                    print(f"Checked {checked}/{total} links...")
            
        except ImportError:
            print("Warning: requests library not found. Skipping broken link check.")
            print("Install it with: pip install requests")
        
        return broken_links
    
    def _get_status_text(self, status: int) -> str:
        """Get human-readable status text."""
        status_map = {
            200: 'OK',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect',
            404: 'Not Found',
            403: 'Forbidden',
            500: 'Internal Server Error',
            503: 'Service Unavailable',
        }
        return status_map.get(status, f'Status {status}')
    
    def _print_summary(self, broken_links: Dict[str, dict]):
        """Print crawl summary."""
        print("\n" + "="*60)
        print("CRAWL SUMMARY")
        print("="*60)
        print(f"Total pages crawled: {len(self.crawled_items)}")
        print(f"Total internal links found: {len(self.all_internal_links)}")
        
        # Count broken links
        broken_count = sum(1 for link in broken_links.values() if link.get('is_broken'))
        print(f"Broken links: {broken_count}")
        
        # Count duplicates
        exact_duplicates = sum(1 for item in self.crawled_items if item.get('is_duplicate'))
        print(f"Exact duplicate pages: {exact_duplicates}")
        
        # Count near duplicates
        near_duplicates = sum(
            1 for item in self.crawled_items 
            if item.get('similarity_scores') and max(item.get('similarity_scores', {}).values(), default=0) >= 70
        )
        print(f"Near duplicate pages (70%+): {near_duplicates}")
        print("="*60 + "\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Crawl a website and analyze content, duplicates, and broken links.'
    )
    parser.add_argument(
        'start_url',
        help='Starting URL to crawl (e.g., https://example.com)'
    )
    parser.add_argument(
        '--max-depth',
        type=int,
        default=10,
        help='Maximum crawl depth (default: 10)'
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help='Output directory for reports (default: output)'
    )
    
    args = parser.parse_args()
    
    # Run the crawler
    runner = CrawlerRunner(
        start_url=args.start_url,
        max_depth=args.max_depth,
        output_dir=args.output_dir
    )
    runner.run()


if __name__ == '__main__':
    main()

