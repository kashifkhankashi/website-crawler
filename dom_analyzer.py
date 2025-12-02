"""
DOM Size & Complexity Analyzer
Analyzes DOM structure for performance issues
"""
from typing import Dict, List
from bs4 import BeautifulSoup
import re


class DOMAnalyzer:
    """
    Analyze DOM structure:
    - Total DOM nodes
    - Deepest node depth
    - Elements causing reflows
    - Too many nodes in sections
    """
    
    def __init__(self):
        self.max_nodes_per_section = 100
        self.max_depth_warning = 15
        self.reflow_triggers = ['style', 'width', 'height', 'display', 'position', 'float']
    
    def analyze(self, html_content: str) -> Dict:
        """
        Analyze DOM structure.
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            Dictionary with DOM analysis results
        """
        if not html_content:
            return {
                'total_nodes': 0,
                'deepest_depth': 0,
                'reflow_elements': [],
                'section_warnings': [],
                'issues': [],
                'score': 0
            }
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Count total nodes
        total_nodes = len(soup.find_all())
        
        # Find deepest depth
        deepest_depth = self._find_deepest_depth(soup)
        
        # Find elements causing reflows
        reflow_elements = self._find_reflow_elements(soup)
        
        # Check sections with too many nodes
        section_warnings = self._check_section_complexity(soup)
        
        # Calculate score
        score = self._calculate_score(total_nodes, deepest_depth, len(reflow_elements), len(section_warnings))
        
        # Collect issues
        issues = []
        if total_nodes > 2000:
            issues.append(f'High DOM node count ({total_nodes}) - may impact performance')
        if deepest_depth > self.max_depth_warning:
            issues.append(f'Deep DOM nesting ({deepest_depth} levels) - may cause layout issues')
        if len(reflow_elements) > 10:
            issues.append(f'Many reflow-triggering elements ({len(reflow_elements)}) - may cause layout shifts')
        if section_warnings:
            issues.append(f'{len(section_warnings)} section(s) with excessive nodes')
        
        return {
            'total_nodes': total_nodes,
            'deepest_depth': deepest_depth,
            'reflow_elements': reflow_elements[:20],  # Limit to first 20
            'section_warnings': section_warnings,
            'issues': issues,
            'score': score,
            'recommendations': self._generate_recommendations(total_nodes, deepest_depth, len(reflow_elements))
        }
    
    def _find_deepest_depth(self, soup: BeautifulSoup) -> int:
        """Find the deepest nesting level in the DOM."""
        def get_depth(element, current_depth=0):
            if not element.children:
                return current_depth
            
            max_child_depth = current_depth
            for child in element.children:
                if hasattr(child, 'name') and child.name:
                    child_depth = get_depth(child, current_depth + 1)
                    max_child_depth = max(max_child_depth, child_depth)
            
            return max_child_depth
        
        return get_depth(soup)
    
    def _find_reflow_elements(self, soup: BeautifulSoup) -> List[Dict]:
        """Find elements that may cause reflows."""
        reflow_elements = []
        
        # Find elements with inline styles that trigger reflows
        for element in soup.find_all(True):
            if element.get('style'):
                style = element.get('style', '')
                if any(trigger in style.lower() for trigger in self.reflow_triggers):
                    reflow_elements.append({
                        'tag': element.name,
                        'id': element.get('id', ''),
                        'class': ' '.join(element.get('class', [])),
                        'style': style[:100],  # First 100 chars
                        'location': self._get_element_location(element)
                    })
        
        return reflow_elements
    
    def _check_section_complexity(self, soup: BeautifulSoup) -> List[Dict]:
        """Check sections for excessive node counts."""
        warnings = []
        
        # Check main sections
        section_tags = ['section', 'div', 'main', 'article', 'aside']
        
        for tag in section_tags:
            for section in soup.find_all(tag):
                node_count = len(section.find_all())
                if node_count > self.max_nodes_per_section:
                    section_id = section.get('id', '')
                    section_class = ' '.join(section.get('class', []))
                    
                    warnings.append({
                        'tag': tag,
                        'id': section_id,
                        'class': section_class,
                        'node_count': node_count,
                        'location': self._get_element_location(section)
                    })
        
        return warnings
    
    def _get_element_location(self, element) -> str:
        """Get a string representation of element location."""
        parts = []
        current = element
        
        # Walk up the tree to build location
        for _ in range(5):  # Limit depth
            if not current or not hasattr(current, 'name'):
                break
            
            location = current.name
            if current.get('id'):
                location += f"#{current.get('id')}"
            elif current.get('class'):
                location += f".{'.'.join(current.get('class', [])[:2])}"
            
            parts.insert(0, location)
            current = current.parent
        
        return ' > '.join(parts[-3:])  # Last 3 levels
    
    def _calculate_score(self, total_nodes: int, deepest_depth: int, reflow_count: int, warning_count: int) -> int:
        """Calculate DOM quality score (0-100)."""
        score = 100
        
        # Penalize high node count
        if total_nodes > 2000:
            score -= 20
        elif total_nodes > 1000:
            score -= 10
        
        # Penalize deep nesting
        if deepest_depth > 20:
            score -= 15
        elif deepest_depth > 15:
            score -= 10
        
        # Penalize reflow elements
        if reflow_count > 20:
            score -= 15
        elif reflow_count > 10:
            score -= 10
        
        # Penalize section warnings
        score -= warning_count * 5
        
        return max(0, min(100, score))
    
    def _generate_recommendations(self, total_nodes: int, deepest_depth: int, reflow_count: int) -> List[str]:
        """Generate recommendations based on analysis."""
        recommendations = []
        
        if total_nodes > 2000:
            recommendations.append('Reduce DOM node count - consider lazy loading or pagination')
        
        if deepest_depth > 15:
            recommendations.append('Reduce DOM nesting depth - simplify HTML structure')
        
        if reflow_count > 10:
            recommendations.append('Minimize inline styles that trigger reflows - use CSS classes instead')
        
        return recommendations

