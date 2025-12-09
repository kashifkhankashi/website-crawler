"""
Schema Markup Analyzer - Extract and analyze structured data (JSON-LD, Microdata, RDFa)
and provide recommendations for improvements.
"""
import json
import re
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse
from bs4 import BeautifulSoup, Tag
from datetime import datetime


class SchemaAnalyzer:
    """
    Analyzes schema markup on websites and provides recommendations.
    """
    
    # Common schema types and their recommended properties
    SCHEMA_REQUIREMENTS = {
        'Organization': {
            'required': ['name', 'url'],
            'recommended': ['logo', 'contactPoint', 'sameAs', 'address'],
            'description': 'Organization schema helps search engines understand your business'
        },
        'LocalBusiness': {
            'required': ['name', 'address'],
            'recommended': ['telephone', 'priceRange', 'openingHours', 'geo'],
            'description': 'LocalBusiness schema helps with local SEO'
        },
        'WebSite': {
            'required': ['name', 'url'],
            'recommended': ['potentialAction', 'description'],
            'description': 'WebSite schema can enable sitelinks search box'
        },
        'Article': {
            'required': ['headline', 'author', 'datePublished'],
            'recommended': ['image', 'publisher', 'dateModified', 'description'],
            'description': 'Article schema improves visibility in news and blog search results'
        },
        'BlogPosting': {
            'required': ['headline', 'author', 'datePublished'],
            'recommended': ['image', 'publisher', 'description'],
            'description': 'BlogPosting schema helps blog posts appear in rich results'
        },
        'Product': {
            'required': ['name', 'description'],
            'recommended': ['price', 'availability', 'image', 'brand', 'sku', 'offers'],
            'description': 'Product schema enables rich snippets for e-commerce'
        },
        'BreadcrumbList': {
            'required': ['itemListElement'],
            'recommended': [],
            'description': 'BreadcrumbList helps with navigation and search appearance'
        },
        'FAQPage': {
            'required': ['mainEntity'],
            'recommended': [],
            'description': 'FAQPage schema can display FAQ results in search'
        },
        'HowTo': {
            'required': ['name', 'step'],
            'recommended': ['description', 'image', 'totalTime'],
            'description': 'HowTo schema enables step-by-step rich results'
        },
        'VideoObject': {
            'required': ['name', 'description', 'thumbnailUrl'],
            'recommended': ['duration', 'uploadDate', 'contentUrl'],
            'description': 'VideoObject schema improves video search visibility'
        },
        'Person': {
            'required': ['name'],
            'recommended': ['jobTitle', 'image', 'sameAs', 'worksFor'],
            'description': 'Person schema helps with author and team member visibility'
        },
        'Event': {
            'required': ['name', 'startDate'],
            'recommended': ['location', 'description', 'image', 'endDate'],
            'description': 'Event schema helps events appear in search results'
        },
        'Review': {
            'required': ['reviewRating', 'author'],
            'recommended': ['reviewBody', 'itemReviewed'],
            'description': 'Review schema displays star ratings in search results'
        }
    }
    
    def __init__(self):
        """Initialize the schema analyzer."""
        self.schemas_by_page: Dict[str, List[Dict]] = {}
        self.schema_types_found: Set[str] = set()
        self.schema_issues: List[Dict] = []
        
    def analyze_crawl_results(self, crawl_data: Dict) -> Dict:
        """
        Analyze schemas from crawl results.
        
        Args:
            crawl_data: The crawl results dictionary
            
        Returns:
            Dictionary containing schema analysis results
        """
        pages = crawl_data.get('pages', [])
        all_schemas = []
        schemas_by_type = {}
        issues = []
        recommendations = []
        
        # Extract schemas from each page
        for page in pages:
            if not isinstance(page, dict):
                continue
                
            url = page.get('url', '')
            html_content = page.get('html_content', '')
            title = page.get('title', '')
            
            # If html_content is not available, skip this page
            if not html_content or not isinstance(html_content, str):
                continue
                
            try:
                page_schemas = self.extract_schemas(html_content, url)
                
                if page_schemas:
                    all_schemas.extend(page_schemas)
                    self.schemas_by_page[url] = page_schemas
                    
                    for schema in page_schemas:
                        if not isinstance(schema, dict):
                            continue
                        schema_type = schema.get('@type', 'Unknown')
                        # Handle both single type strings and lists (for multiple types)
                        if isinstance(schema_type, list):
                            schema_type = schema_type[0] if schema_type else 'Unknown'
                        if schema_type not in schemas_by_type:
                            schemas_by_type[schema_type] = []
                        schemas_by_type[schema_type].append({
                            'url': url,
                            'title': title,
                            'schema': schema
                        })
            except Exception as e:
                # Skip pages with errors, but continue processing
                continue
        
        # Analyze each schema for issues and missing properties
        for url, schemas in self.schemas_by_page.items():
            for schema in schemas:
                if not isinstance(schema, dict):
                    continue
                schema_type = schema.get('@type', 'Unknown')
                # Handle both single type strings and lists (for multiple types)
                if isinstance(schema_type, list):
                    schema_type = schema_type[0] if schema_type else 'Unknown'
                if schema_type in self.SCHEMA_REQUIREMENTS:
                    issues.extend(self._check_schema_completeness(schema, schema_type, url))
                    recommendations.extend(self._generate_recommendations(schema, schema_type, url, pages))
        
        # Generate overall recommendations
        # Filter pages to only include dicts for safety
        valid_pages = [p for p in pages if isinstance(p, dict)]
        overall_recommendations = self._generate_overall_recommendations(
            schemas_by_type, 
            valid_pages,
            all_schemas
        )
        
        return {
            'total_schemas': len(all_schemas),
            'pages_with_schema': len(self.schemas_by_page),
            'pages_without_schema': len(valid_pages) - len(self.schemas_by_page),
            'schema_types_found': list(schemas_by_type.keys()),
            'schemas_by_type': schemas_by_type,
            'schemas_by_page': {url: self._format_schemas_for_display(schemas) 
                               for url, schemas in self.schemas_by_page.items()},
            'issues': issues,
            'recommendations': recommendations + overall_recommendations,
            'suggested_schemas': self._suggest_missing_schemas(valid_pages, schemas_by_type)
        }
    
    def extract_schemas(self, html_content: str, url: str) -> List[Dict]:
        """
        Extract all schemas from HTML content.
        
        Args:
            html_content: The HTML content to analyze
            url: The URL of the page
            
        Returns:
            List of extracted schema dictionaries
        """
        schemas = []
        if not html_content:
            return schemas
            
        try:
            soup = BeautifulSoup(html_content, 'lxml')
        except Exception:
            return schemas
        
        # Extract JSON-LD schemas
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                if script.string:
                    schema_data = json.loads(script.string)
                    # Handle both single objects and arrays
                    if isinstance(schema_data, list):
                        for item in schema_data:
                            if isinstance(item, dict):
                                schemas.append(item)
                    elif isinstance(schema_data, dict):
                        schemas.append(schema_data)
            except (json.JSONDecodeError, AttributeError, TypeError) as e:
                continue
        
        # Extract microdata (basic support)
        microdata_items = soup.find_all(attrs={'itemtype': True})
        for item in microdata_items[:10]:  # Limit to avoid performance issues
            try:
                microdata_schema = self._extract_microdata(item)
                if microdata_schema:
                    schemas.append(microdata_schema)
            except Exception:
                continue
        
        # Add source URL to each schema
        for schema in schemas:
            if isinstance(schema, dict):
                if '@context' not in schema:
                    schema['@context'] = 'https://schema.org'
                schema['_source_url'] = url
                schema['_extraction_method'] = 'JSON-LD' if json_ld_scripts else 'Microdata'
        
        return schemas
    
    def _extract_microdata(self, item: Tag) -> Optional[Dict]:
        """Extract microdata from HTML element."""
        try:
            itemtype = item.get('itemtype', '')
            if not itemtype or 'schema.org' not in itemtype:
                return None
            
            schema_type = itemtype.split('/')[-1]
            schema = {
                '@type': schema_type,
                '@context': 'https://schema.org'
            }
            
            # Extract properties
            props = item.find_all(attrs={'itemprop': True})
            for prop in props:
                prop_name = prop.get('itemprop')
                if prop_name:
                    # Get value
                    if prop.get('itemscope'):
                        # Nested item
                        continue
                    elif prop.name == 'meta':
                        value = prop.get('content', '')
                    else:
                        value = prop.get_text(strip=True)
                    
                    if value:
                        schema[prop_name] = value
            
            return schema if len(schema) > 2 else None
        except Exception:
            return None
    
    def _check_schema_completeness(self, schema: Dict, schema_type: str, url: str) -> List[Dict]:
        """Check if schema has required and recommended properties."""
        issues = []
        requirements = self.SCHEMA_REQUIREMENTS.get(schema_type, {})
        required = requirements.get('required', [])
        recommended = requirements.get('recommended', [])
        
        # Check required properties
        missing_required = [prop for prop in required if prop not in schema]
        if missing_required:
            issues.append({
                'type': 'missing_required',
                'severity': 'high',
                'schema_type': schema_type,
                'url': url,
                'missing_properties': missing_required,
                'message': f"Missing required properties: {', '.join(missing_required)}"
            })
        
        # Check recommended properties
        missing_recommended = [prop for prop in recommended if prop not in schema]
        if missing_recommended:
            issues.append({
                'type': 'missing_recommended',
                'severity': 'medium',
                'schema_type': schema_type,
                'url': url,
                'missing_properties': missing_recommended,
                'message': f"Consider adding recommended properties: {', '.join(missing_recommended)}"
            })
        
        return issues
    
    def _generate_recommendations(self, schema: Dict, schema_type: str, url: str, pages: List[Dict]) -> List[Dict]:
        """Generate specific recommendations for a schema."""
        recommendations = []
        requirements = self.SCHEMA_REQUIREMENTS.get(schema_type, {})
        
        # Generate updated schema with missing properties
        suggested_schema = schema.copy()
        missing_props = []
        
        for prop in requirements.get('required', []):
            if prop not in suggested_schema:
                suggested_schema[prop] = f"[ADD {prop.upper()}]"
                missing_props.append(prop)
        
        for prop in requirements.get('recommended', []):
            if prop not in suggested_schema:
                suggested_schema[prop] = f"[RECOMMENDED: {prop.upper()}]"
        
        if missing_props:
            recommendations.append({
                'type': 'schema_improvement',
                'schema_type': schema_type,
                'url': url,
                'current_schema': schema,
                'suggested_schema': suggested_schema,
                'missing_properties': missing_props,
                'description': requirements.get('description', '')
            })
        
        return recommendations
    
    def _generate_overall_recommendations(self, schemas_by_type: Dict, pages: List[Dict], all_schemas: List[Dict]) -> List[Dict]:
        """Generate overall recommendations based on site structure."""
        recommendations = []
        
        # Check if Organization schema exists (should be on homepage)
        homepage = next((p for p in pages if isinstance(p, dict) and self._is_homepage(p.get('url', ''))), None)
        has_org_schema = any(
            isinstance(s, dict) and s.get('@type') == 'Organization' 
            for schemas in self.schemas_by_page.values() 
            for s in schemas
        )
        
        if not has_org_schema and homepage and isinstance(homepage, dict):
            recommendations.append({
                'type': 'missing_critical_schema',
                'schema_type': 'Organization',
                'url': homepage.get('url', ''),
                'priority': 'high',
                'message': 'Add Organization schema to your homepage for better brand recognition',
                'description': self.SCHEMA_REQUIREMENTS['Organization']['description']
            })
        
        # Check for WebSite schema
        has_website_schema = any(
            isinstance(s, dict) and s.get('@type') == 'WebSite' 
            for schemas in self.schemas_by_page.values() 
            for s in schemas
        )
        
        if not has_website_schema and homepage and isinstance(homepage, dict):
            recommendations.append({
                'type': 'missing_critical_schema',
                'schema_type': 'WebSite',
                'url': homepage.get('url', ''),
                'priority': 'high',
                'message': 'Add WebSite schema to enable sitelinks search box in search results',
                'description': self.SCHEMA_REQUIREMENTS['WebSite']['description']
            })
        
        # Check if blog posts have Article/BlogPosting schema
        blog_pages = [p for p in pages if isinstance(p, dict) and self._looks_like_blog_post(p)]
        if blog_pages:
            pages_with_article_schema = sum(
                1 for p in blog_pages 
                if isinstance(p, dict) and any(
                    isinstance(s, dict) and s.get('@type') in ['Article', 'BlogPosting']
                    for schemas in self.schemas_by_page.get(p.get('url', ''), [])
                    for s in schemas
                )
            )
            if pages_with_article_schema < len(blog_pages):
                recommendations.append({
                    'type': 'missing_schema_type',
                    'schema_type': 'Article/BlogPosting',
                    'priority': 'medium',
                    'message': f'{len(blog_pages) - pages_with_article_schema} blog posts are missing Article or BlogPosting schema',
                    'description': 'Adding Article schema helps blog posts appear in news and rich results'
                })
        
        # Check if product pages have Product schema
        product_pages = [p for p in pages if isinstance(p, dict) and self._looks_like_product_page(p)]
        if product_pages:
            pages_with_product_schema = sum(
                1 for p in product_pages 
                if isinstance(p, dict) and any(
                    isinstance(s, dict) and s.get('@type') == 'Product'
                    for schemas in self.schemas_by_page.get(p.get('url', ''), [])
                    for s in schemas
                )
            )
            if pages_with_product_schema < len(product_pages):
                recommendations.append({
                    'type': 'missing_schema_type',
                    'schema_type': 'Product',
                    'priority': 'medium',
                    'message': f'{len(product_pages) - pages_with_product_schema} product pages are missing Product schema',
                    'description': 'Product schema enables rich snippets with prices and ratings'
                })
        
        return recommendations
    
    def _suggest_missing_schemas(self, pages: List[Dict], schemas_by_type: Dict) -> List[Dict]:
        """Suggest schemas that could be added based on page content."""
        suggestions = []
        found_types = set(schemas_by_type.keys())
        
        # Check for common schema types that might be missing
        if 'BreadcrumbList' not in found_types:
            suggestions.append({
                'schema_type': 'BreadcrumbList',
                'priority': 'medium',
                'description': 'Add breadcrumb navigation schema to help users understand site structure',
                'example': self._generate_breadcrumb_example()
            })
        
        # Check if pages have FAQ content
        for page in pages[:10]:  # Check first 10 pages
            if isinstance(page, dict) and self._has_faq_content(page):
                suggestions.append({
                    'schema_type': 'FAQPage',
                    'priority': 'medium',
                    'url': page.get('url', ''),
                    'description': 'This page appears to have FAQ content - add FAQPage schema',
                    'example': self._generate_faq_example()
                })
                break
        
        return suggestions
    
    def _is_homepage(self, url: str) -> bool:
        """Check if URL is homepage."""
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        return path == '' or path == '/'
    
    def _looks_like_blog_post(self, page: Dict) -> bool:
        """Heuristic to detect if page is a blog post."""
        if not isinstance(page, dict):
            return False
        url = page.get('url', '').lower() if isinstance(page.get('url'), str) else ''
        title = page.get('title', '').lower() if isinstance(page.get('title'), str) else ''
        content = page.get('text_content', '').lower() if isinstance(page.get('text_content'), str) else ''
        
        # Check URL patterns
        blog_patterns = ['/blog/', '/post/', '/article/', '/news/']
        if any(pattern in url for pattern in blog_patterns):
            return True
        
        # Check for date in URL or title
        date_pattern = r'\d{4}[/-]\d{2}[/-]\d{2}'
        if re.search(date_pattern, url) or re.search(date_pattern, title):
            return True
        
        # Check content length (blog posts usually have substantial content)
        if len(content) > 500:
            return True
        
        return False
    
    def _looks_like_product_page(self, page: Dict) -> bool:
        """Heuristic to detect if page is a product page."""
        if not isinstance(page, dict):
            return False
        url = page.get('url', '').lower() if isinstance(page.get('url'), str) else ''
        title = page.get('title', '').lower() if isinstance(page.get('title'), str) else ''
        
        product_patterns = ['/product/', '/shop/', '/item/', '/p/']
        if any(pattern in url for pattern in product_patterns):
            return True
        
        # Check for price indicators in title
        price_indicators = ['$', 'price', 'buy', 'purchase']
        if any(indicator in title for indicator in price_indicators):
            return True
        
        return False
    
    def _has_faq_content(self, page: Dict) -> bool:
        """Check if page has FAQ-like content."""
        if not isinstance(page, dict):
            return False
        content = page.get('text_content', '').lower() if isinstance(page.get('text_content'), str) else ''
        h2_tags = page.get('h2_tags', []) if isinstance(page.get('h2_tags'), list) else []
        h3_tags = page.get('h3_tags', []) if isinstance(page.get('h3_tags'), list) else []
        
        # Look for question patterns
        question_words = ['what', 'how', 'why', 'when', 'where', 'who']
        headings = [h.lower() for h in h2_tags + h3_tags]
        
        question_headings = sum(1 for h in headings if any(word in h for word in question_words) and '?' in h)
        
        return question_headings >= 3 or 'faq' in content or 'frequently asked' in content
    
    def _format_schemas_for_display(self, schemas: List[Dict]) -> List[Dict]:
        """Format schemas for frontend display."""
        formatted = []
        for schema in schemas:
            formatted_schema = schema.copy()
            # Remove internal metadata
            formatted_schema.pop('_source_url', None)
            formatted_schema.pop('_extraction_method', None)
            formatted.append(formatted_schema)
        return formatted
    
    def _generate_breadcrumb_example(self) -> Dict:
        """Generate example BreadcrumbList schema."""
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://example.com"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Category",
                    "item": "https://example.com/category"
                }
            ]
        }
    
    def _generate_faq_example(self) -> Dict:
        """Generate example FAQPage schema."""
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "What is your return policy?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "We offer a 30-day return policy..."
                    }
                }
            ]
        }

