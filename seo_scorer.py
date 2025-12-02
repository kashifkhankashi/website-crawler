"""
SEO Score Calculator - Calculates SEO scores (0-100) for pages and overall site.
"""
from typing import Dict, List, Optional
import re


class SEOScorer:
    """
    Calculate SEO scores based on various factors:
    - Meta tags (title, description)
    - Content quality
    - Internal/external links
    - Performance
    - Technical SEO
    """
    
    def __init__(self):
        self.max_score = 100
    
    def calculate_page_score(self, page: Dict) -> Dict:
        """
        Calculate SEO score for a single page.
        
        Returns:
            Dictionary with score breakdown and recommendations
        """
        score = 0
        max_score = 100
        breakdown = {}
        recommendations = []
        
        # 1. Title Tag (15 points)
        title_score, title_recs = self._score_title(page.get('title', ''))
        score += title_score
        breakdown['title'] = title_score
        recommendations.extend(title_recs)
        
        # 2. Meta Description (10 points)
        desc_score, desc_recs = self._score_meta_description(page.get('meta_description', ''))
        score += desc_score
        breakdown['meta_description'] = desc_score
        recommendations.extend(desc_recs)
        
        # 3. Content Quality (20 points)
        content_score, content_recs = self._score_content_quality(page)
        score += content_score
        breakdown['content_quality'] = content_score
        recommendations.extend(content_recs)
        
        # 4. Headings (10 points)
        heading_score, heading_recs = self._score_headings(page)
        score += heading_score
        breakdown['headings'] = heading_score
        recommendations.extend(heading_recs)
        
        # 5. Internal Links (10 points)
        internal_score, internal_recs = self._score_internal_links(page)
        score += internal_score
        breakdown['internal_links'] = internal_score
        recommendations.extend(internal_recs)
        
        # 6. Images/Media (10 points)
        image_score, image_recs = self._score_images(page)
        score += image_score
        breakdown['images'] = image_score
        recommendations.extend(image_recs)
        
        # 7. Technical SEO (10 points)
        technical_score, technical_recs = self._score_technical_seo(page)
        score += technical_score
        breakdown['technical_seo'] = technical_score
        recommendations.extend(technical_recs)
        
        # 8. Performance (10 points)
        performance_score, performance_recs = self._score_performance(page)
        score += performance_score
        breakdown['performance'] = performance_score
        recommendations.extend(performance_recs)
        
        # 9. Broken Links Penalty (5 points deduction)
        broken_penalty = self._calculate_broken_links_penalty(page)
        score -= broken_penalty
        breakdown['broken_links_penalty'] = -broken_penalty
        if broken_penalty > 0:
            recommendations.append({
                'priority': 'high',
                'category': 'broken_links',
                'message': f'Fix {broken_penalty // 2} broken link(s) to improve SEO score'
            })
        
        # Ensure score is between 0-100
        score = max(0, min(100, score))
        
        # Determine grade
        if score >= 90:
            grade = 'A'
        elif score >= 80:
            grade = 'B'
        elif score >= 70:
            grade = 'C'
        elif score >= 60:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'score': round(score, 1),
            'grade': grade,
            'max_score': max_score,
            'breakdown': breakdown,
            'recommendations': recommendations,
            'priority_count': {
                'critical': len([r for r in recommendations if r.get('priority') == 'critical']),
                'high': len([r for r in recommendations if r.get('priority') == 'high']),
                'medium': len([r for r in recommendations if r.get('priority') == 'medium']),
                'low': len([r for r in recommendations if r.get('priority') == 'low'])
            }
        }
    
    def _score_title(self, title: str) -> tuple:
        """Score title tag (15 points max)."""
        score = 0
        recommendations = []
        
        if not title or not title.strip():
            recommendations.append({
                'priority': 'critical',
                'category': 'title',
                'message': 'Add a title tag - this is critical for SEO'
            })
            return 0, recommendations
        
        title_len = len(title)
        
        # Length check (optimal: 50-60 chars)
        if 50 <= title_len <= 60:
            score += 8
        elif 30 <= title_len < 50:
            score += 6
            recommendations.append({
                'priority': 'medium',
                'category': 'title',
                'message': f'Title is {title_len} characters. Consider expanding to 50-60 characters for better SEO'
            })
        elif 60 < title_len <= 70:
            score += 5
            recommendations.append({
                'priority': 'low',
                'category': 'title',
                'message': f'Title is {title_len} characters. Consider shortening to 60 characters to avoid truncation'
            })
        elif title_len > 70:
            score += 3
            recommendations.append({
                'priority': 'high',
                'category': 'title',
                'message': f'Title is too long ({title_len} chars). Google may truncate it. Keep under 60 characters'
            })
        else:
            score += 2
            recommendations.append({
                'priority': 'high',
                'category': 'title',
                'message': f'Title is too short ({title_len} chars). Aim for 50-60 characters'
            })
        
        # Check for keywords (basic check)
        if title and len(title.split()) >= 3:
            score += 4
        else:
            recommendations.append({
                'priority': 'medium',
                'category': 'title',
                'message': 'Title should include relevant keywords'
            })
        
        # Check for brand name or site name
        if title:
            score += 3
        
        return min(15, score), recommendations
    
    def _score_meta_description(self, description: str) -> tuple:
        """Score meta description (10 points max)."""
        score = 0
        recommendations = []
        
        if not description or not description.strip():
            recommendations.append({
                'priority': 'high',
                'category': 'meta_description',
                'message': 'Add a meta description - this appears in search results'
            })
            return 0, recommendations
        
        desc_len = len(description)
        
        # Length check (optimal: 150-160 chars)
        if 150 <= desc_len <= 160:
            score += 7
        elif 120 <= desc_len < 150:
            score += 5
            recommendations.append({
                'priority': 'low',
                'category': 'meta_description',
                'message': f'Meta description is {desc_len} characters. Consider expanding to 150-160 characters'
            })
        elif 160 < desc_len <= 320:
            score += 4
            recommendations.append({
                'priority': 'low',
                'category': 'meta_description',
                'message': f'Meta description is {desc_len} characters. Google may truncate it'
            })
        elif desc_len > 320:
            score += 2
            recommendations.append({
                'priority': 'medium',
                'category': 'meta_description',
                'message': f'Meta description is too long ({desc_len} chars). Keep under 160 characters'
            })
        else:
            score += 3
            recommendations.append({
                'priority': 'medium',
                'category': 'meta_description',
                'message': f'Meta description is too short ({desc_len} chars). Aim for 150-160 characters'
            })
        
        # Check for call-to-action or keywords
        if description and len(description.split()) >= 10:
            score += 3
        else:
            recommendations.append({
                'priority': 'low',
                'category': 'meta_description',
                'message': 'Meta description should be descriptive and include relevant keywords'
            })
        
        return min(10, score), recommendations
    
    def _score_content_quality(self, page: Dict) -> tuple:
        """Score content quality (20 points max)."""
        score = 0
        recommendations = []
        
        word_count = page.get('word_count', 0)
        
        # Word count scoring
        if word_count >= 1000:
            score += 10
        elif word_count >= 500:
            score += 7
            recommendations.append({
                'priority': 'low',
                'category': 'content',
                'message': f'Content has {word_count} words. Consider expanding to 1000+ words for better SEO'
            })
        elif word_count >= 300:
            score += 4
            recommendations.append({
                'priority': 'medium',
                'category': 'content',
                'message': f'Content is thin ({word_count} words). Aim for at least 500-1000 words'
            })
        elif word_count > 0:
            score += 2
            recommendations.append({
                'priority': 'high',
                'category': 'content',
                'message': f'Content is very thin ({word_count} words). Add more valuable content'
            })
        else:
            recommendations.append({
                'priority': 'critical',
                'category': 'content',
                'message': 'Page has no text content - this is critical for SEO'
            })
        
        # Check for duplicate content
        if page.get('is_exact_duplicate'):
            score -= 5
            recommendations.append({
                'priority': 'critical',
                'category': 'content',
                'message': 'This page is an exact duplicate of another page - create unique content'
            })
        elif page.get('similarity_scores'):
            max_similarity = max(page.get('similarity_scores', {}).values(), default=0)
            if max_similarity >= 90:
                score -= 3
                recommendations.append({
                    'priority': 'high',
                    'category': 'content',
                    'message': f'Content is {max_similarity:.1f}% similar to another page - make it more unique'
                })
        
        # Check for keywords in content
        if page.get('keywords') and page.get('keywords', {}).get('top_keywords'):
            score += 5
        else:
            recommendations.append({
                'priority': 'medium',
                'category': 'content',
                'message': 'Ensure content includes relevant keywords naturally'
            })
        
        # Check for internal links (content should link to related pages)
        internal_links = len(page.get('internal_links', []))
        if internal_links >= 5:
            score += 5
        elif internal_links >= 2:
            score += 3
        else:
            recommendations.append({
                'priority': 'low',
                'category': 'content',
                'message': 'Add more internal links to related content'
            })
        
        return min(20, max(0, score)), recommendations
    
    def _score_headings(self, page: Dict) -> tuple:
        """Score heading structure (10 points max)."""
        score = 0
        recommendations = []
        
        h1_tags = page.get('h1_tags', [])
        h2_tags = page.get('h2_tags', [])
        h3_tags = page.get('h3_tags', [])
        
        # H1 check (critical)
        if len(h1_tags) == 1:
            score += 5
        elif len(h1_tags) == 0:
            score += 0
            recommendations.append({
                'priority': 'high',
                'category': 'headings',
                'message': 'Add exactly one H1 tag with your main keyword'
            })
        else:
            score += 2
            recommendations.append({
                'priority': 'high',
                'category': 'headings',
                'message': f'Multiple H1 tags found ({len(h1_tags)}). Use only one H1 per page'
            })
        
        # H2/H3 structure
        if len(h2_tags) >= 2:
            score += 3
        elif len(h2_tags) == 1:
            score += 2
            recommendations.append({
                'priority': 'low',
                'category': 'headings',
                'message': 'Consider adding more H2 tags to structure your content'
            })
        else:
            recommendations.append({
                'priority': 'medium',
                'category': 'headings',
                'message': 'Add H2 tags to organize your content into sections'
            })
        
        if len(h3_tags) > 0:
            score += 2
        
        return min(10, score), recommendations
    
    def _score_internal_links(self, page: Dict) -> tuple:
        """Score internal linking (10 points max)."""
        score = 0
        recommendations = []
        
        internal_links = len(page.get('internal_links', []))
        
        if internal_links >= 10:
            score += 10
        elif internal_links >= 5:
            score += 7
        elif internal_links >= 2:
            score += 4
            recommendations.append({
                'priority': 'low',
                'category': 'internal_links',
                'message': f'Page has {internal_links} internal links. Add more to improve site structure'
            })
        elif internal_links == 1:
            score += 2
            recommendations.append({
                'priority': 'medium',
                'category': 'internal_links',
                'message': 'Add more internal links to related pages'
            })
        else:
            recommendations.append({
                'priority': 'high',
                'category': 'internal_links',
                'message': 'This page has no internal links - add links to related content'
            })
        
        return min(10, score), recommendations
    
    def _score_images(self, page: Dict) -> tuple:
        """Score images/media (10 points max)."""
        score = 0
        recommendations = []
        
        images = page.get('images', [])
        image_analysis = page.get('performance_analysis', {}).get('heavy_images', [])
        
        if not images:
            recommendations.append({
                'priority': 'low',
                'category': 'images',
                'message': 'Consider adding relevant images to improve user experience'
            })
            return 5, recommendations  # Neutral score if no images
        
        # Check for missing ALT text
        missing_alt = sum(1 for img in images if not img.get('alt') or not img.get('alt').strip())
        total_images = len(images)
        
        if total_images > 0:
            alt_ratio = (total_images - missing_alt) / total_images
            if alt_ratio == 1.0:
                score += 5
            elif alt_ratio >= 0.8:
                score += 3
                recommendations.append({
                    'priority': 'medium',
                    'category': 'images',
                    'message': f'{missing_alt} image(s) missing ALT text - add descriptive ALT attributes'
                })
            else:
                score += 1
                recommendations.append({
                    'priority': 'high',
                    'category': 'images',
                    'message': f'{missing_alt} images missing ALT text - this hurts accessibility and SEO'
                })
        
        # Check for heavy images
        if image_analysis:
            heavy_count = len(image_analysis)
            if heavy_count == 0:
                score += 5
            else:
                score += max(0, 5 - heavy_count)
                recommendations.append({
                    'priority': 'medium',
                    'category': 'images',
                    'message': f'{heavy_count} heavy image(s) detected - optimize images for faster loading'
                })
        
        return min(10, score), recommendations
    
    def _score_technical_seo(self, page: Dict) -> tuple:
        """Score technical SEO (10 points max)."""
        score = 0
        recommendations = []
        
        # Canonical URL
        if page.get('canonical_url'):
            score += 3
        else:
            recommendations.append({
                'priority': 'medium',
                'category': 'technical',
                'message': 'Add a canonical URL to prevent duplicate content issues'
            })
        
        # OG Tags
        og_tags = page.get('og_tags', {})
        if og_tags and len(og_tags) >= 3:
            score += 2
        elif og_tags:
            score += 1
            recommendations.append({
                'priority': 'low',
                'category': 'technical',
                'message': 'Add more Open Graph tags for better social media sharing'
            })
        else:
            recommendations.append({
                'priority': 'low',
                'category': 'technical',
                'message': 'Add Open Graph tags (og:title, og:description, og:image)'
            })
        
        # Twitter Cards
        twitter_tags = page.get('twitter_tags', {})
        if twitter_tags:
            score += 2
        else:
            recommendations.append({
                'priority': 'low',
                'category': 'technical',
                'message': 'Add Twitter Card tags for better Twitter sharing'
            })
        
        # Status code
        status_code = page.get('status_code', 0)
        if status_code == 200:
            score += 3
        elif status_code in [301, 302]:
            score += 1
            recommendations.append({
                'priority': 'medium',
                'category': 'technical',
                'message': f'Page returns {status_code} redirect - consider using 301 for permanent redirects'
            })
        else:
            recommendations.append({
                'priority': 'critical',
                'category': 'technical',
                'message': f'Page returns status {status_code} - fix this immediately'
            })
        
        return min(10, score), recommendations
    
    def _score_performance(self, page: Dict) -> tuple:
        """Score performance (10 points max)."""
        score = 10  # Start with full score
        recommendations = []
        
        perf_analysis = page.get('performance_analysis', {})
        
        # Heavy images penalty
        heavy_images = len(perf_analysis.get('heavy_images', []))
        if heavy_images > 0:
            score -= min(3, heavy_images)
            recommendations.append({
                'priority': 'medium',
                'category': 'performance',
                'message': f'{heavy_images} heavy image(s) - optimize for faster loading'
            })
        
        # Render-blocking resources
        render_blocking = len(perf_analysis.get('render_blocking_resources', []))
        if render_blocking > 0:
            score -= min(3, render_blocking)
            recommendations.append({
                'priority': 'medium',
                'category': 'performance',
                'message': f'{render_blocking} render-blocking resource(s) - add async/defer attributes'
            })
        
        # Slow HTML sections
        slow_sections = len(perf_analysis.get('slow_html_sections', []))
        if slow_sections > 0:
            score -= min(2, slow_sections)
            recommendations.append({
                'priority': 'low',
                'category': 'performance',
                'message': f'{slow_sections} slow HTML section(s) detected - optimize structure'
            })
        
        return max(0, score), recommendations
    
    def _calculate_broken_links_penalty(self, page: Dict) -> int:
        """Calculate penalty for broken links (max 5 points)."""
        broken_links = page.get('broken_links', [])
        broken_count = len(broken_links)
        
        # Penalty: 2 points per broken link, max 5 points
        penalty = min(5, broken_count * 2)
        return penalty
    
    def calculate_site_score(self, pages: List[Dict]) -> Dict:
        """
        Calculate overall site SEO score.
        
        Args:
            pages: List of page dictionaries with SEO scores
            
        Returns:
            Dictionary with site-wide score and statistics
        """
        if not pages:
            return {
                'score': 0,
                'grade': 'F',
                'total_pages': 0,
                'average_score': 0,
                'score_distribution': {}
            }
        
        # Calculate average score
        scores = [p.get('seo_score', {}).get('score', 0) for p in pages if p.get('seo_score')]
        
        if not scores:
            return {
                'score': 0,
                'grade': 'F',
                'total_pages': len(pages),
                'average_score': 0,
                'score_distribution': {}
            }
        
        avg_score = sum(scores) / len(scores)
        
        # Determine grade
        if avg_score >= 90:
            grade = 'A'
        elif avg_score >= 80:
            grade = 'B'
        elif avg_score >= 70:
            grade = 'C'
        elif avg_score >= 60:
            grade = 'D'
        else:
            grade = 'F'
        
        # Score distribution
        distribution = {
            'A': len([s for s in scores if s >= 90]),
            'B': len([s for s in scores if 80 <= s < 90]),
            'C': len([s for s in scores if 70 <= s < 80]),
            'D': len([s for s in scores if 60 <= s < 70]),
            'F': len([s for s in scores if s < 60])
        }
        
        return {
            'score': round(avg_score, 1),
            'grade': grade,
            'total_pages': len(pages),
            'pages_scored': len(scores),
            'average_score': round(avg_score, 1),
            'score_distribution': distribution,
            'min_score': round(min(scores), 1),
            'max_score': round(max(scores), 1)
        }

