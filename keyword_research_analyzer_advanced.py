"""
Advanced Keyword Research Methods
These methods are added to enhance the keyword research analyzer with competitive features.
"""

from typing import Dict, List, Set, Tuple, Optional
from collections import Counter, defaultdict
import re

# These methods should be added to the KeywordResearchAnalyzer class

def _analyze_keyword_difficulty(self, your_keywords: Dict, competitor_keywords: Dict, 
                                competitors: List[str]) -> Dict:
    """Analyze keyword difficulty based on competition."""
    difficulty_scores = {}
    your_kw_set = set(your_keywords.get('keywords', []))
    
    # Get all competitor keywords
    all_comp_keywords = set()
    for url, kw_data in competitor_keywords.items():
        all_comp_keywords.update(kw_data.get('keywords', []))
    
    # Analyze each keyword
    for keyword in list(your_kw_set)[:200] + list(all_comp_keywords)[:200]:
        if not keyword or len(keyword) < 3:
            continue
        
        # Count how many competitors use this keyword
        competitor_count = 0
        total_frequency = 0
        
        for url, kw_data in competitor_keywords.items():
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
    all_keywords.update(competitor_keywords.get('keywords', []))
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
    from nltk.tokenize import sent_tokenize, word_tokenize
    
    long_tail = []
    
    # Extract from competitor content
    for url, data in competitor_data.items():
        for page in data.get('pages', []):
            text = page.get('text_content', '')
            if text:
                try:
                    sentences = sent_tokenize(text)
                except:
                    sentences = text.split('.')
                for sentence in sentences[:20]:  # Limit processing
                    try:
                        words = word_tokenize(sentence.lower())
                    except:
                        words = sentence.lower().split()
                    # Find 4-6 word phrases
                    for i in range(len(words) - 3):
                        phrase = ' '.join(words[i:i+4])
                        if len(phrase) > 20 and phrase not in self.stop_words:
                            long_tail.append(phrase)
                    for i in range(len(words) - 4):
                        phrase = ' '.join(words[i:i+5])
                        if len(phrase) > 25 and phrase not in self.stop_words:
                            long_tail.append(phrase)
                except:
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
    
    # Get top keywords
    comp_freq = competitor_keywords.get('keyword_frequency', {})
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
    all_keywords.update(competitor_keywords.get('keywords', []))
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
    from nltk.tokenize import word_tokenize
    
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
                words = word_tokenize(text)
            except:
                words = text.split()
            keywords = [w for w in words if w not in self.stop_words and len(w) > 3]
            
            for keyword in set(keywords)[:10]:  # Top 10 keywords per page
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
                    words = word_tokenize(text)
                except:
                    words = text.split()
                keywords = [w for w in words if w not in self.stop_words and len(w) > 3]
                
                for keyword in set(keywords)[:10]:
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
    from nltk.tokenize import word_tokenize
    
    density_analysis = {}
    
    # Analyze your site
    your_densities = {}
    for page in your_site_data.get('pages', []):
        text = page.get('text_content', '').lower()
        if text:
            try:
                words = word_tokenize(text)
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
                    words = word_tokenize(text)
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
        your_avg = sum([d['density'] for d in your_densities.get(keyword, [])]) / len(your_densities.get(keyword, [1])) if your_densities.get(keyword) else 0
        comp_avg = sum([d['density'] for d in comp_densities.get(keyword, [])]) / len(comp_densities.get(keyword, [1])) if comp_densities.get(keyword) else 0
        
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
    for faq in faq_patterns[:20]:
        if faq.get('type') == 'question':
            opportunities['featured_snippet'].append({
                'keyword': faq.get('question', ''),
                'type': 'question',
                'opportunity': 'Create content answering this question',
                'competitor_has': True
            })
    
    # People Also Ask opportunities (related questions)
    question_keywords = [kw for kw in competitor_keywords.get('keywords', []) 
                       if '?' in kw or any(q in kw.lower() for q in ['what', 'how', 'why', 'when', 'where'])]
    
    for qkw in question_keywords[:20]:
        if qkw not in your_keywords.get('keywords', []):
            opportunities['people_also_ask'].append({
                'keyword': qkw,
                'opportunity': 'Create content addressing this question',
                'competitor_has': True
            })
    
    # Related searches (LSI keywords)
    lsi_data = self._extract_lsi_keywords(competitor_keywords, your_keywords)
    for group in lsi_data.get('keyword_groups', [])[:10]:
        opportunities['related_searches'].append({
            'main_keyword': group['main_keyword'],
            'related': [r['keyword'] for r in group['related_keywords'][:5]],
            'opportunity': 'Create comprehensive content covering these related terms'
        })
    
    return opportunities

def _generate_content_suggestions(self, opportunities: List[Dict], content_gaps: Dict,
                                 topic_clusters: List[Dict], keyword_intent: Dict) -> List[Dict]:
    """Generate content suggestions based on analysis."""
    suggestions = []
    
    # Based on high-opportunity keywords
    for opp in opportunities[:20]:
        if opp.get('opportunity_score', 0) > 50:
            suggestions.append({
                'title': f"Guide: {opp['keyword']}",
                'type': 'blog_post',
                'priority': 'high',
                'keywords': [opp['keyword']],
                'suggestion': f"Create comprehensive content about '{opp['keyword']}' to capture this high-opportunity keyword",
                'estimated_value': 'High'
            })
    
    # Based on topic clusters
    for cluster in topic_clusters[:10]:
        suggestions.append({
            'title': f"Complete Guide: {cluster['topic']}",
            'type': 'pillar_content',
            'priority': 'medium',
            'keywords': cluster.get('keywords', [])[:10],
            'suggestion': f"Create pillar content covering '{cluster['topic']}' and related keywords",
            'estimated_value': 'Medium'
        })
    
    # Based on content gaps
    for gap in content_gaps.get('missing_keywords', [])[:15]:
        suggestions.append({
            'title': f"Content: {gap['keyword']}",
            'type': 'targeted_page',
            'priority': 'high',
            'keywords': [gap['keyword']],
            'suggestion': f"Create a page targeting '{gap['keyword']}' that competitors are using",
            'estimated_value': 'High'
        })
    
    # Based on transactional intent keywords
    for trans_kw in keyword_intent.get('transactional', [])[:10]:
        suggestions.append({
            'title': f"Product/Service Page: {trans_kw['keyword']}",
            'type': 'landing_page',
            'priority': 'high',
            'keywords': [trans_kw['keyword']],
            'suggestion': f"Create a landing page optimized for '{trans_kw['keyword']}' to capture transactional searches",
            'estimated_value': 'High'
        })
    
    return suggestions[:30]  # Top 30 suggestions

