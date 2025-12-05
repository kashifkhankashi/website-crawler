"""
Enhanced Competitor Analyzer - Deep, comprehensive competitor analysis
with domain-level insights, content gaps, keyword opportunities, and more.
"""
from typing import Dict, List, Optional, Tuple, Set
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import re
from collections import Counter, defaultdict
from datetime import datetime
import json

# Import existing analyzer
try:
    from advanced_competitor_analyzer import AdvancedCompetitorAnalyzer
    ADVANCED_AVAILABLE = True
except ImportError:
    ADVANCED_AVAILABLE = False
    AdvancedCompetitorAnalyzer = None


class EnhancedCompetitorAnalyzer:
    """
    Enhanced competitor analysis with:
    - Domain-level analysis (multiple pages)
    - Content gap analysis
    - Keyword opportunity scoring
    - Internal linking structure comparison
    - Content freshness analysis
    - Social signals comparison
    - Competitive advantage matrix
    - Prioritized action plan
    """
    
    def __init__(self, pagespeed_api_key: Optional[str] = None):
        self.timeout = 30
        self.max_pages_per_domain = 10  # Limit for domain analysis
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Initialize base analyzer
        if ADVANCED_AVAILABLE and AdvancedCompetitorAnalyzer:
            self.base_analyzer = AdvancedCompetitorAnalyzer(pagespeed_api_key)
        else:
            self.base_analyzer = None
    
    def analyze_competitors_enhanced(self, url1: str, url2: str, 
                                     analyze_domain: bool = True) -> Dict:
        """
        Perform enhanced competitor analysis.
        
        Args:
            url1: Your website URL
            url2: Competitor URL
            analyze_domain: If True, analyze multiple pages (domain-level)
            
        Returns:
            Comprehensive comparison results with enhanced features
        """
        print(f"Starting enhanced competitor analysis: {url1} vs {url2}")
        start_time = time.time()
        
        # Base analysis (single page)
        base_results = None
        if self.base_analyzer:
            try:
                base_results = self.base_analyzer.analyze_competitors(url1, url2)
            except Exception as e:
                print(f"Base analysis error: {e}")
        
        # Domain-level analysis
        domain_analysis = None
        if analyze_domain:
            try:
                domain_analysis = self._analyze_domains(url1, url2)
            except Exception as e:
                print(f"Domain analysis error: {e}")
        
        # Content gap analysis
        content_gaps = self._analyze_content_gaps(url1, url2)
        
        # Keyword opportunity analysis
        keyword_opportunities = self._analyze_keyword_opportunities(url1, url2)
        
        # Internal linking comparison
        linking_comparison = self._compare_internal_linking(url1, url2)
        
        # Content freshness analysis
        freshness_analysis = self._analyze_content_freshness(url1, url2)
        
        # Social signals comparison
        social_signals = self._compare_social_signals(url1, url2)
        
        # Competitive advantage matrix
        advantage_matrix = self._build_advantage_matrix(
            base_results, domain_analysis, content_gaps, keyword_opportunities
        )
        
        # Prioritized action plan
        action_plan = self._generate_action_plan(
            base_results, content_gaps, keyword_opportunities, 
            linking_comparison, advantage_matrix
        )
        
        analysis_time = time.time() - start_time
        
        return {
            'url1': url1,
            'url2': url2,
            'base_analysis': base_results,
            'domain_analysis': domain_analysis,
            'content_gaps': content_gaps,
            'keyword_opportunities': keyword_opportunities,
            'linking_comparison': linking_comparison,
            'freshness_analysis': freshness_analysis,
            'social_signals': social_signals,
            'advantage_matrix': advantage_matrix,
            'action_plan': action_plan,
            'analysis_time': round(analysis_time, 2),
            'analysis_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def _analyze_domains(self, url1: str, url2: str) -> Dict:
        """Analyze multiple pages from each domain."""
        print("Analyzing domains (multiple pages)...")
        
        domain1_pages = self._discover_pages(url1, max_pages=self.max_pages_per_domain)
        domain2_pages = self._discover_pages(url2, max_pages=self.max_pages_per_domain)
        
        # Analyze each page
        domain1_analyses = []
        domain2_analyses = []
        
        for page_url in domain1_pages[:5]:  # Limit to 5 for performance
            try:
                analysis = self._quick_page_analysis(page_url, "Your Site")
                domain1_analyses.append(analysis)
            except Exception as e:
                print(f"Error analyzing {page_url}: {e}")
        
        for page_url in domain2_pages[:5]:
            try:
                analysis = self._quick_page_analysis(page_url, "Competitor")
                domain2_analyses.append(analysis)
            except Exception as e:
                print(f"Error analyzing {page_url}: {e}")
        
        # Aggregate metrics
        return {
            'your_site': {
                'pages_analyzed': len(domain1_analyses),
                'avg_word_count': sum(a.get('word_count', 0) for a in domain1_analyses) / len(domain1_analyses) if domain1_analyses else 0,
                'avg_seo_score': sum(a.get('seo_score', 0) for a in domain1_analyses) / len(domain1_analyses) if domain1_analyses else 0,
                'total_internal_links': sum(a.get('internal_links_count', 0) for a in domain1_analyses),
                'total_external_links': sum(a.get('external_links_count', 0) for a in domain1_analyses),
                'pages': domain1_analyses
            },
            'competitor': {
                'pages_analyzed': len(domain2_analyses),
                'avg_word_count': sum(a.get('word_count', 0) for a in domain2_analyses) / len(domain2_analyses) if domain2_analyses else 0,
                'avg_seo_score': sum(a.get('seo_score', 0) for a in domain2_analyses) / len(domain2_analyses) if domain2_analyses else 0,
                'total_internal_links': sum(a.get('internal_links_count', 0) for a in domain2_analyses),
                'total_external_links': sum(a.get('external_links_count', 0) for a in domain2_analyses),
                'pages': domain2_analyses
            }
        }
    
    def _discover_pages(self, url: str, max_pages: int = 10) -> List[str]:
        """Discover pages from a domain by following internal links."""
        discovered = set([url])
        to_visit = [url]
        parsed_base = urlparse(url)
        base_domain = parsed_base.netloc
        
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find internal links
            for link in soup.find_all('a', href=True):
                if len(discovered) >= max_pages:
                    break
                
                href = link.get('href', '').strip()
                if not href or href.startswith('#'):
                    continue
                
                # Resolve URL
                if href.startswith('/'):
                    full_url = f"{parsed_base.scheme}://{base_domain}{href}"
                elif href.startswith('http'):
                    parsed = urlparse(href)
                    if parsed.netloc == base_domain:
                        full_url = href
                    else:
                        continue
                else:
                    full_url = urljoin(url, href)
                
                if full_url not in discovered:
                    discovered.add(full_url)
                    to_visit.append(full_url)
        
        except Exception as e:
            print(f"Error discovering pages for {url}: {e}")
        
        return list(discovered)[:max_pages]
    
    def _quick_page_analysis(self, url: str, label: str) -> Dict:
        """Quick analysis of a single page."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract basic metrics
            text = soup.get_text()
            words = text.split()
            word_count = len(words)
            
            # Count links
            links = soup.find_all('a', href=True)
            parsed = urlparse(url)
            domain = parsed.netloc
            
            internal_links = set()
            external_links = set()
            
            for link in links:
                href = link.get('href', '')
                if href.startswith('http'):
                    link_parsed = urlparse(href)
                    if link_parsed.netloc == domain:
                        internal_links.add(href)
                    else:
                        external_links.add(href)
                elif href.startswith('/'):
                    internal_links.add(href)
            
            # Basic SEO score
            title = soup.title.get_text().strip() if soup.title else ''
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            meta_desc = meta_desc.get('content', '').strip() if meta_desc else ''
            
            seo_score = 0
            if title:
                seo_score += 20
                if 30 <= len(title) <= 60:
                    seo_score += 10
            if meta_desc:
                seo_score += 15
                if 120 <= len(meta_desc) <= 160:
                    seo_score += 5
            if word_count >= 500:
                seo_score += 20
            elif word_count >= 300:
                seo_score += 10
            
            return {
                'url': url,
                'label': label,
                'word_count': word_count,
                'seo_score': min(100, seo_score),
                'internal_links_count': len(internal_links),
                'external_links_count': len(external_links),
                'title': title[:100],
                'has_meta_description': bool(meta_desc)
            }
        
        except Exception as e:
            return {
                'url': url,
                'label': label,
                'error': str(e),
                'word_count': 0,
                'seo_score': 0,
                'internal_links_count': 0,
                'external_links_count': 0
            }
    
    def _analyze_content_gaps(self, url1: str, url2: str) -> Dict:
        """Identify content topics that competitor covers but you don't."""
        print("Analyzing content gaps...")
        
        try:
            # Analyze both URLs
            topics1 = self._extract_topics(url1)
            topics2 = self._extract_topics(url2)
            
            # Find gaps
            missing_topics = topics2 - topics1
            your_unique_topics = topics1 - topics2
            common_topics = topics1 & topics2
            
            # Score opportunities (topics competitor covers that you don't)
            opportunities = []
            for topic in missing_topics:
                # Check how important this topic is for competitor
                importance = self._calculate_topic_importance(url2, topic)
                opportunities.append({
                    'topic': topic,
                    'importance': importance,
                    'opportunity_score': importance * 10  # Scale to 0-100
                })
            
            opportunities.sort(key=lambda x: x['opportunity_score'], reverse=True)
            
            return {
                'missing_topics': list(missing_topics)[:20],  # Top 20
                'your_unique_topics': list(your_unique_topics)[:20],
                'common_topics': list(common_topics)[:20],
                'opportunities': opportunities[:15],  # Top 15 opportunities
                'gap_count': len(missing_topics),
                'your_unique_count': len(your_unique_topics),
                'common_count': len(common_topics)
            }
        
        except Exception as e:
            print(f"Content gap analysis error: {e}")
            return {
                'missing_topics': [],
                'your_unique_topics': [],
                'common_topics': [],
                'opportunities': [],
                'gap_count': 0
            }
    
    def _extract_topics(self, url: str) -> Set[str]:
        """Extract main topics from a page."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get headings (main topics)
            topics = set()
            for tag in ['h1', 'h2', 'h3']:
                for heading in soup.find_all(tag):
                    text = heading.get_text(strip=True).lower()
                    if text and len(text) > 3:
                        # Extract key phrases (2-3 word phrases)
                        words = text.split()
                        if len(words) >= 2:
                            # Add 2-word phrases
                            for i in range(len(words) - 1):
                                phrase = f"{words[i]} {words[i+1]}"
                                if len(phrase) > 5:
                                    topics.add(phrase)
                        topics.add(text[:50])  # Also add full heading (truncated)
            
            # Extract from title and meta description
            title = soup.title.get_text().strip().lower() if soup.title else ''
            if title:
                words = title.split()
                if len(words) >= 2:
                    topics.add(' '.join(words[:3]))  # First 3 words
            
            return topics
        
        except Exception as e:
            print(f"Error extracting topics from {url}: {e}")
            return set()
    
    def _calculate_topic_importance(self, url: str, topic: str) -> float:
        """Calculate how important a topic is on a page (0-1)."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            text = soup.get_text().lower()
            topic_lower = topic.lower()
            
            # Count occurrences
            count = text.count(topic_lower)
            
            # Check if in headings (more important)
            in_headings = 0
            for tag in ['h1', 'h2', 'h3']:
                for heading in soup.find_all(tag):
                    if topic_lower in heading.get_text().lower():
                        in_headings += 1
            
            # Calculate importance (0-1)
            importance = min(1.0, (count * 0.1) + (in_headings * 0.3))
            
            return importance
        
        except Exception as e:
            return 0.0
    
    def _analyze_keyword_opportunities(self, url1: str, url2: str) -> Dict:
        """Find keyword opportunities (keywords competitor ranks for that you don't)."""
        print("Analyzing keyword opportunities...")
        
        try:
            keywords1 = self._extract_keywords(url1)
            keywords2 = self._extract_keywords(url2)
            
            # Find opportunities
            competitor_only = {}
            for keyword, (count, importance) in keywords2.items():
                if keyword not in keywords1:
                    competitor_only[keyword] = {
                        'count': count,
                        'importance': importance,
                        'opportunity_score': importance * count * 10  # Scale
                    }
            
            # Sort by opportunity score
            opportunities = sorted(
                competitor_only.items(),
                key=lambda x: x[1]['opportunity_score'],
                reverse=True
            )[:30]  # Top 30
            
            # Common keywords
            common_keywords = {}
            for keyword in set(keywords1.keys()) & set(keywords2.keys()):
                common_keywords[keyword] = {
                    'your_count': keywords1[keyword][0],
                    'competitor_count': keywords2[keyword][0],
                    'your_importance': keywords1[keyword][1],
                    'competitor_importance': keywords2[keyword][1]
                }
            
            return {
                'opportunities': [
                    {'keyword': k, **v} for k, v in opportunities
                ],
                'common_keywords': dict(list(common_keywords.items())[:30]),
                'opportunity_count': len(competitor_only),
                'common_count': len(common_keywords)
            }
        
        except Exception as e:
            print(f"Keyword opportunity analysis error: {e}")
            return {
                'opportunities': [],
                'common_keywords': {},
                'opportunity_count': 0,
                'common_count': 0
            }
    
    def _extract_keywords(self, url: str) -> Dict[str, Tuple[int, float]]:
        """Extract keywords with importance scores."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts
            for script in soup(["script", "style"]):
                script.decompose()
            
            text = soup.get_text().lower()
            words = re.findall(r'\b[a-z]{4,}\b', text)
            
            # Stop words
            stop_words = {
                'this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'their',
                'there', 'what', 'which', 'about', 'would', 'could', 'should', 'these',
                'those', 'them', 'they', 'were', 'where', 'when', 'than', 'then', 'more',
                'most', 'some', 'such', 'only', 'just', 'also', 'very', 'much', 'many'
            }
            
            # Count frequencies
            word_counts = Counter([w for w in words if w not in stop_words and len(w) > 3])
            total = len(words)
            
            # Calculate importance (TF approximation)
            keywords = {}
            for word, count in word_counts.items():
                if count > 1:
                    tf = count / total if total > 0 else 0
                    importance = tf * count  # Simple importance
                    keywords[word] = (count, importance)
            
            return keywords
        
        except Exception as e:
            print(f"Error extracting keywords from {url}: {e}")
            return {}
    
    def _compare_internal_linking(self, url1: str, url2: str) -> Dict:
        """Compare internal linking structures."""
        print("Comparing internal linking...")
        
        try:
            links1 = self._analyze_internal_links(url1)
            links2 = self._analyze_internal_links(url2)
            
            return {
                'your_site': links1,
                'competitor': links2,
                'comparison': {
                    'link_count_diff': links1['total_links'] - links2['total_links'],
                    'avg_links_per_page_diff': links1['avg_links_per_page'] - links2['avg_links_per_page'],
                    'max_links_page_diff': links1['max_links_page'] - links2['max_links_page']
                }
            }
        
        except Exception as e:
            print(f"Internal linking comparison error: {e}")
            return {
                'your_site': {},
                'competitor': {},
                'comparison': {}
            }
    
    def _analyze_internal_links(self, url: str) -> Dict:
        """Analyze internal linking structure."""
        try:
            pages = self._discover_pages(url, max_pages=5)
            total_links = 0
            max_links = 0
            
            for page_url in pages:
                try:
                    response = requests.get(page_url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    parsed = urlparse(url)
                    domain = parsed.netloc
                    
                    links = soup.find_all('a', href=True)
                    internal_count = 0
                    
                    for link in links:
                        href = link.get('href', '')
                        if href.startswith('http'):
                            link_parsed = urlparse(href)
                            if link_parsed.netloc == domain:
                                internal_count += 1
                        elif href.startswith('/'):
                            internal_count += 1
                    
                    total_links += internal_count
                    max_links = max(max_links, internal_count)
                
                except:
                    continue
            
            return {
                'total_links': total_links,
                'pages_analyzed': len(pages),
                'avg_links_per_page': total_links / len(pages) if pages else 0,
                'max_links_page': max_links
            }
        
        except Exception as e:
            return {
                'total_links': 0,
                'pages_analyzed': 0,
                'avg_links_per_page': 0,
                'max_links_page': 0
            }
    
    def _analyze_content_freshness(self, url1: str, url2: str) -> Dict:
        """Analyze content freshness and update frequency."""
        print("Analyzing content freshness...")
        
        try:
            freshness1 = self._check_content_freshness(url1)
            freshness2 = self._check_content_freshness(url2)
            
            return {
                'your_site': freshness1,
                'competitor': freshness2,
                'comparison': {
                    'fresher': 'your_site' if freshness1['freshness_score'] > freshness2['freshness_score'] else 'competitor',
                    'update_frequency': 'your_site' if freshness1['update_indicators'] > freshness2['update_indicators'] else 'competitor'
                }
            }
        
        except Exception as e:
            print(f"Content freshness analysis error: {e}")
            return {
                'your_site': {},
                'competitor': {},
                'comparison': {}
            }
    
    def _check_content_freshness(self, url: str) -> Dict:
        """Check content freshness indicators."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check for date indicators
            date_patterns = [
                r'\b(202[4-5]|202[0-3])\b',  # Recent years
                r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+202[4-5]',
                r'\b(updated|last\s+updated|modified|published)\b'
            ]
            
            text = soup.get_text().lower()
            update_indicators = sum(1 for pattern in date_patterns if re.search(pattern, text, re.I))
            
            # Check meta tags for dates
            meta_date = soup.find('meta', attrs={'property': 'article:published_time'})
            has_meta_date = bool(meta_date)
            
            # Check for "new" or "recent" indicators
            freshness_keywords = ['new', 'recent', 'latest', 'updated', 'just added', 'now available']
            freshness_count = sum(1 for keyword in freshness_keywords if keyword in text)
            
            freshness_score = min(100, (update_indicators * 20) + (has_meta_date * 30) + (freshness_count * 5))
            
            return {
                'freshness_score': freshness_score,
                'update_indicators': update_indicators,
                'has_meta_date': has_meta_date,
                'freshness_keywords': freshness_count
            }
        
        except Exception as e:
            return {
                'freshness_score': 0,
                'update_indicators': 0,
                'has_meta_date': False,
                'freshness_keywords': 0
            }
    
    def _compare_social_signals(self, url1: str, url2: str) -> Dict:
        """Compare social media presence and signals."""
        print("Comparing social signals...")
        
        try:
            signals1 = self._extract_social_signals(url1)
            signals2 = self._extract_social_signals(url2)
            
            return {
                'your_site': signals1,
                'competitor': signals2,
                'comparison': {
                    'more_social': 'your_site' if signals1['social_score'] > signals2['social_score'] else 'competitor',
                    'platforms_diff': signals1['platform_count'] - signals2['platform_count']
                }
            }
        
        except Exception as e:
            print(f"Social signals comparison error: {e}")
            return {
                'your_site': {},
                'competitor': {},
                'comparison': {}
            }
    
    def _extract_social_signals(self, url: str) -> Dict:
        """Extract social media signals from a page."""
        try:
            response = requests.get(url, timeout=self.timeout, headers=self.headers, allow_redirects=True)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check for social links
            social_platforms = {
                'facebook': bool(soup.find('a', href=re.compile(r'facebook\.com|fb\.com'))),
                'twitter': bool(soup.find('a', href=re.compile(r'twitter\.com|x\.com'))),
                'linkedin': bool(soup.find('a', href=re.compile(r'linkedin\.com'))),
                'instagram': bool(soup.find('a', href=re.compile(r'instagram\.com'))),
                'youtube': bool(soup.find('a', href=re.compile(r'youtube\.com'))),
                'pinterest': bool(soup.find('a', href=re.compile(r'pinterest\.com'))),
            }
            
            platform_count = sum(social_platforms.values())
            
            # Check for Open Graph tags (social sharing)
            og_tags = len(soup.find_all('meta', property=re.compile(r'^og:')))
            twitter_tags = len(soup.find_all('meta', attrs={'name': re.compile(r'^twitter:')}))
            
            social_score = (platform_count * 15) + (og_tags * 2) + (twitter_tags * 2)
            
            return {
                'social_platforms': social_platforms,
                'platform_count': platform_count,
                'og_tags': og_tags,
                'twitter_tags': twitter_tags,
                'social_score': min(100, social_score)
            }
        
        except Exception as e:
            return {
                'social_platforms': {},
                'platform_count': 0,
                'og_tags': 0,
                'twitter_tags': 0,
                'social_score': 0
            }
    
    def _build_advantage_matrix(self, base_results: Optional[Dict], 
                                 domain_analysis: Optional[Dict],
                                 content_gaps: Dict,
                                 keyword_opportunities: Dict) -> Dict:
        """Build competitive advantage matrix."""
        matrix = {
            'categories': [],
            'your_advantages': [],
            'competitor_advantages': [],
            'opportunities': []
        }
        
        # Performance
        if base_results and base_results.get('comparison'):
            perf = base_results['comparison'].get('performance', {})
            if perf.get('load_time', {}).get('winner') == 'your_site':
                matrix['your_advantages'].append('Performance')
            elif perf.get('load_time', {}).get('winner') == 'competitor':
                matrix['competitor_advantages'].append('Performance')
        
        # SEO
        if base_results and base_results.get('comparison'):
            seo = base_results['comparison'].get('seo', {})
            if seo.get('seo_score', {}).get('winner') == 'your_site':
                matrix['your_advantages'].append('SEO')
            elif seo.get('seo_score', {}).get('winner') == 'competitor':
                matrix['competitor_advantages'].append('SEO')
        
        # Content gaps (opportunities)
        if content_gaps.get('gap_count', 0) > 0:
            matrix['opportunities'].append({
                'category': 'Content',
                'description': f"{content_gaps['gap_count']} topics competitor covers that you don't",
                'priority': 'high' if content_gaps['gap_count'] > 10 else 'medium'
            })
        
        # Keyword opportunities
        if keyword_opportunities.get('opportunity_count', 0) > 0:
            matrix['opportunities'].append({
                'category': 'Keywords',
                'description': f"{keyword_opportunities['opportunity_count']} keyword opportunities",
                'priority': 'high' if keyword_opportunities['opportunity_count'] > 20 else 'medium'
            })
        
        return matrix
    
    def _generate_action_plan(self, base_results: Optional[Dict],
                              content_gaps: Dict,
                              keyword_opportunities: Dict,
                              linking_comparison: Dict,
                              advantage_matrix: Dict) -> List[Dict]:
        """Generate prioritized action plan."""
        actions = []
        
        # High priority: Content gaps
        if content_gaps.get('opportunities'):
            top_opportunities = content_gaps['opportunities'][:5]
            for opp in top_opportunities:
                actions.append({
                    'priority': 'high',
                    'category': 'Content Gap',
                    'action': f"Create content about: {opp['topic']}",
                    'reason': f"Competitor covers this topic (importance: {opp['importance']:.2f})",
                    'estimated_impact': 'High',
                    'effort': 'Medium'
                })
        
        # High priority: Keyword opportunities
        if keyword_opportunities.get('opportunities'):
            top_keywords = keyword_opportunities['opportunities'][:5]
            for kw in top_keywords:
                actions.append({
                    'priority': 'high',
                    'category': 'Keyword Opportunity',
                    'action': f"Target keyword: {kw['keyword']}",
                    'reason': f"Competitor uses this keyword (score: {kw['opportunity_score']:.1f})",
                    'estimated_impact': 'High',
                    'effort': 'Low'
                })
        
        # Medium priority: Performance
        if base_results and base_results.get('comparison'):
            perf = base_results['comparison'].get('performance', {})
            if perf.get('load_time', {}).get('winner') == 'competitor':
                actions.append({
                    'priority': 'medium',
                    'category': 'Performance',
                    'action': 'Optimize page load speed',
                    'reason': 'Competitor loads faster',
                    'estimated_impact': 'High',
                    'effort': 'Medium'
                })
        
        # Medium priority: SEO
        if base_results and base_results.get('comparison'):
            seo = base_results['comparison'].get('seo', {})
            if seo.get('seo_score', {}).get('difference', 0) < -10:
                actions.append({
                    'priority': 'medium',
                    'category': 'SEO',
                    'action': 'Improve on-page SEO elements',
                    'reason': f"Competitor has {abs(seo['seo_score']['difference'])} points higher SEO score",
                    'estimated_impact': 'Medium',
                    'effort': 'Low'
                })
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        actions.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return actions[:15]  # Top 15 actions

