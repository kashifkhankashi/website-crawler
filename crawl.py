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
from typing import Dict, List, Set
from urllib.parse import urlparse
from datetime import datetime

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scrapy.http import Request

from crawler.spiders.site_spider import SiteSpider


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
    
    def generate_reports(self, items: List[dict], broken_links: Dict[str, dict]):
        """
        Generate JSON and CSV reports.
        
        Args:
            items: List of crawled page dictionaries
            broken_links: Dictionary of broken link statuses
        """
        # Generate JSON report
        self._generate_json_report(items, broken_links)
        
        # Generate CSV summary
        self._generate_csv_summary(items, broken_links)
        
        # Generate sitemap
        self._generate_sitemap(items)
    
    def _generate_json_report(self, items: List[dict], broken_links: Dict[str, dict]):
        """Generate detailed JSON report."""
        report_data = {
            'crawl_date': datetime.now().isoformat(),
            'total_pages': len(items),
            'pages': []
        }
        
        for item in items:
            url = item['url']
            
            # Get broken links for this page
            page_broken_links = []
            for link in item.get('internal_links', []):
                if link in broken_links and broken_links[link]['is_broken']:
                    page_broken_links.append({
                        'url': link,
                        'status': broken_links[link]['status'],
                        'status_text': broken_links[link]['status_text']
                    })
            
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
                'word_count': item.get('word_count', 0),
                'internal_links': item.get('internal_links', []),
                'external_links': item.get('external_links', []),
                'broken_links': page_broken_links,
                'duplicate_status': duplicate_status,
                'is_exact_duplicate': item.get('is_duplicate', False),
                'duplicate_urls': item.get('duplicate_urls', []),
                'similarity_scores': similarity_scores,
                'content_hash': item.get('content_hash', ''),
                'crawled_at': item.get('crawled_at', '')
            }
            
            report_data['pages'].append(page_data)
        
        # Save JSON report
        json_path = os.path.join(self.output_dir, 'report.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ JSON report saved to: {json_path}")
    
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
                    if link in broken_links and broken_links[link]['is_broken']:
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


class CrawlerRunner:
    """
    Main crawler runner that orchestrates crawling, link checking, and reporting.
    """
    
    def __init__(self, start_url: str, max_depth: int = 10, output_dir: str = 'output', use_subprocess: bool = False):
        """
        Initialize the crawler runner.
        
        Args:
            start_url: Starting URL to crawl
            max_depth: Maximum crawl depth
            output_dir: Output directory for reports
            use_subprocess: If True, run crawl in subprocess (for web interface)
        """
        self.start_url = start_url
        self.max_depth = max_depth
        self.output_dir = output_dir
        self.use_subprocess = use_subprocess
        self.crawled_items: List[dict] = []
        self.all_internal_links: Set[str] = set()
    
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
        report_generator.generate_reports(self.crawled_items, broken_links)
        
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
            
            # Create a temporary script file
            script_file = os.path.join(tempfile.gettempdir(), f'crawl_{os.getpid()}_{id(self)}.py')
            result_file = os.path.join(tempfile.gettempdir(), f'crawl_results_{os.getpid()}_{id(self)}.json')
            
            try:
                # Write script
                script_content = f'''import sys
import os
import json

# Add current directory to path
sys.path.insert(0, r"{os.getcwd().replace(chr(92), chr(92)+chr(92))}")

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from crawler.spiders.site_spider import SiteSpider
from crawler.pipelines import ItemStoragePipeline

# Clear previous collections
ItemStoragePipeline.clear()

# Configure and run
settings = get_project_settings()
process = CrawlerProcess(settings)
process.crawl(SiteSpider, start_url="{self.start_url}", max_depth={self.max_depth})
process.start()

# Get results
items = ItemStoragePipeline.get_collected_items()
links = ItemStoragePipeline.get_collected_links()

# Save to temp file
with open(r"{result_file.replace(chr(92), chr(92)+chr(92))}", "w", encoding="utf-8") as f:
    json.dump({{"items": items, "links": list(links)}}, f, ensure_ascii=False)
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
                        self.all_internal_links = set(results.get('links', []))
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
        else:
            # Use CrawlerProcess for command line usage
            process = CrawlerProcess(settings)
            process.crawl(SiteSpider, start_url=self.start_url, max_depth=self.max_depth)
            process.start()
            
            # Retrieve collected items and links
            self.crawled_items = ItemStoragePipeline.get_collected_items()
            self.all_internal_links = ItemStoragePipeline.get_collected_links()
    
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

