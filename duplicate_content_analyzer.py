"""
Professional Duplicate Content Analyzer
Similar to Siteliner.com - Advanced similarity detection using MinHash and LSH.

Features:
- Advanced text extraction (removes HTML, scripts, styles, navigation, boilerplate)
- INCLUDES tags and categories in duplicate detection (similar to Siteliner's approach)
- Text normalization (lowercase, stopwords removal, whitespace compression)
- Shingling (n-grams) for text fingerprinting
- MinHash (Minhashing) for efficient similarity estimation
- Locality Sensitive Hashing (LSH) for fast near-duplicate detection
- Optimized for large sites (1000+ pages)
- Structured JSON output format

Techniques used (similar to Siteliner):
1. Shingling: Break text into overlapping sequences of words (n-grams)
2. MinHash: Create compact signatures that preserve Jaccard similarity
3. LSH: Group similar documents into buckets for fast comparison
4. Multiple hash functions: Use multiple permutations for better accuracy
5. Tags/Categories inclusion: Extracts and includes tags/categories in content analysis
   (from visible links, meta tags, structured data) - matches Siteliner's behavior
"""
import re
import hashlib
import random
import struct
import json
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict
import textdistance
import math

# Common English stopwords
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if',
    'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
    'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more',
    'very', 'after', 'words', 'long', 'than', 'first', 'been', 'call',
    'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get',
    'come', 'made', 'may', 'part', 'over', 'new', 'sound', 'take',
    'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me',
    'back', 'give', 'most', 'very', 'after', 'thing', 'our', 'just',
    'name', 'good', 'sentence', 'man', 'think', 'say', 'great', 'where',
    'through', 'much', 'before', 'line', 'right', 'too', 'mean', 'old',
    'any', 'same', 'tell', 'boy', 'follow', 'came', 'want', 'show',
    'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end',
    'does', 'another', 'well', 'large', 'must', 'big', 'even', 'such',
    'because', 'turn', 'here', 'why', 'ask', 'went', 'men', 'read',
    'need', 'land', 'different', 'home', 'us', 'move', 'try', 'kind',
    'hand', 'picture', 'again', 'change', 'off', 'play', 'spell', 'air',
    'away', 'animal', 'house', 'point', 'page', 'letter', 'mother',
    'answer', 'found', 'study', 'still', 'learn', 'should', 'america',
    'world', 'high', 'every', 'near', 'add', 'food', 'between', 'own',
    'below', 'country', 'plant', 'last', 'school', 'father', 'keep',
    'tree', 'never', 'start', 'city', 'earth', 'eye', 'light', 'thought',
    'head', 'under', 'story', 'saw', 'left', 'don\'t', 'few', 'while',
    'along', 'might', 'close', 'something', 'seem', 'next', 'hard',
    'open', 'example', 'begin', 'life', 'always', 'those', 'both',
    'paper', 'together', 'got', 'group', 'often', 'run', 'important',
    'until', 'children', 'side', 'feet', 'car', 'mile', 'night', 'walk',
    'white', 'sea', 'began', 'grow', 'took', 'river', 'four', 'carry',
    'state', 'once', 'book', 'hear', 'stop', 'without', 'second',
    'later', 'miss', 'idea', 'enough', 'eat', 'face', 'watch', 'far',
    'indian', 'really', 'almost', 'let', 'above', 'girl', 'sometimes',
    'mountain', 'cut', 'young', 'talk', 'soon', 'list', 'song', 'leave',
    'family', 'it\'s'
}


class MinHashLSH:
    """
    MinHash with Locality Sensitive Hashing for efficient similarity detection.
    Similar to techniques used by Siteliner.com
    """
    
    def __init__(self, num_perm: int = 128, num_bands: int = 16, rows_per_band: int = 8):
        """
        Initialize MinHash LSH.
        
        Args:
            num_perm: Number of permutations (more = more accurate, slower)
            num_bands: Number of bands for LSH (more = fewer false positives, more false negatives)
            rows_per_band: Rows per band (num_perm should be divisible by rows_per_band * num_bands)
        """
        self.num_perm = num_perm
        self.num_bands = num_bands
        self.rows_per_band = rows_per_band
        
        # Generate random hash functions (permutations)
        # Using a fixed seed for reproducibility
        random.seed(42)
        self.hash_funcs = []
        for _ in range(num_perm):
            a = random.randint(1, 2**31 - 1)
            b = random.randint(0, 2**31 - 1)
            self.hash_funcs.append((a, b))
        
        # LSH buckets: band_id -> set of document IDs
        self.lsh_buckets: Dict[int, Dict[str, Set[str]]] = {}
        for i in range(num_bands):
            self.lsh_buckets[i] = defaultdict(set)
    
    def _hash_shingle(self, shingle: str, hash_func: Tuple[int, int]) -> int:
        """Hash a shingle using a hash function."""
        a, b = hash_func
        # Use MD5 hash of shingle, then apply linear hash
        shingle_hash = int(hashlib.md5(shingle.encode('utf-8')).hexdigest(), 16)
        return (a * shingle_hash + b) % (2**31)
    
    def compute_minhash(self, shingles: Set[str]) -> List[int]:
        """
        Compute MinHash signature for a set of shingles.
        
        Args:
            shingles: Set of shingle strings
            
        Returns:
            List of minimum hash values (signature)
        """
        if not shingles:
            return [2**31 - 1] * self.num_perm
        
        signature = []
        for hash_func in self.hash_funcs:
            min_hash = 2**31 - 1
            for shingle in shingles:
                hash_val = self._hash_shingle(shingle, hash_func)
                min_hash = min(min_hash, hash_val)
            signature.append(min_hash)
        
        return signature
    
    def add_document(self, doc_id: str, signature: List[int]):
        """
        Add a document to LSH buckets.
        
        Args:
            doc_id: Document identifier (URL)
            signature: MinHash signature
        """
        # Divide signature into bands
        for band_id in range(self.num_bands):
            start_idx = band_id * self.rows_per_band
            end_idx = start_idx + self.rows_per_band
            
            if end_idx > len(signature):
                break
            
            # Create band signature (hash of the band)
            band_sig = tuple(signature[start_idx:end_idx])
            band_hash = hash(band_sig)
            
            # Add to LSH bucket
            self.lsh_buckets[band_id][band_hash].add(doc_id)
    
    def find_candidates(self, doc_id: str, signature: List[int]) -> Set[str]:
        """
        Find candidate similar documents using LSH.
        
        Args:
            doc_id: Document identifier
            signature: MinHash signature
            
        Returns:
            Set of candidate document IDs
        """
        candidates = set()
        
        # Check all bands
        for band_id in range(self.num_bands):
            start_idx = band_id * self.rows_per_band
            end_idx = start_idx + self.rows_per_band
            
            if end_idx > len(signature):
                break
            
            band_sig = tuple(signature[start_idx:end_idx])
            band_hash = hash(band_sig)
            
            # Get all documents in this bucket
            bucket = self.lsh_buckets[band_id].get(band_hash, set())
            candidates.update(bucket)
        
        # Remove self
        candidates.discard(doc_id)
        return candidates
    
    def estimate_jaccard(self, sig1: List[int], sig2: List[int]) -> float:
        """
        Estimate Jaccard similarity from MinHash signatures.
        
        Args:
            sig1: First MinHash signature
            sig2: Second MinHash signature
            
        Returns:
            Estimated Jaccard similarity (0.0-1.0)
        """
        if len(sig1) != len(sig2):
            return 0.0
        
        matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
        return matches / len(sig1) if len(sig1) > 0 else 0.0


class DuplicateContentAnalyzer:
    """
    Professional duplicate content analyzer with advanced text processing
    and efficient comparison algorithms using MinHash and LSH (similar to Siteliner).
    """
    
    def __init__(self, min_similarity: float = 0.60, shingle_size: int = 5, use_minhash: bool = True):
        """
        Initialize the analyzer.
        
        Args:
            min_similarity: Minimum similarity threshold (0.0-1.0) to report matches
            shingle_size: Size of word shingles (n-grams) for fingerprinting
            use_minhash: Whether to use MinHash+LSH (faster for large sites) or traditional methods
        """
        self.min_similarity = min_similarity
        self.shingle_size = shingle_size
        self.use_minhash = use_minhash
        
        # Traditional storage
        self.url_to_normalized_text: Dict[str, str] = {}
        self.url_to_hash: Dict[str, str] = {}
        self.hash_to_urls: Dict[str, List[str]] = defaultdict(list)
        
        # MinHash+LSH storage
        if use_minhash:
            self.minhash_lsh = MinHashLSH(num_perm=128, num_bands=16, rows_per_band=8)
            self.url_to_signature: Dict[str, List[int]] = {}
            self.url_to_shingles: Dict[str, Set[str]] = {}
        
    def normalize_text(self, text: str, remove_stopwords: bool = True) -> str:
        """
        Normalize text content for comparison.
        
        Steps:
        1. Convert to lowercase
        2. Remove HTML entities and special characters
        3. Remove stopwords (optional)
        4. Compress whitespace
        5. Strip leading/trailing whitespace
        
        Args:
            text: Raw text content
            remove_stopwords: Whether to remove common stopwords
            
        Returns:
            Normalized text string
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove HTML entities (basic)
        text = re.sub(r'&[a-z]+;', ' ', text)
        text = re.sub(r'&#\d+;', ' ', text)
        
        # Remove special characters but keep alphanumeric and spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove stopwords if requested
        if remove_stopwords:
            words = text.split()
            words = [w for w in words if w not in STOPWORDS and len(w) > 2]
            text = ' '.join(words)
        
        # Compress whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def extract_tags_and_categories(self, html_content: str) -> tuple:
        """
        Extract tags and categories from HTML content.
        Similar to Siteliner's approach - includes tags/categories in duplicate detection.
        
        Sources:
        1. Visible tag/category links on the page (WordPress-style)
        2. Meta tags (keywords, article:tag, etc.)
        3. Structured data (Schema.org, JSON-LD)
        4. URL patterns (e.g., /tag/, /category/)
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            Tuple of (tags_text, categories_text) - normalized text strings
        """
        from bs4 import BeautifulSoup
        
        if not html_content:
            return ("", "")
        
        soup = BeautifulSoup(html_content, 'lxml')
        tags = set()
        categories = set()
        
        # 1. Extract from visible tag/category links (WordPress, Joomla, etc.)
        # Common patterns: .tag, .tags, .post-tags, .category, .categories, .post-categories
        tag_selectors = [
            '.tag', '.tags', '.post-tags', '.entry-tags', '.article-tags',
            '[rel="tag"]', 'a[href*="/tag/"]', 'a[href*="/tags/"]'
        ]
        category_selectors = [
            '.category', '.categories', '.post-categories', '.entry-categories',
            '.article-categories', 'a[href*="/category/"]', 'a[href*="/categories/"]',
            'a[href*="/cat/"]'
        ]
        
        for selector in tag_selectors:
            for elem in soup.select(selector):
                text = elem.get_text(strip=True)
                if text and len(text) < 100:  # Reasonable tag length
                    tags.add(text.lower())
        
        for selector in category_selectors:
            for elem in soup.select(selector):
                text = elem.get_text(strip=True)
                if text and len(text) < 100:  # Reasonable category length
                    categories.add(text.lower())
        
        # 2. Extract from meta tags
        # Meta keywords (legacy but still used)
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords and meta_keywords.get('content'):
            keywords = meta_keywords.get('content', '').lower()
            # Split by comma and add to tags
            for kw in re.split(r'[,;]', keywords):
                kw = kw.strip()
                if kw and len(kw) < 100:
                    tags.add(kw)
        
        # Article tags (Open Graph, etc.)
        for meta in soup.find_all('meta', attrs={'property': re.compile(r'article:tag', re.I)}):
            tag = meta.get('content', '').strip().lower()
            if tag and len(tag) < 100:
                tags.add(tag)
        
        # 3. Extract from structured data (JSON-LD, Schema.org)
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    data = [data]
                elif not isinstance(data, list):
                    continue
                
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    
                    # Extract keywords/tags from various schema types
                    if 'keywords' in item:
                        keywords = item['keywords']
                        if isinstance(keywords, str):
                            for kw in re.split(r'[,;]', keywords.lower()):
                                kw = kw.strip()
                                if kw and len(kw) < 100:
                                    tags.add(kw)
                        elif isinstance(keywords, list):
                            for kw in keywords:
                                if isinstance(kw, str) and len(kw) < 100:
                                    tags.add(kw.lower().strip())
                    
                    # Extract articleSection (category)
                    if 'articleSection' in item:
                        section = item['articleSection']
                        if isinstance(section, str) and len(section) < 100:
                            categories.add(section.lower().strip())
                        elif isinstance(section, list):
                            for cat in section:
                                if isinstance(cat, str) and len(cat) < 100:
                                    categories.add(cat.lower().strip())
                    
                    # Extract about (topics/categories)
                    if 'about' in item:
                        about = item['about']
                        if isinstance(about, dict) and 'name' in about:
                            name = about['name']
                            if isinstance(name, str) and len(name) < 100:
                                categories.add(name.lower().strip())
            except (json.JSONDecodeError, KeyError, AttributeError):
                continue
        
        # 4. Extract from URL patterns (if URL is available in context)
        # This would be handled separately if URL is passed
        
        # Convert sets to normalized text strings
        tags_text = ' '.join(sorted(tags)) if tags else ""
        categories_text = ' '.join(sorted(categories)) if categories else ""
        
        return (tags_text, categories_text)
    
    def extract_visible_text(self, html_content: str, text_content: str = None) -> str:
        """
        Extract visible text from HTML, removing boilerplate.
        INCLUDES tags and categories in the extracted text (similar to Siteliner).
        
        This is a simplified version - in production, you might want to use
        more sophisticated libraries like readability-lxml or trafilatura.
        
        Args:
            html_content: Raw HTML content
            text_content: Pre-extracted text content (optional)
            
        Returns:
            Clean visible text INCLUDING tags and categories
        """
        # Extract tags and categories first
        tags_text, categories_text = self.extract_tags_and_categories(html_content)
        
        if text_content:
            # Use pre-extracted text if available, but append tags/categories
            # This ensures tags/categories are included in duplicate detection
            combined = f"{text_content} {tags_text} {categories_text}".strip()
            return combined
        
        # Basic extraction - remove script, style, nav, header, footer
        # This is a fallback if text_content is not provided
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Remove script, style, noscript
        for tag in soup(['script', 'style', 'noscript', 'meta', 'link']):
            tag.decompose()
        
        # Remove navigation, header, footer
        for tag in soup.find_all(['nav', 'header', 'footer', 'aside']):
            tag.decompose()
        
        # Try to find main content
        main_content = None
        for selector in ['main', 'article', '[role="main"]', '.content', '#content']:
            main_content = soup.select_one(selector)
            if main_content:
                break
        
        if not main_content:
            main_content = soup.body if soup.body else soup
        
        # Extract text
        text = main_content.get_text(separator=' ', strip=True) if main_content else ""
        
        # Append tags and categories to the text content
        # This ensures they're included in duplicate detection (similar to Siteliner)
        combined = f"{text} {tags_text} {categories_text}".strip()
        
        return combined
    
    def create_shingles(self, text: str) -> Set[str]:
        """
        Create word shingles (n-grams) from text.
        Similar to Siteliner's text fingerprinting technique.
        
        Args:
            text: Normalized text content
            
        Returns:
            Set of shingle strings
        """
        if not text:
            return set()
        
        words = text.split()
        if len(words) < self.shingle_size:
            # If text is shorter than shingle size, use the whole text as one shingle
            return {text}
        
        shingles = set()
        for i in range(len(words) - self.shingle_size + 1):
            shingle = ' '.join(words[i:i + self.shingle_size])
            shingles.add(shingle)
        
        return shingles
    
    def process_page(self, url: str, text_content: str, html_content: str = None) -> str:
        """
        Process a page and store normalized content.
        Uses MinHash+LSH for efficient similarity detection (similar to Siteliner).
        
        INCLUDES tags and categories in duplicate detection (similar to Siteliner's approach).
        
        Args:
            url: Page URL
            text_content: Extracted text content
            html_content: Raw HTML content (optional, for re-extraction and tag/category extraction)
            
        Returns:
            Content hash for exact duplicate detection
        """
        # Extract visible text if needed (this now includes tags/categories)
        if not text_content and html_content:
            text_content = self.extract_visible_text(html_content)
        elif text_content and html_content:
            # If we have both, extract tags/categories and append them
            # This ensures tags/categories are always included in duplicate detection
            tags_text, categories_text = self.extract_tags_and_categories(html_content)
            text_content = f"{text_content} {tags_text} {categories_text}".strip()
        elif text_content and not html_content:
            # If we only have text_content, we can't extract tags/categories
            # This is okay - the text_content should already include visible tags/categories
            pass
        
        # Normalize text (tags and categories are now part of the text)
        normalized = self.normalize_text(text_content, remove_stopwords=True)
        
        # Store normalized text
        self.url_to_normalized_text[url] = normalized
        
        # Calculate hash for exact duplicates
        content_hash = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
        self.url_to_hash[url] = content_hash
        self.hash_to_urls[content_hash].append(url)
        
        # MinHash+LSH processing
        if self.use_minhash:
            # Create shingles (includes tags/categories in the shingles)
            shingles = self.create_shingles(normalized)
            self.url_to_shingles[url] = shingles
            
            # Compute MinHash signature
            signature = self.minhash_lsh.compute_minhash(shingles)
            self.url_to_signature[url] = signature
            
            # Add to LSH buckets
            self.minhash_lsh.add_document(url, signature)
        
        return content_hash
    
    def calculate_similarity(self, text1: str, text2: str, url1: str = None, url2: str = None) -> float:
        """
        Calculate similarity between two texts using advanced techniques.
        Uses MinHash estimation if available, otherwise falls back to traditional methods.
        Similar to Siteliner's approach.
        
        Args:
            text1: First normalized text
            text2: Second normalized text
            url1: First URL (optional, for MinHash lookup)
            url2: Second URL (optional, for MinHash lookup)
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not text1 or not text2:
            return 0.0
        
        if text1 == text2:
            return 1.0
        
        # Use MinHash if available and URLs provided
        if self.use_minhash and url1 and url2:
            sig1 = self.url_to_signature.get(url1)
            sig2 = self.url_to_signature.get(url2)
            
            if sig1 and sig2:
                # Estimate Jaccard similarity from MinHash signatures
                minhash_sim = self.minhash_lsh.estimate_jaccard(sig1, sig2)
                
                # Also compute shingle-based Jaccard for verification
                shingles1 = self.url_to_shingles.get(url1, set())
                shingles2 = self.url_to_shingles.get(url2, set())
                
                if shingles1 and shingles2:
                    shingle_jaccard = len(shingles1 & shingles2) / len(shingles1 | shingles2) if (shingles1 | shingles2) else 0.0
                    # Combine MinHash estimate with actual shingle Jaccard
                    similarity = (minhash_sim * 0.7 + shingle_jaccard * 0.3)
                    return similarity
        
        # Fallback to traditional methods
        # Jaccard similarity (word-based)
        words1 = set(text1.split())
        words2 = set(text2.split())
        if words1 or words2:
            jaccard = len(words1 & words2) / len(words1 | words2) if (words1 | words2) else 0.0
        else:
            jaccard = 0.0
        
        # Shingle-based Jaccard (more accurate for content similarity)
        shingles1 = self.create_shingles(text1)
        shingles2 = self.create_shingles(text2)
        if shingles1 or shingles2:
            shingle_jaccard = len(shingles1 & shingles2) / len(shingles1 | shingles2) if (shingles1 | shingles2) else 0.0
        else:
            shingle_jaccard = 0.0
        
        # Ratcliff-Obershelp (sequence-based)
        try:
            ratcliff = textdistance.ratcliff_obershelp.normalized_similarity(text1, text2)
        except:
            ratcliff = 0.0
        
        # Weighted average (favor shingle Jaccard for content similarity)
        similarity = (shingle_jaccard * 0.5 + jaccard * 0.3 + ratcliff * 0.2)
        
        return similarity
    
    def find_duplicates(self, progress_callback=None) -> Dict[str, List[Dict[str, float]]]:
        """
        Find all duplicate content across all processed pages.
        Uses MinHash+LSH for efficient comparison (similar to Siteliner's approach).
        
        Efficient comparison strategy:
        1. First checks exact duplicates via hash
        2. Uses LSH to find candidate similar documents (avoids O(n²) comparisons)
        3. Verifies candidates with MinHash similarity estimation
        4. Falls back to traditional methods if MinHash not available
        
        Args:
            progress_callback: Optional callback function(progress, message) for progress updates
            
        Returns:
            Dictionary mapping URLs to list of matches with similarity scores
            Format: {
                "url1": [
                    {"url": "url2", "similarity": 0.92},
                    {"url": "url3", "similarity": 0.76}
                ],
                ...
            }
        """
        results = {}
        urls = list(self.url_to_normalized_text.keys())
        total = len(urls)
        
        if total == 0:
            return results
        
        # First, identify exact duplicates (same hash)
        exact_duplicates = {}
        for url in urls:
            content_hash = self.url_to_hash.get(url)
            if content_hash and len(self.hash_to_urls[content_hash]) > 1:
                duplicates = [u for u in self.hash_to_urls[content_hash] if u != url]
                if duplicates:
                    exact_duplicates[url] = duplicates
        
        # Use MinHash+LSH for efficient similarity detection
        if self.use_minhash:
            compared_pairs = set()
            
            for i, url1 in enumerate(urls):
                if progress_callback and i % 10 == 0:
                    progress = int((i / total) * 100)
                    progress_callback(progress, f'Finding similar content... {i}/{total}')
                
                matches = []
                text1 = self.url_to_normalized_text.get(url1, '')
                
                if not text1:
                    results[url1] = matches
                    continue
                
                # Check exact duplicates first
                if url1 in exact_duplicates:
                    for dup_url in exact_duplicates[url1]:
                        matches.append({"url": dup_url, "similarity": 1.0})
                
                # Use LSH to find candidate similar documents
                signature1 = self.url_to_signature.get(url1)
                if signature1:
                    candidates = self.minhash_lsh.find_candidates(url1, signature1)
                    
                    # Verify candidates with similarity calculation
                    for url2 in candidates:
                        # Avoid duplicate comparisons
                        pair_key = tuple(sorted([url1, url2]))
                        if pair_key in compared_pairs:
                            continue
                        compared_pairs.add(pair_key)
                        
                        # Skip if already exact duplicate
                        if url1 in exact_duplicates and url2 in exact_duplicates[url1]:
                            continue
                        
                        text2 = self.url_to_normalized_text.get(url2, '')
                        if not text2:
                            continue
                        
                        # Calculate similarity using MinHash
                        similarity = self.calculate_similarity(text1, text2, url1, url2)
                        
                        # Only store if above threshold
                        if similarity >= self.min_similarity:
                            matches.append({"url": url2, "similarity": round(similarity, 4)})
                
                # Sort matches by similarity (highest first)
                matches.sort(key=lambda x: x['similarity'], reverse=True)
                results[url1] = matches
        
        else:
            # Fallback to traditional method (slower but works without MinHash)
            # Group by approximate length to reduce comparisons
            length_groups = defaultdict(list)
            for url in urls:
                text = self.url_to_normalized_text.get(url, '')
                length_bucket = len(text) // 500
                length_groups[length_bucket].append(url)
            
            compared_pairs = set()
            
            for i, url1 in enumerate(urls):
                if progress_callback and i % 10 == 0:
                    progress = int((i / total) * 100)
                    progress_callback(progress, f'Comparing pages... {i}/{total}')
                
                matches = []
                text1 = self.url_to_normalized_text.get(url1, '')
                
                if not text1:
                    results[url1] = matches
                    continue
                
                # Check exact duplicates first
                if url1 in exact_duplicates:
                    for dup_url in exact_duplicates[url1]:
                        matches.append({"url": dup_url, "similarity": 1.0})
                
                # Find length bucket for this URL
                length_bucket = len(text1) // 500
                
                # Compare with URLs in same and adjacent buckets
                buckets_to_check = [length_bucket - 1, length_bucket, length_bucket + 1]
                
                for bucket in buckets_to_check:
                    if bucket not in length_groups:
                        continue
                    
                    for url2 in length_groups[bucket]:
                        if url2 == url1:
                            continue
                        
                        # Avoid duplicate comparisons
                        pair_key = tuple(sorted([url1, url2]))
                        if pair_key in compared_pairs:
                            continue
                        compared_pairs.add(pair_key)
                        
                        # Skip if already exact duplicate
                        if url1 in exact_duplicates and url2 in exact_duplicates[url1]:
                            continue
                        
                        text2 = self.url_to_normalized_text.get(url2, '')
                        if not text2:
                            continue
                        
                        # Calculate similarity
                        similarity = self.calculate_similarity(text1, text2)
                        
                        # Only store if above threshold
                        if similarity >= self.min_similarity:
                            matches.append({"url": url2, "similarity": round(similarity, 4)})
                
                # Sort matches by similarity (highest first)
                matches.sort(key=lambda x: x['similarity'], reverse=True)
                results[url1] = matches
        
        if progress_callback:
            progress_callback(100, 'Duplicate detection complete')
        
        return results
    
    def get_duplicate_clusters(self, results: Dict[str, List[Dict[str, float]]]) -> List[Dict]:
        """
        Group duplicate pages into clusters.
        
        Args:
            results: Results from find_duplicates()
            
        Returns:
            List of clusters, each containing URLs with similarity levels
        """
        clusters = []
        processed_urls = set()
        
        for url, matches in results.items():
            if url in processed_urls:
                continue
            
            if not matches:
                continue
            
            # Start a new cluster
            cluster = {
                'urls': [url],
                'similarity_level': 'unique',
                'max_similarity': 0.0
            }
            
            # Find all related URLs
            to_process = [url]
            while to_process:
                current_url = to_process.pop(0)
                if current_url in processed_urls:
                    continue
                
                processed_urls.add(current_url)
                
                # Get matches for current URL
                current_matches = results.get(current_url, [])
                for match in current_matches:
                    match_url = match['url']
                    similarity = match['similarity']
                    
                    if match_url not in cluster['urls']:
                        cluster['urls'].append(match_url)
                        to_process.append(match_url)
                    
                    if similarity > cluster['max_similarity']:
                        cluster['max_similarity'] = similarity
                    
                    # Determine similarity level
                    if similarity >= 0.95:
                        cluster['similarity_level'] = 'exact'
                    elif similarity >= 0.80:
                        if cluster['similarity_level'] != 'exact':
                            cluster['similarity_level'] = 'high'
                    elif similarity >= 0.60:
                        if cluster['similarity_level'] not in ['exact', 'high']:
                            cluster['similarity_level'] = 'moderate'
            
            if len(cluster['urls']) > 1:
                clusters.append(cluster)
        
        return clusters
    
    def categorize_similarity(self, similarity: float) -> str:
        """
        Categorize similarity score into severity levels.
        
        Args:
            similarity: Similarity score (0.0-1.0)
            
        Returns:
            Category: 'exact', 'high', 'moderate', or 'low'
        """
        if similarity >= 0.95:
            return 'exact'
        elif similarity >= 0.80:
            return 'high'
        elif similarity >= 0.60:
            return 'moderate'
        else:
            return 'low'


