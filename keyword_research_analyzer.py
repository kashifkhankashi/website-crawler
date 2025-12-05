"""
Advanced Keyword Research Analyzer
Extracts keywords, topics, entities, and content gaps from competitor websites
using NLP techniques.
"""
from typing import Dict, List, Set, Tuple, Optional
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import re
from collections import Counter, defaultdict
import json
from datetime import datetime

# NLP Libraries
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.tag import pos_tag
    from nltk.chunk import ne_chunk
    from nltk.stem import WordNetLemmatizer
    NLTK_AVAILABLE = True
    
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    try:
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        nltk.download('averaged_perceptron_tagger', quiet=True)
    
    try:
        nltk.data.find('chunkers/maxent_ne_chunker')
    except LookupError:
        nltk.download('maxent_ne_chunker', quiet=True)
    
    try:
        nltk.data.find('corpora/wordnet')
    except LookupError:
        nltk.download('wordnet', quiet=True)
    
    try:
        nltk.data.find('corpora/omw-1.4')
    except LookupError:
        nltk.download('omw-1.4', quiet=True)
        
except ImportError:
    NLTK_AVAILABLE = False
    print("NLTK not available. Using basic keyword extraction.")
    # Define fallback functions
    def word_tokenize(text):
        """Fallback word tokenizer when NLTK is not available."""
        return text.split()
    
    def sent_tokenize(text):
        """Fallback sentence tokenizer when NLTK is not available."""
        return [s.strip() for s in text.split('.') if s.strip()]
    
    stopwords = set()
    pos_tag = lambda x: []
    ne_chunk = lambda x: x
    WordNetLemmatizer = None

try:
    import spacy
    SPACY_AVAILABLE = True
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
        SPACY_AVAILABLE = False
        nlp = None
except ImportError:
    SPACY_AVAILABLE = False
    nlp = None

# Keyword Extraction Libraries
try:
    import yake
    YAKE_AVAILABLE = True
except ImportError:
    YAKE_AVAILABLE = False
    print("YAKE not available. Using basic keyword extraction.")

try:
    from rake_nltk import Rake
    RAKE_AVAILABLE = True
except ImportError:
    RAKE_AVAILABLE = False
    print("RAKE-NLTK not available. Using basic keyword extraction.")


class KeywordResearchAnalyzer:
    """
    Advanced keyword research analyzer that:
    - Crawls competitor websites
    - Extracts keywords, phrases, topics, entities
    - Identifies content gaps
    - Uses NLP for semantic analysis
    """
    
    def __init__(self):
        self.timeout = 30
        self.max_pages_per_site = 20
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Initialize NLP components
        if NLTK_AVAILABLE:
            self.stop_words = set(stopwords.words('english'))
            self.lemmatizer = WordNetLemmatizer()
        else:
            self.stop_words = {
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
                'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
                'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
            }
            self.lemmatizer = None
        
        # Extended stop words for better filtering - comprehensive list
        self.stop_words.update({
            # Generic website words
            'com', 'www', 'http', 'https', 'html', 'php', 'asp', 'net', 'org',
            'click', 'here', 'more', 'read', 'view', 'see', 'page', 'site',
            'website', 'web', 'online', 'home', 'menu', 'about', 'contact',
            'privacy', 'terms', 'policy', 'copyright', 'disclaimer', 'close',
            'search', 'skip', 'full', 'useful', 'kids', 'list', 'visit',
            'follow', 'learn', 'enjoy', 'longhorn', 'steakhouse',
            # Common verbs
            'make', 'get', 'go', 'come', 'take', 'give', 'put', 'set', 'say',
            'tell', 'ask', 'work', 'call', 'try', 'use', 'find', 'want', 'need',
            'know', 'think', 'see', 'look', 'come', 'go', 'give', 'get', 'make',
            'take', 'put', 'set', 'say', 'tell', 'ask', 'work', 'call', 'try',
            # Common adjectives/adverbs
            'very', 'much', 'many', 'most', 'some', 'such', 'only', 'just',
            'also', 'well', 'too', 'so', 'how', 'when', 'where', 'why', 'what',
            'which', 'who', 'whom', 'whose', 'that', 'this', 'these', 'those',
            # Common prepositions/conjunctions
            'into', 'over', 'after', 'under', 'through', 'during', 'before',
            'above', 'below', 'between', 'among', 'within', 'without', 'against',
            'toward', 'towards', 'around', 'throughout', 'beside', 'besides',
            'except', 'beyond', 'across', 'along', 'behind', 'beneath', 'beside',
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
            'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself',
            'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
            # Common auxiliary verbs
            'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has',
            'had', 'having', 'do', 'does', 'did', 'doing', 'done', 'will',
            'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
            'ought'
        })
    
    def search_keyword_across_competitors(self, keyword: str, competitors: List[str], 
                                         progress_callback=None) -> Dict:
        """
        Search for a specific keyword and its variations across competitor sites.
        
        Args:
            keyword: The keyword to search for (e.g., 'longhorn')
            competitors: List of competitor URLs
            progress_callback: Optional callback function(progress, message)
            
        Returns:
            Dictionary with keyword usage data across competitors
        """
        keyword_lower = keyword.lower().strip()
        results = {
            'keyword': keyword,
            'variations': [],
            'competitor_data': {},
            'total_occurrences': 0,
            'total_pages': 0,
            'summary': {}
        }
        
        if progress_callback:
            progress_callback(0, f"Starting keyword search for '{keyword}'...")
        
        # Generate keyword variations
        variations = self._generate_keyword_variations(keyword_lower)
        results['variations'] = variations
        
        all_variations = [keyword_lower] + variations
        all_variations_lower = [v.lower() for v in all_variations]
        
        if progress_callback:
            progress_callback(10, f"Found {len(variations)} keyword variations. Crawling competitors...")
        
        total_competitors = len(competitors)
        for idx, competitor_url in enumerate(competitors):
            try:
                if progress_callback:
                    progress = 10 + int((idx / total_competitors) * 80)
                    progress_callback(progress, f"Crawling {competitor_url}...")
                
                # Crawl competitor site
                competitor_data = self._crawl_website(competitor_url, is_your_site=False)
                
                if not competitor_data or not competitor_data.get('pages'):
                    results['competitor_data'][competitor_url] = {
                        'error': 'No pages found',
                        'pages': [],
                        'total_occurrences': 0,
                        'variations_found': []
                    }
                    continue
                
                # Search for keyword in all pages
                pages_with_keyword = []
                total_occurrences = 0
                variations_found = []
                
                for page in competitor_data['pages']:
                    page_text = ' '.join([
                        page.get('title', ''),
                        page.get('meta_description', ''),
                        ' '.join(page.get('h1_tags', [])),
                        ' '.join(page.get('h2_tags', [])),
                        ' '.join(page.get('h3_tags', [])),
                        page.get('text_content', '')
                    ]).lower()
                    
                    page_occurrences = {}
                    page_total = 0
                    
                    # Count occurrences of each variation
                    for variation in all_variations_lower:
                        count = page_text.count(variation)
                        if count > 0:
                            page_occurrences[variation] = count
                            page_total += count
                            if variation not in variations_found:
                                variations_found.append(variation)
                    
                    if page_total > 0:
                        pages_with_keyword.append({
                            'url': page.get('url', ''),
                            'title': page.get('title', ''),
                            'occurrences': page_total,
                            'variations': page_occurrences,
                            'context': self._extract_keyword_context(page_text, all_variations_lower)
                        })
                        total_occurrences += page_total
                
                results['competitor_data'][competitor_url] = {
                    'pages': pages_with_keyword,
                    'total_occurrences': total_occurrences,
                    'total_pages_analyzed': len(competitor_data['pages']),
                    'pages_with_keyword': len(pages_with_keyword),
                    'variations_found': variations_found
                }
                
                results['total_occurrences'] += total_occurrences
                results['total_pages'] += len(pages_with_keyword)
                
            except Exception as e:
                print(f"Error analyzing competitor {competitor_url}: {e}")
                results['competitor_data'][competitor_url] = {
                    'error': str(e),
                    'pages': [],
                    'total_occurrences': 0,
                    'variations_found': []
                }
        
        # Generate summary
        results['summary'] = {
            'total_competitors': len(competitors),
            'competitors_with_keyword': sum(1 for data in results['competitor_data'].values() 
                                           if data.get('total_occurrences', 0) > 0),
            'most_used_variation': self._find_most_used_variation(results),
            'average_occurrences_per_page': (
                results['total_occurrences'] / results['total_pages'] 
                if results['total_pages'] > 0 else 0
            )
        }
        
        if progress_callback:
            progress_callback(100, f"Keyword search complete! Found {results['total_occurrences']} occurrences across {results['total_pages']} pages.")
        
        return results
    
    def _generate_keyword_variations(self, keyword: str) -> List[str]:
        """Generate variations of a keyword (e.g., 'longhorn' -> 'longhorn steakhouse', 'longhorn menu')."""
        variations = []
        keyword_lower = keyword.lower()
        
        # Common suffixes/combinations for food/restaurant keywords
        common_suffixes = [
            'menu', 'steakhouse', 'restaurant', 'grill', 'bar', 'kitchen',
            'food', 'dining', 'cafe', 'bistro', 'prices', 'hours', 'location',
            'near me', 'delivery', 'takeout', 'catering', 'reservations',
            'reviews', 'ratings', 'specials', 'deals', 'coupons'
        ]
        
        # Add keyword + suffix variations
        for suffix in common_suffixes:
            variations.append(f"{keyword_lower} {suffix}")
            variations.append(f"{suffix} {keyword_lower}")
        
        # Add plural form
        if not keyword_lower.endswith('s'):
            variations.append(f"{keyword_lower}s")
        
        # Add possessive form
        variations.append(f"{keyword_lower}'s")
        
        return variations
    
    def _extract_keyword_context(self, text: str, variations: List[str], context_length: int = 100) -> List[str]:
        """Extract context snippets where keywords appear."""
        contexts = []
        text_lower = text.lower()
        
        for variation in variations:
            if variation in text_lower:
                # Find all occurrences
                start = 0
                while True:
                    idx = text_lower.find(variation, start)
                    if idx == -1:
                        break
                    
                    # Extract context around the keyword
                    context_start = max(0, idx - context_length)
                    context_end = min(len(text), idx + len(variation) + context_length)
                    context = text[context_start:context_end].strip()
                    
                    if context and context not in contexts:
                        contexts.append(context)
                    
                    start = idx + 1
                    if len(contexts) >= 5:  # Limit to 5 contexts per variation
                        break
        
        return contexts[:10]  # Return max 10 contexts
    
    def _find_most_used_variation(self, results: Dict) -> str:
        """Find the most frequently used variation across all competitors."""
        variation_counts = {}
        
        for competitor_data in results['competitor_data'].values():
            for page in competitor_data.get('pages', []):
                for variation, count in page.get('variations', {}).items():
                    variation_counts[variation] = variation_counts.get(variation, 0) + count
        
        if not variation_counts:
            return results['keyword']
        
        return max(variation_counts.items(), key=lambda x: x[1])[0]
    
    def analyze_keywords_with_progress(self, domain: str, competitors: List[str], 
                                       progress_callback=None) -> Dict:
        """
        Main analysis function with progress updates.
        
        Args:
            domain: Your website domain (e.g., 'longhorn-menu.us')
            competitors: List of competitor URLs
            progress_callback: Function(progress, stage, details, current_competitor, competitor_index)
            
        Returns:
            Dictionary with keywords, topics, entities, and content gaps
        """
        if progress_callback:
            progress_callback(0, 'Starting keyword research analysis...', 
                            f'Analyzing {domain} against {len(competitors)} competitors')
        
        start_time = time.time()
        
        # Step 1: Crawl your website (10% progress)
        if progress_callback:
            progress_callback(5, 'Crawling your website...', f'Crawling {domain}')
        
        your_site_data = self._crawl_website(domain, is_your_site=True)
        
        if progress_callback:
            progress_callback(10, 'Your website crawled', 
                            f'Crawled {your_site_data.get("pages_crawled", 0)} pages from your site')
        
        # Step 2: Crawl competitors (40% progress total, 10% + 30%)
        competitor_data = {}
        total_competitors = len(competitors)
        competitor_progress_step = 30 / total_competitors if total_competitors > 0 else 0
        
        for i, competitor_url in enumerate(competitors, 1):
            competitor_domain = competitor_url.replace('https://', '').replace('http://', '').split('/')[0]
            if progress_callback:
                progress_callback(
                    10 + (i - 1) * competitor_progress_step,
                    f'Crawling competitor {i}/{total_competitors}...',
                    f'Analyzing {competitor_domain}',
                    competitor_domain,
                    i - 1
                )
            
            try:
                competitor_data[competitor_url] = self._crawl_website(
                    competitor_url, 
                    is_your_site=False, 
                    progress_callback=progress_callback
                )
                pages_crawled = competitor_data[competitor_url].get('pages_crawled', 0)
                if progress_callback:
                    progress_callback(
                        10 + i * competitor_progress_step,
                        f'Competitor {i}/{total_competitors} crawled',
                        f'Crawled {pages_crawled} pages from {competitor_domain}',
                        competitor_domain,
                        i - 1
                    )
            except Exception as e:
                if progress_callback:
                    progress_callback(
                        10 + i * competitor_progress_step,
                        f'Error crawling competitor {i}',
                        f'Error: {str(e)}',
                        competitor_domain,
                        i - 1
                    )
                competitor_data[competitor_url] = {}
        
        # Step 3: Extract keywords from your site (50% progress)
        if progress_callback:
            progress_callback(50, 'Extracting keywords from your website...', 
                            'Using NLP to identify keywords and phrases')
        
        your_keywords = self._extract_keywords_advanced(your_site_data)
        
        if progress_callback:
            progress_callback(55, 'Your keywords extracted', 
                            f'Found {len(your_keywords.get("keywords", []))} keywords')
        
        # Step 4: Extract keywords from competitors (65% progress)
        if progress_callback:
            progress_callback(60, 'Extracting keywords from competitors...', 
                            'Analyzing competitor content with NLP')
        
        competitor_keywords = {}
        keyword_extraction_step = 10 / total_competitors if total_competitors > 0 else 0
        
        for i, (url, data) in enumerate(competitor_data.items(), 1):
            if data:
                competitor_keywords[url] = self._extract_keywords_advanced(data)
                kw_count = len(competitor_keywords[url].get('keywords', []))
                if progress_callback:
                    progress_callback(
                        60 + i * keyword_extraction_step,
                        f'Extracting keywords from competitor {i}/{total_competitors}',
                        f'Found {kw_count} keywords',
                        url.replace('https://', '').replace('http://', '').split('/')[0],
                        i - 1
                    )
        
        # Step 5: Aggregate competitor keywords (70% progress)
        if progress_callback:
            progress_callback(70, 'Aggregating competitor keywords...', 
                            'Combining keywords from all competitors')
        
        all_competitor_keywords = self._aggregate_competitor_keywords(competitor_keywords)
        
        # Step 6: Find content gaps (75% progress)
        if progress_callback:
            progress_callback(75, 'Identifying content gaps...', 
                            'Finding keywords competitors use that you don\'t')
        
        content_gaps = self._find_content_gaps(your_keywords, all_competitor_keywords)
        
        if progress_callback:
            progress_callback(78, 'Content gaps identified', 
                            f'Found {len(content_gaps.get("missing_keywords", []))} missing keywords')
        
        # Step 7: Extract topic clusters (80% progress)
        if progress_callback:
            progress_callback(80, 'Identifying topic clusters...', 
                            'Grouping related keywords into topics')
        
        topic_clusters = self._identify_topic_clusters(all_competitor_keywords, your_keywords)
        
        if progress_callback:
            progress_callback(85, 'Topic clusters identified', 
                            f'Found {len(topic_clusters)} topic clusters')
        
        # Step 8: Extract entities (88% progress)
        if progress_callback:
            progress_callback(88, 'Extracting entities...', 
                            'Identifying product names, brands, and menu items')
        
        entities = self._extract_entities(your_site_data, competitor_data)
        
        # Step 9: Extract FAQ patterns (92% progress)
        if progress_callback:
            progress_callback(92, 'Extracting FAQ patterns...', 
                            'Finding questions in competitor content')
        
        faq_patterns = self._extract_faq_patterns(your_site_data, competitor_data)
        
        # Step 10: Generate keyword opportunities (90% progress)
        if progress_callback:
            progress_callback(90, 'Generating keyword opportunities...', 
                            'Calculating opportunity scores')
        
        opportunities = self._generate_keyword_opportunities(
            your_keywords, all_competitor_keywords, content_gaps
        )
        
        # Step 11: Advanced Analysis Features (92% progress)
        if progress_callback:
            progress_callback(92, 'Performing advanced keyword analysis...', 
                            'Analyzing keyword difficulty, intent, and variations')
        
        # Keyword difficulty/competition analysis
        keyword_difficulty = self._analyze_keyword_difficulty(
            your_keywords, competitor_keywords, competitors
        )
        
        # Keyword intent classification
        keyword_intent = self._classify_keyword_intent(
            all_competitor_keywords, your_keywords
        )
        
        # Long-tail keyword discovery
        long_tail_keywords = self._discover_long_tail_keywords(
            competitor_data, your_site_data
        )
        
        # LSI keywords
        lsi_keywords = self._extract_lsi_keywords(
            all_competitor_keywords, your_keywords
        )
        
        # Keyword variations and synonyms
        keyword_variations = self._find_keyword_variations(
            all_competitor_keywords, your_keywords
        )
        
        # Keyword mapping to pages
        keyword_mapping = self._map_keywords_to_pages(
            your_site_data, competitor_data
        )
        
        # Keyword density analysis
        keyword_density = self._analyze_keyword_density(
            your_site_data, competitor_data
        )
        
        # SERP feature opportunities
        serp_opportunities = self._identify_serp_opportunities(
            all_competitor_keywords, your_keywords, faq_patterns
        )
        
        # Content suggestions
        content_suggestions = self._generate_content_suggestions(
            opportunities, content_gaps, topic_clusters, keyword_intent
        )
        
        analysis_time = time.time() - start_time
        
        # Prepare per-competitor breakdown
        per_competitor_breakdown = {}
        for url, data in competitor_data.items():
            if data:
                keywords = competitor_keywords.get(url, {})
                per_competitor_breakdown[url] = {
                    'url': url,
                    'domain': data.get('domain', ''),
                    'pages_crawled': data.get('pages_crawled', 0),
                    'keywords': keywords.get('keywords', [])[:50],
                    'phrases': keywords.get('phrases', [])[:50],
                    'keyword_count': len(keywords.get('keywords', [])),
                    'phrase_count': len(keywords.get('phrases', [])),
                    'top_keywords': keywords.get('keyword_frequency', {})
                }
        
        if progress_callback:
            progress_callback(100, 'Analysis complete!', 
                            f'Analysis completed in {round(analysis_time, 2)} seconds')
        
        return {
            'domain': domain,
            'competitors': competitors,
            'your_keywords': your_keywords,
            'competitor_keywords': all_competitor_keywords,
            'per_competitor_data': per_competitor_breakdown,
            'content_gaps': content_gaps,
            'topic_clusters': topic_clusters,
            'entities': entities,
            'faq_patterns': faq_patterns,
            'opportunities': opportunities,
            # Advanced Features
            'keyword_difficulty': keyword_difficulty,
            'keyword_intent': keyword_intent,
            'long_tail_keywords': long_tail_keywords,
            'lsi_keywords': lsi_keywords,
            'keyword_variations': keyword_variations,
            'keyword_mapping': keyword_mapping,
            'keyword_density': keyword_density,
            'serp_opportunities': serp_opportunities,
            'content_suggestions': content_suggestions,
            'statistics': {
                'your_keyword_count': len(your_keywords.get('keywords', [])),
                'competitor_keyword_count': len(all_competitor_keywords.get('keywords', [])),
                'content_gap_count': len(content_gaps.get('missing_keywords', [])),
                'topic_cluster_count': len(topic_clusters),
                'entity_count': len(entities.get('all_entities', [])),
                'faq_count': len(faq_patterns),
                'competitor_count': len(competitors),
                'long_tail_count': len(long_tail_keywords.get('keywords', [])),
                'lsi_count': len(lsi_keywords.get('keywords', [])),
                'variations_count': len(keyword_variations.get('variations', [])),
                'analysis_time': round(analysis_time, 2)
            },
            'analysis_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def analyze_keywords(self, domain: str, competitors: List[str]) -> Dict:
        """Main analysis function (without progress - for backward compatibility)."""
        return self.analyze_keywords_with_progress(domain, competitors, progress_callback=None)
    
    def _crawl_website(self, url: str, is_your_site: bool = False, progress_callback=None) -> Dict:
        """Crawl a website and extract content."""
        if not url.startswith('http'):
            url = 'https://' + url
        
        parsed = urlparse(url)
        base_domain = parsed.netloc
        base_url = f"{parsed.scheme}://{base_domain}"
        
        pages_data = []
        visited_urls = set()
        to_visit = [url]
        
        max_pages = self.max_pages_per_site if not is_your_site else self.max_pages_per_site * 2
        
        while to_visit and len(visited_urls) < max_pages:
            current_url = to_visit.pop(0)
            
            if current_url in visited_urls:
                continue
            
            try:
                # Report crawling progress (every 3 pages or first page)
                if progress_callback and (len(visited_urls) == 0 or len(visited_urls) % 3 == 0):
                    domain_name = base_domain.replace('www.', '')
                    page_num = len(visited_urls) + 1
                    try:
                        progress_callback(
                            None,  # Don't change overall progress
                            f'Crawling {domain_name}...',
                            f'Page {page_num}/{max_pages}: Processing content...',
                            domain_name if not is_your_site else None,
                            None
                        )
                    except:
                        pass  # Ignore callback errors
                
                response = requests.get(current_url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
                if response.status_code != 200:
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove scripts and styles
                for script in soup(["script", "style", "noscript", "meta", "link"]):
                    script.decompose()
                
                # Extract page data
                page_data = {
                    'url': response.url,
                    'title': self._extract_title(soup),
                    'meta_description': self._extract_meta_description(soup),
                    'h1_tags': self._extract_headings(soup, 'h1'),
                    'h2_tags': self._extract_headings(soup, 'h2'),
                    'h3_tags': self._extract_headings(soup, 'h3'),
                    'text_content': self._extract_text_content(soup),
                    'links': self._extract_links(soup, base_url)
                }
                
                pages_data.append(page_data)
                visited_urls.add(current_url)
                
                # Find internal links to crawl
                if len(visited_urls) < max_pages:
                    for link in page_data['links']['internal'][:10]:  # Limit links per page
                        if link not in visited_urls and link not in to_visit:
                            to_visit.append(link)
                
                time.sleep(0.5)  # Be respectful
            
            except Exception as e:
                print(f"Error crawling {current_url}: {e}")
                continue
        
        return {
            'domain': base_domain,
            'base_url': base_url,
            'pages': pages_data,
            'pages_crawled': len(pages_data)
        }
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title."""
        if soup.title:
            return soup.title.get_text().strip()
        og_title = soup.find('meta', property='og:title')
        if og_title:
            return og_title.get('content', '').strip()
        return ''
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> str:
        """Extract meta description."""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            return meta_desc.get('content', '').strip()
        og_desc = soup.find('meta', property='og:description')
        if og_desc:
            return og_desc.get('content', '').strip()
        return ''
    
    def _extract_headings(self, soup: BeautifulSoup, tag: str) -> List[str]:
        """Extract heading tags."""
        headings = []
        for h in soup.find_all(tag):
            text = h.get_text(strip=True)
            if text:
                headings.append(text)
        return headings
    
    def _extract_text_content(self, soup: BeautifulSoup) -> str:
        """Extract visible text content."""
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text_content = ' '.join(chunk for chunk in chunks if chunk)
        return text_content
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> Dict:
        """Extract internal and external links."""
        parsed_base = urlparse(base_url)
        base_domain = parsed_base.netloc
        
        internal_links = []
        external_links = []
        
        for a in soup.find_all('a', href=True):
            href = a.get('href', '').strip()
            if not href or href.startswith('#'):
                continue
            
            # Resolve URL
            if href.startswith('/'):
                full_url = f"{parsed_base.scheme}://{base_domain}{href}"
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = urljoin(base_url, href)
            
            try:
                parsed = urlparse(full_url)
                if parsed.netloc == base_domain:
                    internal_links.append(full_url)
                else:
                    external_links.append(full_url)
            except:
                pass
        
        return {
            'internal': list(set(internal_links)),
            'external': list(set(external_links))
        }
    
    def _extract_keywords_advanced(self, site_data: Dict) -> Dict:
        """Extract keywords using NLP techniques."""
        if not site_data or not site_data.get('pages'):
            return {
                'keywords': [],
                'phrases': [],
                'keyword_frequency': {}
            }
        
        # Combine all text from all pages
        all_text = []
        all_titles = []
        all_descriptions = []
        all_headings = []
        
        for page in site_data['pages']:
            if page.get('text_content'):
                all_text.append(page['text_content'])
            if page.get('title'):
                all_titles.append(page['title'])
            if page.get('meta_description'):
                all_descriptions.append(page['meta_description'])
            if page.get('h1_tags'):
                all_headings.extend(page['h1_tags'])
            if page.get('h2_tags'):
                all_headings.extend(page['h2_tags'])
            if page.get('h3_tags'):
                all_headings.extend(page['h3_tags'])
        
        combined_text = ' '.join(all_text)
        combined_headings = ' '.join(all_headings)
        
        # Extract single keywords
        keywords = self._extract_single_keywords(combined_text, combined_headings)
        
        # Extract 2-3 word phrases
        phrases = self._extract_phrases(combined_text, combined_headings)
        
        # Calculate keyword frequency
        keyword_frequency = Counter(keywords)
        
        return {
            'keywords': keywords[:100],  # Top 100
            'phrases': phrases[:100],  # Top 100
            'keyword_frequency': dict(keyword_frequency.most_common(100)),
            'total_keywords': len(keywords),
            'total_phrases': len(phrases)
        }
    
    def _extract_single_keywords(self, text: str, headings: str = '') -> List[str]:
        """Extract meaningful SEO keywords using YAKE/RAKE libraries."""
        # Combine text and headings (headings are more important)
        combined = f"{headings} {headings} {text}"  # Weight headings more
        
        # Clean text: remove numbers, special chars, normalize
        combined = re.sub(r'\d+', '', combined)  # Remove numbers
        combined = re.sub(r'[^\w\s]', ' ', combined)  # Keep only words and spaces
        combined = ' '.join(combined.split())  # Normalize whitespace
        
        if not combined or len(combined.strip()) < 10:
            return []
        
        keywords = []
        
        # Try YAKE first (best for single keywords)
        if YAKE_AVAILABLE:
            try:
                kw_extractor = yake.KeywordExtractor(
                    lan="en",
                    n=1,  # Single keywords only
                    dedupLim=0.7,
                    top=200,
                    features=None
                )
                yake_keywords = kw_extractor.extract_keywords(combined)
                
                # Extract keywords from YAKE results (format: (keyword, score))
                for kw, score in yake_keywords:
                    kw_lower = kw.lower().strip()
                    # Filter: min 3 chars, no stopwords, no numbers, meaningful
                    if (len(kw_lower) >= 3 and 
                        kw_lower not in self.stop_words and
                        kw_lower.isalpha() and
                        not any(char.isdigit() for char in kw_lower)):
                        keywords.append(kw_lower)
                
                if keywords:
                    # Remove duplicates while preserving order
                    seen = set()
                    unique_keywords = []
                    for kw in keywords:
                        if kw not in seen:
                            seen.add(kw)
                            unique_keywords.append(kw)
                    return unique_keywords[:200]
            except Exception as e:
                print(f"YAKE extraction error: {e}")
        
        # Try RAKE as fallback
        if RAKE_AVAILABLE and NLTK_AVAILABLE:
            try:
                r = Rake(min_length=1, max_length=1)  # Single words only
                r.extract_keywords_from_text(combined)
                rake_keywords = r.get_ranked_phrases()
                
                for kw in rake_keywords:
                    kw_lower = kw.lower().strip()
                    if (len(kw_lower) >= 3 and 
                        kw_lower not in self.stop_words and
                        kw_lower.isalpha() and
                        not any(char.isdigit() for char in kw_lower)):
                        keywords.append(kw_lower)
                
                if keywords:
                    seen = set()
                    unique_keywords = []
                    for kw in keywords:
                        if kw not in seen:
                            seen.add(kw)
                            unique_keywords.append(kw)
                    return unique_keywords[:200]
            except Exception as e:
                print(f"RAKE extraction error: {e}")
        
        # Fallback: NLTK with strict filtering
        if NLTK_AVAILABLE:
            try:
                tokens = word_tokenize(combined.lower())
                tagged = pos_tag(tokens)
                
                for word, pos in tagged:
                    # Only nouns and adjectives, min 3 chars, no stopwords
                    if ((pos.startswith('NN') or pos.startswith('JJ')) and
                        len(word) >= 3 and 
                        word.isalpha() and 
                        word not in self.stop_words and
                        not any(char.isdigit() for char in word)):
                        if self.lemmatizer:
                            lemma = self.lemmatizer.lemmatize(word)
                            keywords.append(lemma)
                        else:
                            keywords.append(word)
                
                keyword_counts = Counter(keywords)
                return [word for word, count in keyword_counts.most_common(200)]
            except Exception as e:
                print(f"NLTK keyword extraction error: {e}")
        
        # Final fallback: basic extraction with strict filtering
        words = re.findall(r'\b[a-z]{3,}\b', combined.lower())
        filtered = [w for w in words 
                   if w not in self.stop_words and 
                   len(w) >= 3 and 
                   w.isalpha() and
                   not any(char.isdigit() for char in w)]
        keyword_counts = Counter(filtered)
        return [word for word, count in keyword_counts.most_common(200)]
    
    def _extract_phrases(self, text: str, headings: str = '') -> List[str]:
        """Extract 2-3 word meaningful keyword phrases using YAKE/RAKE."""
        combined = f"{headings} {headings} {text}"
        
        # Clean text: remove numbers, special chars, normalize
        combined = re.sub(r'\d+', '', combined)  # Remove numbers
        combined = re.sub(r'[^\w\s]', ' ', combined)  # Keep only words and spaces
        combined = ' '.join(combined.split())  # Normalize whitespace
        
        if not combined or len(combined.strip()) < 10:
            return []
        
        phrases = []
        
        # Try YAKE for 2-3 word phrases
        if YAKE_AVAILABLE:
            try:
                # Extract 2-word phrases
                kw_extractor_2 = yake.KeywordExtractor(
                    lan="en",
                    n=2,  # 2-word phrases
                    dedupLim=0.7,
                    top=100,
                    features=None
                )
                yake_phrases_2 = kw_extractor_2.extract_keywords(combined)
                
                # Extract 3-word phrases
                kw_extractor_3 = yake.KeywordExtractor(
                    lan="en",
                    n=3,  # 3-word phrases
                    dedupLim=0.7,
                    top=100,
                    features=None
                )
                yake_phrases_3 = kw_extractor_3.extract_keywords(combined)
                
                # Process 2-word phrases
                for phrase, score in yake_phrases_2:
                    phrase_lower = phrase.lower().strip()
                    words = phrase_lower.split()
                    # Filter: both words meaningful, no stopwords
                    if (len(words) == 2 and
                        all(len(w) >= 3 for w in words) and
                        all(w not in self.stop_words for w in words) and
                        all(w.isalpha() for w in words) and
                        not any(char.isdigit() for char in phrase_lower)):
                        phrases.append(phrase_lower)
                
                # Process 3-word phrases
                for phrase, score in yake_phrases_3:
                    phrase_lower = phrase.lower().strip()
                    words = phrase_lower.split()
                    # Filter: all words meaningful, no stopwords
                    if (len(words) == 3 and
                        all(len(w) >= 3 for w in words) and
                        all(w not in self.stop_words for w in words) and
                        all(w.isalpha() for w in words) and
                        not any(char.isdigit() for char in phrase_lower)):
                        phrases.append(phrase_lower)
                
                if phrases:
                    # Remove duplicates while preserving order
                    seen = set()
                    unique_phrases = []
                    for phrase in phrases:
                        if phrase not in seen:
                            seen.add(phrase)
                            unique_phrases.append(phrase)
                    return unique_phrases[:200]
            except Exception as e:
                print(f"YAKE phrase extraction error: {e}")
        
        # Try RAKE as fallback
        if RAKE_AVAILABLE and NLTK_AVAILABLE:
            try:
                r = Rake(min_length=2, max_length=3)  # 2-3 word phrases
                r.extract_keywords_from_text(combined)
                rake_phrases = r.get_ranked_phrases()
                
                for phrase in rake_phrases:
                    phrase_lower = phrase.lower().strip()
                    words = phrase_lower.split()
                    if (2 <= len(words) <= 3 and
                        all(len(w) >= 3 for w in words) and
                        all(w not in self.stop_words for w in words) and
                        all(w.isalpha() for w in words) and
                        not any(char.isdigit() for char in phrase_lower)):
                        phrases.append(phrase_lower)
                
                if phrases:
                    seen = set()
                    unique_phrases = []
                    for phrase in phrases:
                        if phrase not in seen:
                            seen.add(phrase)
                            unique_phrases.append(phrase)
                    return unique_phrases[:200]
            except Exception as e:
                print(f"RAKE phrase extraction error: {e}")
        
        # Fallback: NLTK-based extraction
        if NLTK_AVAILABLE:
            try:
                tokens = word_tokenize(combined.lower())
                tagged = pos_tag(tokens)
                
                # Extract 2-word phrases (bigrams)
                for i in range(len(tagged) - 1):
                    word1, pos1 = tagged[i]
                    word2, pos2 = tagged[i + 1]
                    
                    if (len(word1) >= 3 and len(word2) >= 3 and
                        word1.isalpha() and word2.isalpha() and
                        word1 not in self.stop_words and word2 not in self.stop_words and
                        not any(char.isdigit() for char in word1 + word2)):
                        if pos1.startswith('NN') or pos1.startswith('JJ'):
                            phrase = f"{word1} {word2}"
                            phrases.append(phrase)
                
                # Extract 3-word phrases (trigrams)
                for i in range(len(tagged) - 2):
                    word1, pos1 = tagged[i]
                    word2, pos2 = tagged[i + 1]
                    word3, pos3 = tagged[i + 2]
                    
                    if (all(len(w) >= 3 for w in [word1, word2, word3]) and
                        all(w.isalpha() for w in [word1, word2, word3]) and
                        all(w not in self.stop_words for w in [word1, word2, word3]) and
                        not any(char.isdigit() for char in word1 + word2 + word3)):
                        if pos1.startswith('NN') or pos1.startswith('JJ'):
                            phrase = f"{word1} {word2} {word3}"
                            phrases.append(phrase)
                
                phrase_counts = Counter(phrases)
                return [phrase for phrase, count in phrase_counts.most_common(200)]
            except Exception as e:
                print(f"NLTK phrase extraction error: {e}")
        
        # Final fallback: basic phrase extraction
        words = re.findall(r'\b[a-z]{3,}\b', combined.lower())
        filtered = [w for w in words 
                   if w not in self.stop_words and 
                   len(w) >= 3 and 
                   w.isalpha() and
                   not any(char.isdigit() for char in w)]
        
        phrases = []
        # 2-word phrases
        for i in range(len(filtered) - 1):
            if len(filtered[i]) >= 3 and len(filtered[i+1]) >= 3:
                phrases.append(f"{filtered[i]} {filtered[i+1]}")
        
        # 3-word phrases
        for i in range(len(filtered) - 2):
            if all(len(w) >= 3 for w in filtered[i:i+3]):
                phrases.append(f"{filtered[i]} {filtered[i+1]} {filtered[i+2]}")
        
        phrase_counts = Counter(phrases)
        return [phrase for phrase, count in phrase_counts.most_common(200)]
    
    def _aggregate_competitor_keywords(self, competitor_keywords: Dict) -> Dict:
        """Aggregate keywords from all competitors."""
        all_keywords = []
        all_phrases = []
        keyword_frequencies = defaultdict(int)
        phrase_frequencies = defaultdict(int)
        
        for url, data in competitor_keywords.items():
            if data:
                all_keywords.extend(data.get('keywords', []))
                all_phrases.extend(data.get('phrases', []))
                
                for kw, freq in data.get('keyword_frequency', {}).items():
                    keyword_frequencies[kw] += freq
                
                for phrase in data.get('phrases', []):
                    phrase_frequencies[phrase] += 1
        
        # Get most common
        keyword_counts = Counter(all_keywords)
        phrase_counts = Counter(all_phrases)
        
        return {
            'keywords': [kw for kw, count in keyword_counts.most_common(200)],
            'phrases': [phrase for phrase, count in phrase_counts.most_common(200)],
            'keyword_frequency': dict(keyword_frequencies),
            'phrase_frequency': dict(phrase_frequencies),
            'total_keywords': len(set(all_keywords)),
            'total_phrases': len(set(all_phrases))
        }
    
    def _find_content_gaps(self, your_keywords: Dict, competitor_keywords: Dict) -> Dict:
        """Find keywords competitors have that you don't."""
        your_kw_set = set(your_keywords.get('keywords', []))
        your_phrases_set = set(your_keywords.get('phrases', []))
        
        competitor_kw_set = set(competitor_keywords.get('keywords', []))
        competitor_phrases_set = set(competitor_keywords.get('phrases', []))
        
        # Missing keywords
        missing_keywords = list(competitor_kw_set - your_kw_set)
        missing_keywords_with_freq = [
            {
                'keyword': kw,
                'frequency': competitor_keywords.get('keyword_frequency', {}).get(kw, 0),
                'opportunity_score': competitor_keywords.get('keyword_frequency', {}).get(kw, 0) * 10
            }
            for kw in missing_keywords
        ]
        missing_keywords_with_freq.sort(key=lambda x: x['opportunity_score'], reverse=True)
        
        # Missing phrases
        missing_phrases = list(competitor_phrases_set - your_phrases_set)
        missing_phrases_with_freq = [
            {
                'phrase': phrase,
                'frequency': competitor_keywords.get('phrase_frequency', {}).get(phrase, 0),
                'opportunity_score': competitor_keywords.get('phrase_frequency', {}).get(phrase, 0) * 10
            }
            for phrase in missing_phrases
        ]
        missing_phrases_with_freq.sort(key=lambda x: x['opportunity_score'], reverse=True)
        
        return {
            'missing_keywords': missing_keywords_with_freq[:100],
            'missing_phrases': missing_phrases_with_freq[:100],
            'your_unique_keywords': list(your_kw_set - competitor_kw_set)[:50],
            'common_keywords': list(your_kw_set & competitor_kw_set)[:50]
        }
    
    def _identify_topic_clusters(self, competitor_keywords: Dict, your_keywords: Dict) -> List[Dict]:
        """Identify topic clusters using semantic similarity."""
        # Group related keywords by common words
        all_keywords = competitor_keywords.get('keywords', []) + your_keywords.get('keywords', [])
        
        clusters = defaultdict(list)
        
        for keyword in all_keywords:
            # Find cluster based on root word
            words = keyword.split()
            if words:
                root = words[0]  # Use first word as cluster identifier
                clusters[root].append(keyword)
        
        # Filter and format clusters
        topic_clusters = []
        for root, keywords in clusters.items():
            if len(keywords) >= 3:  # At least 3 related keywords
                topic_clusters.append({
                    'topic': root,
                    'keywords': keywords[:20],  # Top 20 per cluster
                    'keyword_count': len(keywords),
                    'relevance_score': len(keywords) * 5
                })
        
        topic_clusters.sort(key=lambda x: x['relevance_score'], reverse=True)
        return topic_clusters[:30]  # Top 30 clusters
    
    def _extract_entities(self, your_site_data: Dict, competitor_data: Dict) -> Dict:
        """Extract named entities (food items, menu names, etc.)."""
        all_entities = []
        entity_frequencies = defaultdict(int)
        
        # Extract from your site
        for page in your_site_data.get('pages', []):
            text = page.get('text_content', '')
            entities = self._extract_entities_from_text(text)
            all_entities.extend(entities)
            for entity in entities:
                entity_frequencies[entity] += 1
        
        # Extract from competitors
        for url, data in competitor_data.items():
            for page in data.get('pages', []):
                text = page.get('text_content', '')
                entities = self._extract_entities_from_text(text)
                all_entities.extend(entities)
                for entity in entities:
                    entity_frequencies[entity] += 1
        
        # Get most common entities
        entity_counts = Counter(all_entities)
        
        return {
            'all_entities': [entity for entity, count in entity_counts.most_common(100)],
            'entity_frequency': dict(entity_frequencies),
            'unique_entities': len(set(all_entities))
        }
    
    def _extract_entities_from_text(self, text: str) -> List[str]:
        """Extract entities from text using NLP."""
        entities = []
        
        if SPACY_AVAILABLE and nlp:
            try:
                doc = nlp(text[:10000])  # Limit text length
                for ent in doc.ents:
                    if ent.label_ in ['PERSON', 'ORG', 'PRODUCT', 'EVENT', 'WORK_OF_ART']:
                        if len(ent.text) > 3:
                            entities.append(ent.text.lower())
            except Exception as e:
                print(f"spaCy entity extraction error: {e}")
        
        elif NLTK_AVAILABLE:
            try:
                tokens = word_tokenize(text)
                tagged = pos_tag(tokens)
                chunks = ne_chunk(tagged)
                
                for chunk in chunks:
                    if hasattr(chunk, 'label'):
                        entity_text = ' '.join([token for token, pos in chunk.leaves()])
                        if len(entity_text) > 3:
                            entities.append(entity_text.lower())
            except Exception as e:
                print(f"NLTK entity extraction error: {e}")
        
        # Fallback: extract capitalized phrases
        capitalized = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        entities.extend([cap.lower() for cap in capitalized if len(cap) > 3])
        
        return list(set(entities))
    
    def _extract_faq_patterns(self, your_site_data: Dict, competitor_data: Dict) -> List[Dict]:
        """Extract FAQ patterns (questions people ask)."""
        faq_patterns = []
        
        # Common question words
        question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are']
        
        # Extract from all pages
        all_pages = your_site_data.get('pages', [])
        for url, data in competitor_data.items():
            all_pages.extend(data.get('pages', []))
        
        for page in all_pages:
            text = page.get('text_content', '')
            sentences = sent_tokenize(text) if NLTK_AVAILABLE else text.split('.')
            
            for sentence in sentences:
                sentence_lower = sentence.lower().strip()
                # Check if sentence is a question
                if any(sentence_lower.startswith(qw) for qw in question_words) or '?' in sentence:
                    # Extract question
                    question = sentence.strip()
                    if len(question) > 10 and len(question) < 200:
                        faq_patterns.append({
                            'question': question,
                            'source': page.get('url', ''),
                            'type': self._classify_question_type(question)
                        })
        
        # Remove duplicates
        seen = set()
        unique_faqs = []
        for faq in faq_patterns:
            q = faq['question'].lower()
            if q not in seen:
                seen.add(q)
                unique_faqs.append(faq)
        
        return unique_faqs[:50]  # Top 50 FAQs
    
    def _classify_question_type(self, question: str) -> str:
        """Classify question type."""
        q_lower = question.lower()
        if any(word in q_lower for word in ['what', 'which']):
            return 'definition'
        elif 'how' in q_lower:
            return 'process'
        elif 'why' in q_lower:
            return 'reason'
        elif 'when' in q_lower:
            return 'time'
        elif 'where' in q_lower:
            return 'location'
        elif 'who' in q_lower:
            return 'person'
        else:
            return 'general'
    
    def _generate_keyword_opportunities(self, your_keywords: Dict, 
                                       competitor_keywords: Dict,
                                       content_gaps: Dict) -> List[Dict]:
        """Generate keyword opportunities with scoring."""
        opportunities = []
        
        # High-value missing keywords
        for gap in content_gaps.get('missing_keywords', [])[:50]:
            opportunities.append({
                'keyword': gap['keyword'],
                'type': 'single',
                'opportunity_score': gap['opportunity_score'],
                'competitor_frequency': gap['frequency'],
                'recommendation': f"Create content targeting '{gap['keyword']}'"
            })
        
        # High-value missing phrases
        for gap in content_gaps.get('missing_phrases', [])[:50]:
            opportunities.append({
                'keyword': gap['phrase'],
                'type': 'phrase',
                'opportunity_score': gap['opportunity_score'],
                'competitor_frequency': gap['frequency'],
                'recommendation': f"Create content targeting '{gap['phrase']}'"
            })
        
        # Sort by opportunity score
        opportunities.sort(key=lambda x: x['opportunity_score'], reverse=True)
        
        return opportunities[:100]  # Top 100 opportunities
    
    def _analyze_keyword_difficulty(self, your_keywords: Dict, competitor_keywords: Dict, 
                                    competitors: List[str]) -> Dict:
        """Analyze keyword difficulty based on competition."""
        difficulty_scores = {}
        your_kw_set = set(your_keywords.get('keywords', []))
    
        # Get all competitor keywords
        all_comp_keywords = set()
        if isinstance(competitor_keywords, dict):
            for url, kw_data in competitor_keywords.items():
                if isinstance(kw_data, dict):
                    all_comp_keywords.update(kw_data.get('keywords', []))
        
        # Analyze each keyword
        for keyword in list(your_kw_set)[:200] + list(all_comp_keywords)[:200]:
            if not keyword or len(keyword) < 3:
                continue
            
            # Count how many competitors use this keyword
            competitor_count = 0
            total_frequency = 0
            
            if isinstance(competitor_keywords, dict):
                for url, kw_data in competitor_keywords.items():
                    if isinstance(kw_data, dict):
                        kw_freq = kw_data.get('keyword_frequency', {})
                        if keyword in kw_freq:
                            competitor_count += 1
                            total_frequency += kw_freq[keyword]
            
            # Calculate difficulty (0-100)
            # More competitors = higher difficulty
            difficulty = min(100, (competitor_count / len(competitors)) * 100 if competitors else 0)
            
            # Adjust based on frequency (high frequency = more competitive)
            if total_frequency > 50:
                difficulty = min(100, difficulty + 20)
            elif total_frequency > 20:
                difficulty = min(100, difficulty + 10)
            
            # Adjust based on keyword length (shorter = more competitive)
            if len(keyword.split()) == 1:
                difficulty = min(100, difficulty + 15)
            elif len(keyword.split()) == 2:
                difficulty = min(100, difficulty + 5)
            
            difficulty_scores[keyword] = {
                'difficulty': round(difficulty, 1),
                'competitor_count': competitor_count,
                'total_frequency': total_frequency,
                'difficulty_level': 'Easy' if difficulty < 30 else 'Medium' if difficulty < 70 else 'Hard'
            }
        
        # Sort by difficulty
        sorted_difficulty = sorted(
            difficulty_scores.items(),
            key=lambda x: x[1]['difficulty'],
            reverse=True
        )
        
        return {
            'easy_keywords': [{'keyword': k, **v} for k, v in sorted_difficulty if v['difficulty'] < 30][:50],
            'medium_keywords': [{'keyword': k, **v} for k, v in sorted_difficulty if 30 <= v['difficulty'] < 70][:50],
            'hard_keywords': [{'keyword': k, **v} for k, v in sorted_difficulty if v['difficulty'] >= 70][:50],
            'all_difficulties': {k: v for k, v in difficulty_scores.items()}
        }

    def _classify_keyword_intent(self, competitor_keywords: Dict, your_keywords: Dict) -> Dict:
        """Classify keywords by search intent."""
        intent_keywords = {
            'informational': [],
            'transactional': [],
            'navigational': [],
            'commercial': []
        }
        
        # Intent indicators
        informational_indicators = ['what', 'how', 'why', 'when', 'where', 'guide', 'tutorial', 
                                   'learn', 'tips', 'best', 'top', 'list', 'review', 'compare']
        transactional_indicators = ['buy', 'purchase', 'order', 'price', 'cost', 'cheap', 
                                    'discount', 'deal', 'sale', 'shop', 'store']
        navigational_indicators = ['login', 'sign in', 'account', 'dashboard', 'profile']
        commercial_indicators = ['vs', 'comparison', 'alternative', 'better', 'best', 'review']
        
        all_keywords = set()
        # competitor_keywords is a dict where keys are URLs and values are keyword data
        if isinstance(competitor_keywords, dict):
            # Check if it's the aggregated format (has 'keywords' key) or per-competitor format
            if 'keywords' in competitor_keywords:
                # Aggregated format
                all_keywords.update(competitor_keywords.get('keywords', []))
            else:
                # Per-competitor format - aggregate all keywords
                for url, kw_data in competitor_keywords.items():
                    if isinstance(kw_data, dict):
                        all_keywords.update(kw_data.get('keywords', []))
        all_keywords.update(your_keywords.get('keywords', []))
    
        for keyword in all_keywords:
            keyword_lower = keyword.lower()
            intent = 'informational'  # Default
            
            # Check for transactional intent
            if any(indicator in keyword_lower for indicator in transactional_indicators):
                intent = 'transactional'
            # Check for navigational intent
            elif any(indicator in keyword_lower for indicator in navigational_indicators):
                intent = 'navigational'
            # Check for commercial intent
            elif any(indicator in keyword_lower for indicator in commercial_indicators):
                intent = 'commercial'
            # Check for informational intent
            elif any(indicator in keyword_lower for indicator in informational_indicators):
                intent = 'informational'
            
            intent_keywords[intent].append({
                'keyword': keyword,
                'intent': intent,
                'confidence': 'high' if any(indicator in keyword_lower for indicator in 
                                          (informational_indicators + transactional_indicators + 
                                           navigational_indicators + commercial_indicators)) else 'medium'
            })
        
        # Limit to top 50 per intent
        for intent_type in intent_keywords:
            intent_keywords[intent_type] = intent_keywords[intent_type][:50]
        
        return intent_keywords

    def _discover_long_tail_keywords(self, competitor_data: Dict, your_site_data: Dict) -> Dict:
        """Discover long-tail keywords (4+ words)."""
        long_tail = []
        
        # Extract from competitor content
        for url, data in competitor_data.items():
            for page in data.get('pages', []):
                text = page.get('text_content', '')
                if text:
                    try:
                        if NLTK_AVAILABLE:
                            sentences = sent_tokenize(text)
                        else:
                            sentences = [s.strip() for s in text.split('.') if s.strip()]
                    except:
                        sentences = [s.strip() for s in text.split('.') if s.strip()]
                    
                    try:
                        for sentence in sentences[:20]:  # Limit processing
                            try:
                                if NLTK_AVAILABLE:
                                    words = word_tokenize(sentence.lower())
                                else:
                                    words = sentence.lower().split()
                            except:
                                words = sentence.lower().split()
                            
                            # Filter out stopwords and short words
                            words = [w for w in words if w not in self.stop_words and len(w) > 2]
                            
                            # Find 4-6 word phrases
                            for i in range(len(words) - 3):
                                phrase = ' '.join(words[i:i+4])
                                if len(phrase) > 20 and phrase not in self.stop_words:
                                    long_tail.append(phrase)
                            for i in range(len(words) - 4):
                                phrase = ' '.join(words[i:i+5])
                                if len(phrase) > 25 and phrase not in self.stop_words:
                                    long_tail.append(phrase)
                    except Exception:
                        pass
        
        # Count frequencies
        long_tail_freq = Counter(long_tail)
        
        # Filter and sort
        filtered_long_tail = [
            {'keyword': kw, 'frequency': freq}
            for kw, freq in long_tail_freq.most_common(100)
            if freq >= 2 and len(kw.split()) >= 4
        ]
        
        return {
            'keywords': filtered_long_tail,
            'total_count': len(filtered_long_tail)
        }

    def _extract_lsi_keywords(self, competitor_keywords: Dict, your_keywords: Dict) -> Dict:
        """Extract LSI (Latent Semantic Indexing) keywords - semantically related terms."""
        lsi_keywords = []
        
        # Get top keywords - handle both aggregated and per-competitor formats
        if isinstance(competitor_keywords, dict) and 'keyword_frequency' in competitor_keywords:
            # Aggregated format
            comp_freq = competitor_keywords.get('keyword_frequency', {})
        else:
            # Per-competitor format - aggregate frequencies
            comp_freq = {}
            for url, kw_data in competitor_keywords.items():
                if isinstance(kw_data, dict):
                    kw_freq = kw_data.get('keyword_frequency', {})
                    for kw, freq in kw_freq.items():
                        comp_freq[kw] = comp_freq.get(kw, 0) + freq
        
        your_freq = your_keywords.get('keyword_frequency', {})
    
        # Combine and get top keywords
        all_freq = {**comp_freq, **your_freq}
        top_kw_list = sorted(all_freq.items(), key=lambda x: x[1], reverse=True)[:50]
    
        # Find semantically related keywords
        for main_keyword, _ in top_kw_list:
            related = []
            main_words = set(main_keyword.lower().split())
            
            # Find keywords that share words with main keyword
            for other_keyword, freq in all_freq.items():
                if other_keyword == main_keyword:
                    continue
                
                other_words = set(other_keyword.lower().split())
                # Calculate similarity (Jaccard similarity)
                if main_words and other_words:
                    similarity = len(main_words & other_words) / len(main_words | other_words)
                    if similarity > 0.3:  # At least 30% word overlap
                        related.append({
                            'keyword': other_keyword,
                            'similarity': round(similarity * 100, 1),
                            'frequency': freq
                        })
            
            if related:
                related.sort(key=lambda x: x['similarity'], reverse=True)
                lsi_keywords.append({
                    'main_keyword': main_keyword,
                    'related_keywords': related[:10]
                })
        
        return {
            'keyword_groups': lsi_keywords[:30],
            'keywords': [item['main_keyword'] for item in lsi_keywords]
        }

    def _find_keyword_variations(self, competitor_keywords: Dict, your_keywords: Dict) -> Dict:
        """Find keyword variations and synonyms."""
        variations = []
        
        all_keywords = set()
        # Handle both aggregated and per-competitor formats
        if isinstance(competitor_keywords, dict):
            if 'keywords' in competitor_keywords:
                # Aggregated format
                all_keywords.update(competitor_keywords.get('keywords', []))
            else:
                # Per-competitor format
                for url, kw_data in competitor_keywords.items():
                    if isinstance(kw_data, dict):
                        all_keywords.update(kw_data.get('keywords', []))
        all_keywords.update(your_keywords.get('keywords', []))
    
        keyword_list = list(all_keywords)
    
        # Find variations (plural/singular, different word order, etc.)
        for i, keyword1 in enumerate(keyword_list[:100]):
            kw1_words = keyword1.lower().split()
            variations_for_kw = []
            
            for keyword2 in keyword_list[i+1:200]:
                kw2_words = keyword2.lower().split()
                
                # Check if they're variations (same words, different order or form)
                if set(kw1_words) == set(kw2_words) and keyword1 != keyword2:
                    variations_for_kw.append(keyword2)
                # Check for plural/singular variations
                elif len(kw1_words) == len(kw2_words) == 1:
                    if (kw1_words[0] + 's' == kw2_words[0] or 
                        kw2_words[0] + 's' == kw1_words[0] or
                        kw1_words[0] + 'es' == kw2_words[0] or
                        kw2_words[0] + 'es' == kw1_words[0]):
                        variations_for_kw.append(keyword2)
            
            if variations_for_kw:
                variations.append({
                    'base_keyword': keyword1,
                    'variations': variations_for_kw[:5]
                })
        
        return {
            'variations': variations[:50],
            'total_variations': len(variations)
        }

    def _map_keywords_to_pages(self, your_site_data: Dict, competitor_data: Dict) -> Dict:
        """Map keywords to specific pages."""
        keyword_page_map = defaultdict(list)
        
        # Map your site keywords
        for page in your_site_data.get('pages', []):
            page_url = page.get('url', '')
            page_title = page.get('title', '')
            
            # Extract keywords from page
            text = ' '.join([
                page.get('title', ''),
                page.get('meta_description', ''),
                ' '.join(page.get('h1_tags', [])),
                ' '.join(page.get('h2_tags', []))
            ]).lower()
            
            if text:
                try:
                    if NLTK_AVAILABLE:
                        words = word_tokenize(text)
                    else:
                        words = text.split()
                except:
                    words = text.split()
                keywords = [w for w in words if w not in self.stop_words and len(w) > 3]
                
                # Get unique keywords and limit to top 10
                unique_keywords = list(set(keywords))[:10]
                for keyword in unique_keywords:
                    keyword_page_map[keyword].append({
                        'url': page_url,
                        'title': page_title,
                        'site': 'yours'
                    })
        
        # Map competitor keywords
        for url, data in competitor_data.items():
            domain = data.get('domain', '')
            for page in data.get('pages', []):
                page_url = page.get('url', '')
                page_title = page.get('title', '')
                
                text = ' '.join([
                    page.get('title', ''),
                    page.get('meta_description', ''),
                    ' '.join(page.get('h1_tags', [])),
                    ' '.join(page.get('h2_tags', []))
                ]).lower()
                
                if text:
                    try:
                        if NLTK_AVAILABLE:
                            words = word_tokenize(text)
                        else:
                            words = text.split()
                    except:
                        words = text.split()
                    keywords = [w for w in words if w not in self.stop_words and len(w) > 3]
                    
                    # Get unique keywords and limit to top 10
                    unique_keywords = list(set(keywords))[:10]
                    for keyword in unique_keywords:
                        keyword_page_map[keyword].append({
                            'url': page_url,
                            'title': page_title,
                            'site': domain
                        })
        
        # Convert to list format
        mapping_list = [
            {'keyword': kw, 'pages': pages[:10]}  # Limit to 10 pages per keyword
            for kw, pages in keyword_page_map.items()
            if len(pages) > 0
        ]
        
        return {
            'mappings': mapping_list[:100],  # Top 100 keyword mappings
            'total_mappings': len(mapping_list)
        }

    def _analyze_keyword_density(self, your_site_data: Dict, competitor_data: Dict) -> Dict:
        """Analyze keyword density across pages."""
        # Use global NLTK_AVAILABLE flag - word_tokenize is imported at module level
        density_analysis = {}
    
        # Analyze your site
        your_densities = {}
        for page in your_site_data.get('pages', []):
            text = page.get('text_content', '').lower()
            if text:
                try:
                    if NLTK_AVAILABLE:
                        words = word_tokenize(text)
                    else:
                        words = text.split()
                except:
                    words = text.split()
                word_count = len([w for w in words if w not in self.stop_words])
                
                if word_count > 0:
                    word_freq = Counter([w for w in words if w not in self.stop_words and len(w) > 3])
                    for word, count in word_freq.most_common(10):
                        density = (count / word_count) * 100
                        if word not in your_densities:
                            your_densities[word] = []
                        your_densities[word].append({
                            'page': page.get('url', ''),
                            'density': round(density, 2),
                            'count': count
                        })
    
        # Analyze competitors
        comp_densities = {}
        for url, data in competitor_data.items():
            for page in data.get('pages', []):
                text = page.get('text_content', '').lower()
                if text:
                    try:
                        if NLTK_AVAILABLE:
                            words = word_tokenize(text)
                        else:
                            words = text.split()
                    except:
                        words = text.split()
                    word_count = len([w for w in words if w not in self.stop_words])
                    
                    if word_count > 0:
                        word_freq = Counter([w for w in words if w not in self.stop_words and len(w) > 3])
                        for word, count in word_freq.most_common(10):
                            density = (count / word_count) * 100
                            if word not in comp_densities:
                                comp_densities[word] = []
                            comp_densities[word].append({
                                'page': page.get('url', ''),
                                'density': round(density, 2),
                                'count': count
                            })
    
        # Combine and analyze
        all_keywords = set(list(your_densities.keys()) + list(comp_densities.keys()))
    
        for keyword in list(all_keywords)[:50]:
            your_density_list = your_densities.get(keyword, [])
            comp_density_list = comp_densities.get(keyword, [])
            your_avg = sum([d['density'] for d in your_density_list]) / len(your_density_list) if your_density_list else 0
            comp_avg = sum([d['density'] for d in comp_density_list]) / len(comp_density_list) if comp_density_list else 0
            
            density_analysis[keyword] = {
                'your_avg_density': round(your_avg, 2),
                'competitor_avg_density': round(comp_avg, 2),
                'difference': round(comp_avg - your_avg, 2),
                'recommendation': 'Increase density' if comp_avg > your_avg * 1.5 else 'Maintain current density'
            }
        
        return density_analysis

    def _identify_serp_opportunities(self, competitor_keywords: Dict, your_keywords: Dict, 
                                     faq_patterns: List[Dict]) -> Dict:
        """Identify SERP feature opportunities (featured snippets, etc.)."""
        opportunities = {
            'featured_snippet': [],
            'people_also_ask': [],
            'related_searches': []
        }
        
        # Featured snippet opportunities (based on FAQ patterns and structured content)
        if faq_patterns:
            for faq in faq_patterns[:20]:
                if faq and isinstance(faq, dict) and faq.get('type') == 'question':
                    opportunities['featured_snippet'].append({
                        'keyword': faq.get('question', ''),
                        'type': 'question',
                        'opportunity': 'Create content answering this question',
                        'competitor_has': True
                    })
        
        # People Also Ask opportunities (related questions)
        # Handle both aggregated and per-competitor formats
        comp_keywords_list = []
        if isinstance(competitor_keywords, dict):
            if 'keywords' in competitor_keywords:
                # Aggregated format
                comp_keywords_list = competitor_keywords.get('keywords', [])
            else:
                # Per-competitor format
                for url, kw_data in competitor_keywords.items():
                    if isinstance(kw_data, dict):
                        comp_keywords_list.extend(kw_data.get('keywords', []))
        
        question_keywords = [kw for kw in comp_keywords_list 
                           if '?' in kw or any(q in kw.lower() for q in ['what', 'how', 'why', 'when', 'where'])]
        
        for qkw in question_keywords[:20]:
            if qkw not in your_keywords.get('keywords', []):
                opportunities['people_also_ask'].append({
                    'keyword': qkw,
                    'opportunity': 'Create content addressing this question',
                    'competitor_has': True
                })
        
        # Related searches (LSI keywords)
        try:
            lsi_data = self._extract_lsi_keywords(competitor_keywords, your_keywords)
            if lsi_data and isinstance(lsi_data, dict):
                for group in lsi_data.get('keyword_groups', [])[:10]:
                    if group and isinstance(group, dict) and group.get('main_keyword'):
                        opportunities['related_searches'].append({
                            'main_keyword': group['main_keyword'],
                            'related': [r['keyword'] for r in group.get('related_keywords', [])[:5] if r and isinstance(r, dict) and r.get('keyword')],
                            'opportunity': 'Create comprehensive content covering these related terms'
                        })
        except Exception as e:
            print(f"Error extracting LSI keywords: {e}")
        
        return opportunities

    def _generate_content_suggestions(self, opportunities: List[Dict], content_gaps: Dict,
                                     topic_clusters: List[Dict], keyword_intent: Dict) -> List[Dict]:
        """Generate content suggestions based on analysis."""
        suggestions = []
    
        # Based on high-opportunity keywords
        if opportunities:
            for opp in opportunities[:20]:
                if opp and isinstance(opp, dict) and opp.get('opportunity_score', 0) > 50 and opp.get('keyword'):
                    suggestions.append({
                        'title': f"Guide: {opp['keyword']}",
                        'type': 'blog_post',
                        'priority': 'high',
                        'keywords': [opp['keyword']],
                        'suggestion': f"Create comprehensive content about '{opp['keyword']}' to capture this high-opportunity keyword",
                        'estimated_value': 'High'
                    })
        
        # Based on topic clusters
        if topic_clusters:
            for cluster in topic_clusters[:10]:
                if cluster and isinstance(cluster, dict):
                    suggestions.append({
                        'title': f"Complete Guide: {cluster.get('topic', 'Unknown')}",
                        'type': 'pillar_content',
                        'priority': 'medium',
                        'keywords': cluster.get('keywords', [])[:10],
                        'suggestion': f"Create pillar content covering '{cluster.get('topic', 'Unknown')}' and related keywords",
                        'estimated_value': 'Medium'
                    })
        
        # Based on content gaps
        if content_gaps:
            for gap in content_gaps.get('missing_keywords', [])[:15]:
                if gap and isinstance(gap, dict) and gap.get('keyword'):
                    suggestions.append({
                        'title': f"Content: {gap['keyword']}",
                        'type': 'targeted_page',
                        'priority': 'high',
                        'keywords': [gap['keyword']],
                        'suggestion': f"Create a page targeting '{gap['keyword']}' that competitors are using",
                        'estimated_value': 'High'
                    })
        
        # Based on transactional intent keywords
        if keyword_intent:
            for trans_kw in keyword_intent.get('transactional', [])[:10]:
                if trans_kw and isinstance(trans_kw, dict) and trans_kw.get('keyword'):
                    suggestions.append({
                        'title': f"Product/Service Page: {trans_kw['keyword']}",
                        'type': 'landing_page',
                        'priority': 'high',
                        'keywords': [trans_kw['keyword']],
                        'suggestion': f"Create a landing page optimized for '{trans_kw['keyword']}' to capture transactional searches",
                        'estimated_value': 'High'
                    })
        
        return suggestions[:30]  # Top 30 suggestions

