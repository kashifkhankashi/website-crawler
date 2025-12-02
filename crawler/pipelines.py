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


class DuplicateDetectionPipeline:
    """
    Pipeline to detect exact and near-duplicate content.
    """
    
    def __init__(self):
        self.hash_to_urls: Dict[str, List[str]] = {}  # hash -> list of URLs
        self.url_to_content: Dict[str, str] = {}  # url -> normalized content
        self.processed_items: List[PageItem] = []  # Store all items for similarity comparison
    
    def process_item(self, item: PageItem, spider) -> PageItem:
        """
        Detect duplicates for the current item.
        
        Args:
            item: The PageItem to check for duplicates
            spider: The spider that scraped this item
            
        Returns:
            PageItem with duplicate information added
        """
        url = item['url']
        content_hash = item.get('content_hash', '')
        text_content = item.get('text_content', '')
        
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
        
        # Calculate similarity scores with previously processed pages
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
        """
        pass


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
        
        # Collect internal links
        for link in item.get('internal_links', []):
            _collected_links.add(link)
        
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
