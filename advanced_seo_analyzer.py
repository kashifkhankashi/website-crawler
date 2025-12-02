"""
Advanced SEO Analyzer - Comprehensive on-page SEO audit
"""
from typing import Dict, List, Optional
import re
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup


class AdvancedSEOAnalyzer:
    """
    Complete on-page SEO audit including:
    - Title, meta description analysis
    - Heading structure
    - Alt tags
    - Word count
    - Spammy keyword repetition
    - Canonical tags
    - Open Graph & Twitter tags
    - Robots.txt rules
    - Sitemap.xml status
    """
    
    def __init__(self):
        self.max_title_length = 60
        self.min_title_length = 30
        self.max_desc_length = 160
        self.min_desc_length = 120
        self.spam_threshold = 0.05  # 5% repetition threshold
    
    def analyze_page(self, page_data: Dict, html_content: str = None) -> Dict:
        """
        Perform comprehensive SEO audit on a page.
        
        Args:
            page_data: Dictionary with page information (title, meta_description, etc.)
            html_content: Raw HTML content (optional, for deeper analysis)
            
        Returns:
            Dictionary with complete SEO audit results
        """
        audit = {
            'title_analysis': self._analyze_title(page_data.get('title', '')),
            'meta_description_analysis': self._analyze_meta_description(page_data.get('meta_description', '')),
            'heading_structure': self._analyze_headings(page_data),
            'alt_tags_analysis': self._analyze_alt_tags(page_data.get('images', [])),
            'word_count_analysis': self._analyze_word_count(page_data.get('word_count', 0)),
            'spam_detection': self._detect_spammy_keywords(page_data),
            'canonical_analysis': self._analyze_canonical(page_data.get('canonical_url'), page_data.get('url', '')),
            'og_tags_analysis': self._analyze_og_tags(page_data.get('og_tags', {})),
            'twitter_tags_analysis': self._analyze_twitter_tags(page_data.get('twitter_tags', {})),
            'robots_txt_status': None,  # Will be set separately
            'sitemap_status': None,  # Will be set separately
            'overall_score': 0,
            'critical_issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        # Calculate overall score
        audit['overall_score'] = self._calculate_seo_score(audit)
        
        # Collect issues
        audit['critical_issues'] = self._collect_critical_issues(audit)
        audit['warnings'] = self._collect_warnings(audit)
        audit['recommendations'] = self._collect_recommendations(audit)
        
        return audit
    
    def _analyze_title(self, title: str) -> Dict:
        """Analyze title tag."""
        analysis = {
            'title': title,
            'length': len(title),
            'is_optimal': False,
            'has_keywords': False,
            'issues': [],
            'score': 0
        }
        
        if not title or not title.strip():
            analysis['issues'].append('Missing title tag')
            return analysis
        
        # Length check
        if self.min_title_length <= analysis['length'] <= self.max_title_length:
            analysis['is_optimal'] = True
            analysis['score'] += 10
        elif analysis['length'] < self.min_title_length:
            analysis['issues'].append(f'Title too short ({analysis["length"]} chars, recommended: {self.min_title_length}-{self.max_title_length})')
        elif analysis['length'] > self.max_title_length:
            analysis['issues'].append(f'Title too long ({analysis["length"]} chars, recommended: max {self.max_title_length})')
            analysis['score'] += 5  # Partial credit
        
        # Keyword presence
        words = title.lower().split()
        if len(words) >= 3:
            analysis['has_keywords'] = True
            analysis['score'] += 5
        
        # Check for special characters
        if '|' in title or '-' in title:
            analysis['score'] += 2
        
        return analysis
    
    def _analyze_meta_description(self, description: str) -> Dict:
        """Analyze meta description."""
        analysis = {
            'description': description,
            'length': len(description),
            'is_optimal': False,
            'has_call_to_action': False,
            'issues': [],
            'score': 0
        }
        
        if not description or not description.strip():
            analysis['issues'].append('Missing meta description')
            return analysis
        
        # Length check
        if self.min_desc_length <= analysis['length'] <= self.max_desc_length:
            analysis['is_optimal'] = True
            analysis['score'] += 10
        elif analysis['length'] < self.min_desc_length:
            analysis['issues'].append(f'Meta description too short ({analysis["length"]} chars, recommended: {self.min_desc_length}-{self.max_desc_length})')
        elif analysis['length'] > self.max_desc_length:
            analysis['issues'].append(f'Meta description too long ({analysis["length"]} chars, recommended: max {self.max_desc_length})')
            analysis['score'] += 5
        
        # Call to action check
        cta_words = ['learn', 'discover', 'get', 'buy', 'shop', 'order', 'click', 'read', 'view', 'explore']
        desc_lower = description.lower()
        if any(word in desc_lower for word in cta_words):
            analysis['has_call_to_action'] = True
            analysis['score'] += 5
        
        return analysis
    
    def _analyze_headings(self, page_data: Dict) -> Dict:
        """Analyze heading structure (H1-H6)."""
        h1_tags = page_data.get('h1_tags', [])
        h2_tags = page_data.get('h2_tags', [])
        h3_tags = page_data.get('h3_tags', [])
        
        analysis = {
            'h1_count': len(h1_tags),
            'h2_count': len(h2_tags),
            'h3_count': len(h3_tags),
            'h1_tags': h1_tags,
            'h2_tags': h2_tags,
            'h3_tags': h3_tags,
            'is_valid': False,
            'issues': [],
            'score': 0
        }
        
        # H1 check
        if analysis['h1_count'] == 1:
            analysis['score'] += 10
            analysis['is_valid'] = True
        elif analysis['h1_count'] == 0:
            analysis['issues'].append('Missing H1 tag - critical for SEO')
        elif analysis['h1_count'] > 1:
            analysis['issues'].append(f'Multiple H1 tags ({analysis["h1_count"]}) - should have only one')
        
        # H2 check
        if analysis['h2_count'] >= 2:
            analysis['score'] += 5
        elif analysis['h2_count'] == 0:
            analysis['issues'].append('No H2 tags - consider adding section headings')
        
        # H3 check
        if analysis['h3_count'] > 0:
            analysis['score'] += 3
        
        # Hierarchy check
        if analysis['h1_count'] > 0 and analysis['h2_count'] > 0:
            analysis['score'] += 2
        
        return analysis
    
    def _analyze_alt_tags(self, images: List[Dict]) -> Dict:
        """Analyze image alt tags."""
        if not images:
            return {
                'total_images': 0,
                'images_with_alt': 0,
                'images_without_alt': 0,
                'alt_coverage': 100,
                'issues': [],
                'score': 10  # No images is fine
            }
        
        images_with_alt = sum(1 for img in images if img.get('alt') and img.get('alt').strip())
        images_without_alt = len(images) - images_with_alt
        alt_coverage = (images_with_alt / len(images) * 100) if images else 0
        
        analysis = {
            'total_images': len(images),
            'images_with_alt': images_with_alt,
            'images_without_alt': images_without_alt,
            'alt_coverage': round(alt_coverage, 1),
            'issues': [],
            'score': 0
        }
        
        if alt_coverage == 100:
            analysis['score'] = 10
        elif alt_coverage >= 80:
            analysis['score'] = 7
            analysis['issues'].append(f'{images_without_alt} image(s) missing alt tags')
        elif alt_coverage >= 50:
            analysis['score'] = 4
            analysis['issues'].append(f'{images_without_alt} image(s) missing alt tags - significant issue')
        else:
            analysis['score'] = 1
            analysis['issues'].append(f'{images_without_alt} image(s) missing alt tags - critical issue')
        
        return analysis
    
    def _analyze_word_count(self, word_count: int) -> Dict:
        """Analyze word count."""
        analysis = {
            'word_count': word_count,
            'status': 'unknown',
            'is_optimal': False,
            'issues': [],
            'score': 0
        }
        
        if word_count >= 1000:
            analysis['status'] = 'excellent'
            analysis['is_optimal'] = True
            analysis['score'] = 10
        elif word_count >= 500:
            analysis['status'] = 'good'
            analysis['score'] = 7
        elif word_count >= 300:
            analysis['status'] = 'acceptable'
            analysis['score'] = 5
            analysis['issues'].append('Content could be more comprehensive (aim for 500+ words)')
        elif word_count > 0:
            analysis['status'] = 'thin'
            analysis['score'] = 2
            analysis['issues'].append('Thin content detected - add more valuable content (aim for 300+ words)')
        else:
            analysis['status'] = 'empty'
            analysis['score'] = 0
            analysis['issues'].append('No content detected - critical issue')
        
        return analysis
    
    def _detect_spammy_keywords(self, page_data: Dict) -> Dict:
        """Detect spammy keyword repetition."""
        text_content = page_data.get('text_content', '')
        if not text_content:
            return {
                'is_spammy': False,
                'repetition_rate': 0,
                'issues': [],
                'score': 10
            }
        
        # Extract words
        words = re.findall(r'\b\w+\b', text_content.lower())
        if not words:
            return {
                'is_spammy': False,
                'repetition_rate': 0,
                'issues': [],
                'score': 10
            }
        
        # Count word frequencies
        word_counts = {}
        for word in words:
            if len(word) > 3:  # Ignore short words
                word_counts[word] = word_counts.get(word, 0) + 1
        
        # Find most repeated word
        if word_counts:
            max_count = max(word_counts.values())
            total_words = len(words)
            repetition_rate = max_count / total_words if total_words > 0 else 0
            
            analysis = {
                'is_spammy': repetition_rate > self.spam_threshold,
                'repetition_rate': round(repetition_rate * 100, 2),
                'most_repeated_word': max(word_counts, key=word_counts.get),
                'max_repetition_count': max_count,
                'issues': [],
                'score': 10
            }
            
            if analysis['is_spammy']:
                analysis['score'] = 3
                analysis['issues'].append(
                    f"Keyword '{analysis['most_repeated_word']}' appears {max_count} times "
                    f"({analysis['repetition_rate']}% of content) - may be seen as spam"
                )
            
            return analysis
        
        return {
            'is_spammy': False,
            'repetition_rate': 0,
            'issues': [],
            'score': 10
        }
    
    def _analyze_canonical(self, canonical_url: Optional[str], page_url: str) -> Dict:
        """Analyze canonical tag."""
        analysis = {
            'has_canonical': bool(canonical_url),
            'canonical_url': canonical_url,
            'page_url': page_url,
            'is_correct': False,
            'issues': [],
            'score': 0
        }
        
        if not canonical_url:
            analysis['issues'].append('Missing canonical tag - recommended for SEO')
            return analysis
        
        analysis['score'] = 5
        
        # Check if canonical points to current page or correct version
        try:
            parsed_canonical = urlparse(canonical_url)
            parsed_page = urlparse(page_url)
            
            # Normalize for comparison
            canonical_normalized = f"{parsed_canonical.scheme}://{parsed_canonical.netloc}{parsed_canonical.path.rstrip('/')}"
            page_normalized = f"{parsed_page.scheme}://{parsed_page.netloc}{parsed_page.path.rstrip('/')}"
            
            if canonical_normalized == page_normalized:
                analysis['is_correct'] = True
                analysis['score'] = 10
            else:
                analysis['issues'].append('Canonical URL does not match current page URL')
        
        except Exception:
            analysis['issues'].append('Invalid canonical URL format')
        
        return analysis
    
    def _analyze_og_tags(self, og_tags: Dict) -> Dict:
        """Analyze Open Graph tags."""
        required_tags = ['og:title', 'og:description', 'og:image']
        present_tags = list(og_tags.keys()) if og_tags else []
        missing_tags = [tag for tag in required_tags if tag not in present_tags]
        
        analysis = {
            'has_og_tags': len(present_tags) > 0,
            'present_tags': present_tags,
            'missing_tags': missing_tags,
            'coverage': round((len(present_tags) / len(required_tags) * 100) if required_tags else 0, 1),
            'issues': [],
            'score': 0
        }
        
        if len(present_tags) == len(required_tags):
            analysis['score'] = 10
        elif len(present_tags) > 0:
            analysis['score'] = 5
            if missing_tags:
                analysis['issues'].append(f'Missing OG tags: {", ".join(missing_tags)}')
        else:
            analysis['issues'].append('No Open Graph tags found - recommended for social sharing')
        
        return analysis
    
    def _analyze_twitter_tags(self, twitter_tags: Dict) -> Dict:
        """Analyze Twitter Card tags."""
        present_tags = list(twitter_tags.keys()) if twitter_tags else []
        
        analysis = {
            'has_twitter_tags': len(present_tags) > 0,
            'present_tags': present_tags,
            'issues': [],
            'score': 0
        }
        
        if len(present_tags) >= 3:
            analysis['score'] = 10
        elif len(present_tags) > 0:
            analysis['score'] = 5
            analysis['issues'].append('Twitter Card tags incomplete - add twitter:card, twitter:title, twitter:description')
        else:
            analysis['issues'].append('No Twitter Card tags found - recommended for Twitter sharing')
        
        return analysis
    
    def _calculate_seo_score(self, audit: Dict) -> int:
        """Calculate overall SEO score (0-100)."""
        scores = [
            audit['title_analysis'].get('score', 0),
            audit['meta_description_analysis'].get('score', 0),
            audit['heading_structure'].get('score', 0),
            audit['alt_tags_analysis'].get('score', 0),
            audit['word_count_analysis'].get('score', 0),
            audit['spam_detection'].get('score', 0),
            audit['canonical_analysis'].get('score', 0),
            audit['og_tags_analysis'].get('score', 0),
            audit['twitter_tags_analysis'].get('score', 0),
        ]
        
        # Normalize to 0-100 scale (max possible is 10*9 = 90, so multiply by 100/90)
        total_score = sum(scores)
        normalized_score = int((total_score / 90) * 100)
        
        return min(100, max(0, normalized_score))
    
    def _collect_critical_issues(self, audit: Dict) -> List[str]:
        """Collect critical SEO issues."""
        issues = []
        
        if not audit['title_analysis'].get('title'):
            issues.append('Missing title tag - critical for SEO')
        
        if audit['heading_structure']['h1_count'] == 0:
            issues.append('Missing H1 tag - critical for SEO')
        
        if audit['word_count_analysis']['word_count'] == 0:
            issues.append('No content detected - critical issue')
        
        if audit['spam_detection'].get('is_spammy'):
            issues.append(f"Spammy keyword repetition detected ({audit['spam_detection']['repetition_rate']}%)")
        
        return issues
    
    def _collect_warnings(self, audit: Dict) -> List[str]:
        """Collect SEO warnings."""
        warnings = []
        
        warnings.extend(audit['title_analysis'].get('issues', []))
        warnings.extend(audit['meta_description_analysis'].get('issues', []))
        warnings.extend(audit['heading_structure'].get('issues', []))
        warnings.extend(audit['alt_tags_analysis'].get('issues', []))
        warnings.extend(audit['word_count_analysis'].get('issues', []))
        warnings.extend(audit['canonical_analysis'].get('issues', []))
        warnings.extend(audit['og_tags_analysis'].get('issues', []))
        warnings.extend(audit['twitter_tags_analysis'].get('issues', []))
        
        return warnings
    
    def _collect_recommendations(self, audit: Dict) -> List[str]:
        """Collect SEO recommendations."""
        recommendations = []
        
        if audit['heading_structure']['h2_count'] < 2:
            recommendations.append('Add more H2 tags to structure your content')
        
        if audit['word_count_analysis']['word_count'] < 500:
            recommendations.append('Expand content to 500+ words for better SEO')
        
        if not audit['og_tags_analysis']['has_og_tags']:
            recommendations.append('Add Open Graph tags for better social media sharing')
        
        if not audit['twitter_tags_analysis']['has_twitter_tags']:
            recommendations.append('Add Twitter Card tags for better Twitter sharing')
        
        if audit['alt_tags_analysis']['alt_coverage'] < 100:
            recommendations.append('Add alt tags to all images for accessibility and SEO')
        
        return recommendations
    
    def check_robots_txt(self, base_url: str) -> Dict:
        """Check robots.txt file."""
        try:
            parsed = urlparse(base_url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            
            response = requests.get(robots_url, timeout=5)
            
            return {
                'exists': response.status_code == 200,
                'url': robots_url,
                'status_code': response.status_code,
                'content': response.text if response.status_code == 200 else None,
                'issues': []
            }
        except Exception as e:
            return {
                'exists': False,
                'url': None,
                'status_code': None,
                'content': None,
                'issues': [f'Error checking robots.txt: {str(e)}']
            }
    
    def check_sitemap(self, base_url: str) -> Dict:
        """Check sitemap.xml file."""
        try:
            parsed = urlparse(base_url)
            sitemap_url = f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
            
            response = requests.get(sitemap_url, timeout=5)
            
            return {
                'exists': response.status_code == 200,
                'url': sitemap_url,
                'status_code': response.status_code,
                'issues': []
            }
        except Exception as e:
            return {
                'exists': False,
                'url': None,
                'status_code': None,
                'issues': [f'Error checking sitemap.xml: {str(e)}']
            }

