"""
Item pipelines for processing crawled data.
"""
import hashlib
import re
from typing import Dict, List, Set
from datetime import datetime
from difflib import SequenceMatcher

from crawler.items import PageItem


# Global storage for collected items (used by crawl.py)
_collected_items = []
_collected_links = set()

# Progress tracking
_progress_callback = None
_total_pages_estimate = 0


class ContentProcessingPipeline:
    """
    Pipeline to process and normalize content from crawled pages.
    """
    
    def __init__(self):
        self.content_hashes: Dict[str, str] = {}  # url -> hash mapping
    
    def process_item(self, item: PageItem, spider) -> PageItem:
        """
        Process item: normalize text, calculate hash, count words.
        
        Args:
            item: The PageItem to process
            spider: The spider that scraped this item
            
        Returns:
            Processed PageItem
        """
        # Normalize text content
        normalized_text = self._normalize_text(item.get('text_content', ''))
        item['text_content'] = normalized_text
        
        # Calculate word count
        words = normalized_text.split()
        item['word_count'] = len(words)
        
        # Calculate content hash (SHA256)
        content_hash = hashlib.sha256(normalized_text.encode('utf-8')).hexdigest()
        item['content_hash'] = content_hash
        
        # Store hash for duplicate detection
        self.content_hashes[item['url']] = content_hash
        
        # Add timestamp
        item['crawled_at'] = datetime.now().isoformat()
        
        # Report progress
        self._report_progress()
        
        return item
    
    def _normalize_text(self, text: str) -> str:
        """
        Normalize text: lowercase, remove extra spaces, clean up.
        
        Args:
            text: Raw text to normalize
            
        Returns:
            Normalized text string
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def _report_progress(self):
        """Report progress to callback if available."""
        global _progress_callback, _total_pages_estimate
        if _progress_callback and callable(_progress_callback):
            pages_crawled = len(_collected_items) + 1  # +1 for current item
            # Estimate progress: 30% for crawling, 70% for processing
            if _total_pages_estimate > 0:
                crawl_progress = min(30, (pages_crawled / _total_pages_estimate) * 30)
            else:
                crawl_progress = min(25, pages_crawled * 2)  # 2% per page up to 25%
            
            try:
                _progress_callback({
                    'progress': int(crawl_progress),
                    'pages_crawled': pages_crawled,
                    'message': f'Crawling... Found {pages_crawled} pages'
                })
            except:
                pass


class DuplicateDetectionPipeline:
    """
    Pipeline to detect exact and near-duplicate content.
    Uses advanced MinHash+LSH techniques similar to Siteliner for efficient detection.
    """
    
    def __init__(self):
        self.hash_to_urls: Dict[str, List[str]] = {}  # hash -> list of URLs
        self.url_to_content: Dict[str, str] = {}  # url -> normalized content
        self.processed_items: List[PageItem] = []  # Store all items for similarity comparison
        
        # Try to use advanced DuplicateContentAnalyzer if available
        self.advanced_analyzer = None
        try:
            import sys
            import os as os_module
            current_dir = os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__)))
            sys.path.insert(0, current_dir)
            from duplicate_content_analyzer import DuplicateContentAnalyzer
            # Use MinHash+LSH for efficient similarity detection (similar to Siteliner)
            self.advanced_analyzer = DuplicateContentAnalyzer(min_similarity=0.40, use_minhash=True)
        except (ImportError, Exception) as e:
            # Fallback to basic method if advanced analyzer not available
            self.advanced_analyzer = None
    
    def process_item(self, item: PageItem, spider) -> PageItem:
        """
        Detect duplicates for the current item.
        Uses advanced MinHash+LSH if available, otherwise falls back to basic method.
        
        Args:
            item: The PageItem to check for duplicates
            spider: The spider that scraped this item
            
        Returns:
            PageItem with duplicate information added
        """
        url = item['url']
        content_hash = item.get('content_hash', '')
        text_content = item.get('text_content', '')
        html_content = item.get('html_content', '')
        
        # Store content for similarity comparison
        self.url_to_content[url] = text_content
        
        # Group URLs by content hash (exact duplicates)
        if content_hash:
            if content_hash not in self.hash_to_urls:
                self.hash_to_urls[content_hash] = []
            self.hash_to_urls[content_hash].append(url)
        
        # Check for exact duplicates
        duplicate_urls = []
        if content_hash in self.hash_to_urls:
            duplicate_urls = [
                u for u in self.hash_to_urls[content_hash] 
                if u != url
            ]
        
        item['is_duplicate'] = len(duplicate_urls) > 0
        item['duplicate_urls'] = duplicate_urls
        
        # Use advanced analyzer if available (MinHash+LSH similar to Siteliner)
        if self.advanced_analyzer:
            try:
                # Process page with advanced analyzer (includes tags/categories in content)
                self.advanced_analyzer.process_page(url, text_content, html_content)
                
                # Update stored content with normalized version that includes tags/categories
                # The analyzer's process_page method now includes tags/categories in normalization
                normalized_with_tags = self.advanced_analyzer.url_to_normalized_text.get(url, text_content)
                self.url_to_content[url] = normalized_with_tags
                
                # Find candidates using LSH
                signature = self.advanced_analyzer.url_to_signature.get(url)
                if signature:
                    candidates = self.advanced_analyzer.minhash_lsh.find_candidates(url, signature)
                    
                    # Calculate similarity for candidates
                    similarity_scores = {}
                    text1 = normalized_with_tags  # Use normalized text with tags/categories
                    for candidate_url in candidates:
                        # Get normalized text (with tags/categories) for candidate
                        text2 = self.advanced_analyzer.url_to_normalized_text.get(candidate_url, '')
                        if not text2:
                            text2 = self.url_to_content.get(candidate_url, '')
                        if text2:
                            similarity = self.advanced_analyzer.calculate_similarity(
                                text1, text2, url, candidate_url
                            )
                            if similarity >= 0.40:  # Only store if similarity >= 40%
                                similarity_scores[candidate_url] = round(similarity * 100, 2)
                    
                    item['similarity_scores'] = similarity_scores
                else:
                    item['similarity_scores'] = {}
            except Exception as e:
                # Fallback to basic method if advanced analyzer fails
                similarity_scores = {}
                for processed_item in self.processed_items:
                    other_url = processed_item['url']
                    other_content = self.url_to_content.get(other_url, '')
                    
                    if other_content and text_content:
                        similarity = self._calculate_similarity(text_content, other_content)
                        if similarity > 0.4:
                            similarity_scores[other_url] = round(similarity * 100, 2)
                
                item['similarity_scores'] = similarity_scores
        else:
            # Fallback to basic method
            similarity_scores = {}
            for processed_item in self.processed_items:
                other_url = processed_item['url']
                other_content = self.url_to_content.get(other_url, '')
                
                if other_content and text_content:
                    similarity = self._calculate_similarity(text_content, other_content)
                    if similarity > 0.4:  # Only store if similarity > 40%
                        similarity_scores[other_url] = round(similarity * 100, 2)
            
            item['similarity_scores'] = similarity_scores
        
        # Store this item for future comparisons
        self.processed_items.append(item)
        
        return item
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two text strings using SequenceMatcher.
        
        Args:
            text1: First text string
            text2: Second text string
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not text1 or not text2:
            return 0.0
        
        # Use SequenceMatcher for similarity calculation
        matcher = SequenceMatcher(None, text1, text2)
        return matcher.ratio()
    
    def close_spider(self, spider):
        """
        Called when spider closes. Can be used for final processing.
        Performs final similarity analysis using advanced techniques if available.
        """
        # If advanced analyzer is available, perform final comprehensive analysis
        if self.advanced_analyzer and len(self.processed_items) > 0:
            try:
                # Re-analyze all items with comprehensive MinHash+LSH
                # This ensures we catch all similarities that might have been missed during incremental processing
                print(f"Performing final similarity analysis using MinHash+LSH (similar to Siteliner)...")
                
                # Find all duplicates using advanced method
                def progress_callback(progress, message):
                    if progress % 20 == 0:
                        print(f"Similarity analysis: {progress}% - {message}")
                
                duplicate_results = self.advanced_analyzer.find_duplicates(progress_callback)
                
                # Update items with enhanced similarity scores
                for item in self.processed_items:
                    url = item['url']
                    if url in duplicate_results:
                        matches = duplicate_results[url]
                        # Convert to similarity_scores format (percentage)
                        enhanced_scores = {
                            match['url']: round(match['similarity'] * 100, 2)
                            for match in matches
                        }
                        # Merge with existing scores, keeping the higher value
                        existing_scores = item.get('similarity_scores', {})
                        for match_url, score in enhanced_scores.items():
                            existing_score = existing_scores.get(match_url, 0)
                            item['similarity_scores'][match_url] = max(existing_score, score)
                
                print("Final similarity analysis complete.")
            except Exception as e:
                print(f"Warning: Final similarity analysis failed: {e}")
                # Continue without enhanced analysis


class ItemStoragePipeline:
    """
    Pipeline to store all processed items for later retrieval.
    """
    
    def process_item(self, item: PageItem, spider) -> PageItem:
        """
        Store item and collect links.
        
        Args:
            item: The PageItem to store
            spider: The spider that scraped this item
            
        Returns:
            The same item (pass-through)
        """
        # Store item
        _collected_items.append(dict(item))
        
        # Collect internal links (handle both string and dict formats)
        for link in item.get('internal_links', []):
            # Extract URL from dict format or use string directly
            if isinstance(link, dict):
                link_url = link.get('url', '')
                if link_url:
                    _collected_links.add(link_url)
            elif isinstance(link, str):
                _collected_links.add(link)
            else:
                # Fallback: convert to string
                try:
                    _collected_links.add(str(link))
                except (TypeError, ValueError):
                    pass
        
        return item
    
    @staticmethod
    def get_collected_items() -> List[dict]:
        """Get all collected items."""
        return _collected_items
    
    @staticmethod
    def get_collected_links() -> Set[str]:
        """Get all collected internal links."""
        return _collected_links
    
    @staticmethod
    def clear():
        """Clear collected items and links."""
        global _collected_items, _collected_links
        _collected_items = []
        _collected_links = set()
    
    @staticmethod
    def set_progress_callback(callback):
        """Set callback function for progress updates."""
        global _progress_callback
        _progress_callback = callback
    
    @staticmethod
    def set_total_pages_estimate(estimate: int):
        """Set estimated total pages for progress calculation."""
        global _total_pages_estimate
        _total_pages_estimate = estimate
