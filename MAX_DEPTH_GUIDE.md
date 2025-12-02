# 📊 Max Depth Explained

## What is Max Depth?

**Max Depth** controls how many "levels" deep the crawler will go when following links on a website.

Think of it like this:
- **Depth 0**: Only the starting page (the URL you enter)
- **Depth 1**: Starting page + all pages linked directly from it
- **Depth 2**: Starting page + direct links + pages linked from those pages
- **Depth 3**: And so on...

## Visual Example

```
Starting URL: https://example.com (Depth 0)
    │
    ├── About Page (Depth 1)
    │   ├── Team Page (Depth 2)
    │   └── Contact Page (Depth 2)
    │
    ├── Products Page (Depth 1)
    │   ├── Product A (Depth 2)
    │   │   └── Product A Details (Depth 3)
    │   └── Product B (Depth 2)
    │
    └── Blog Page (Depth 1)
        ├── Post 1 (Depth 2)
        └── Post 2 (Depth 2)
```

## How to Use Max Depth

### Command Line

```bash
# Shallow crawl (only 2 levels deep)
python crawl.py https://example.com --max-depth 2

# Medium crawl (5 levels)
python crawl.py https://example.com --max-depth 5

# Deep crawl (10 levels - default)
python crawl.py https://example.com --max-depth 10
```

### Web Interface

1. Enter your website URL
2. Set "Max Depth" field (1-20)
3. Click "Start Crawling"

## Use Cases

### 1. **Quick Site Overview** (Depth 1-2)
**When to use:**
- Quick check of main pages
- Testing the crawler
- Small websites
- Fast results needed

**Example:**
```bash
python crawl.py https://example.com --max-depth 1
```
**Result:** Only homepage + main navigation pages

---

### 2. **Standard Website Audit** (Depth 3-5)
**When to use:**
- Most common use case
- Full website analysis
- Finding duplicates across sections
- Checking all main content

**Example:**
```bash
python crawl.py https://example.com --max-depth 5
```
**Result:** Homepage → Sections → Sub-pages → Content pages

---

### 3. **Deep Site Analysis** (Depth 7-10)
**When to use:**
- Large websites
- E-commerce sites with many product pages
- Blogs with many posts
- Complete site mapping

**Example:**
```bash
python crawl.py https://example.com --max-depth 10
```
**Result:** Crawls very deep into the site structure

---

### 4. **Specific Section Analysis** (Depth 2-3)
**When to use:**
- Analyzing one section of a large site
- Start from a subdirectory
- Focused content review

**Example:**
```bash
python crawl.py https://example.com/blog --max-depth 3
```
**Result:** Only crawls the blog section, 3 levels deep

---

## Real-World Examples

### Example 1: Small Business Website
```
Website: https://smallbiz.com
Structure:
  - Home (depth 0)
  - About, Services, Contact (depth 1)
  - Service Details (depth 2)

Recommended: Max Depth 2-3
```

### Example 2: E-commerce Site
```
Website: https://shop.com
Structure:
  - Home (depth 0)
  - Categories (depth 1)
  - Products (depth 2)
  - Product Details (depth 3)
  - Reviews (depth 4)

Recommended: Max Depth 4-5
```

### Example 3: News/Blog Site
```
Website: https://news.com
Structure:
  - Home (depth 0)
  - Categories (depth 1)
  - Articles (depth 2)
  - Article Pages (depth 3)

Recommended: Max Depth 3-4
```

## Choosing the Right Depth

| Website Size | Recommended Depth | Why |
|-------------|------------------|-----|
| Small (1-20 pages) | 2-3 | Covers entire site quickly |
| Medium (20-100 pages) | 4-5 | Gets most content without being too slow |
| Large (100+ pages) | 5-7 | Deep enough for analysis, not too slow |
| Very Large (1000+ pages) | 3-5 | Focus on main sections, avoid crawling everything |

## Performance Impact

**Lower Depth (1-3):**
- ✅ Faster crawling
- ✅ Less server load
- ✅ Quick results
- ❌ Might miss deeper pages

**Higher Depth (7-10):**
- ✅ More comprehensive
- ✅ Finds all pages
- ❌ Slower crawling
- ❌ More server requests
- ❌ May hit rate limits

## Tips

1. **Start Small**: Begin with depth 2-3 to test
2. **Check Results**: See if you're getting the pages you need
3. **Increase if Needed**: If important pages are missing, increase depth
4. **Consider Site Structure**: Flat sites need less depth, nested sites need more
5. **Respect Servers**: Don't use very high depth on small servers

## Common Mistakes

❌ **Too High**: Using depth 10 on a small 5-page site (wasteful)
❌ **Too Low**: Using depth 1 on a deep blog (misses content)
✅ **Just Right**: Match depth to your site's structure

## Example Workflow

1. **First Run**: Start with depth 3
   ```bash
   python crawl.py https://example.com --max-depth 3
   ```

2. **Check Results**: Look at the sitemap.txt
   - Are important pages missing? → Increase depth
   - Got everything you need? → Perfect!

3. **Adjust**: If needed, run again with different depth
   ```bash
   python crawl.py https://example.com --max-depth 5
   ```

## Summary

- **Max Depth** = How many link clicks deep to crawl
- **Lower (1-3)**: Fast, good for small sites
- **Medium (4-6)**: Balanced, good for most sites
- **Higher (7-10)**: Comprehensive, good for large sites
- **Choose based on**: Site size, structure, and your needs

Happy Crawling! 🕷️

