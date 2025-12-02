// Enhanced JavaScript for results page with all features

let reportData = null;
let charts = {};

// Load results when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();
        
        if (!data.authenticated) {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
        return;
    }
    
    // User is authenticated, proceed with loading results
    await loadResults();
    setupDownloadButtons();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', filterTable);
    document.getElementById('duplicateFilter').addEventListener('change', filterTable);
    document.getElementById('statusFilter').addEventListener('change', filterTable);
    
    // Close modal on outside click
    window.onclick = function(event) {
        const modal = document.getElementById('pageModal');
        if (event.target == modal) {
            closeModal();
        }
    }
}

// Load results from API
async function loadResults() {
    try {
        const response = await fetch(`/api/crawl-results/${jobId}`);
        if (!response.ok) {
            if (response.status === 404) {
                // Try to load from default output location as fallback
                const fallbackResponse = await fetch(`/api/crawl-results/default`);
                if (fallbackResponse.ok) {
                    reportData = await fallbackResponse.json();
                    displayAllSections(reportData);
                    return;
                }
                throw new Error('Results not found. The crawl may not have completed or the results were deleted. Please run a new crawl.');
            }
            throw new Error('Failed to load results: ' + response.statusText);
        }
        
        reportData = await response.json();
        displayAllSections(reportData);
    } catch (error) {
        console.error('Error loading results:', error);
        const errorMsg = error.message || 'Unknown error occurred';
        document.getElementById('resultsTableBody').innerHTML = 
            '<tr><td colspan="8" class="error" style="padding: 20px; text-align: center; color: #dc3545;">' + 
            '<i class="fas fa-exclamation-triangle"></i><br><br>' + errorMsg + 
            '<br><br><a href="/" class="btn btn-primary">Start New Crawl</a></td></tr>';
        
        // Also show error in other sections
        document.getElementById('brokenLinksContainer').innerHTML = 
            '<div class="error-container"><strong>Error:</strong> ' + errorMsg + '</div>';
        document.getElementById('duplicatesContainer').innerHTML = 
            '<div class="error-container"><strong>Error:</strong> ' + errorMsg + '</div>';
        document.getElementById('similarityContainer').innerHTML = 
            '<div class="error-container"><strong>Error:</strong> ' + errorMsg + '</div>';
    }
}

// Display all sections
function displayAllSections(data) {
    displayOverview(data);
    displayBrokenLinks(data);
    displayDuplicates(data);
    displaySimilarity(data);
    displayExternalLinks(data);
    displayStatistics(data);
    displayImageAnalyzer(data);
    displayKeywords(data);
    setupKeywordSearch(data);
    displayMetaSeo(data);
    displayPerformanceAnalysis(data);
    displayOrphanPages(data);
    displayAdvancedSEO(data);
    displayDOMAnalysis(data);
    // Update SEO score in summary card from Advanced SEO Audit
    updateSeoScoreSummary(data);
    
    // Debug: Log data to console
    console.log('Loaded data:', {
        totalPages: data.pages ? data.pages.length : 0,
        hasPages: !!data.pages,
        pagesArray: data.pages ? data.pages.length : 'no pages'
    });
}

// Meta tag & on-page SEO analysis section
function displayMetaSeo(data) {
    const tbody = document.getElementById('metaSeoTableBody');
    const filter = document.getElementById('metaIssueFilter');
    if (!tbody || !filter || !data.pages) return;

    // Build rows with computed meta info and issue flags
    tbody.innerHTML = '';
    data.pages.forEach(page => {
        const title = page.title || '';
        const desc = page.meta_description || '';
        const titleLen = title.length;
        const descLen = desc.length;
        const hasCanonical = !!(page.canonical_url && page.canonical_url.trim());
        const h1Count = Array.isArray(page.h1_tags) ? page.h1_tags.length : 0;
        const h2Count = Array.isArray(page.h2_tags) ? page.h2_tags.length : 0;
        const h3Count = Array.isArray(page.h3_tags) ? page.h3_tags.length : 0;
        const ogCount = page.og_tags ? Object.keys(page.og_tags).length : 0;
        const twitterCount = page.twitter_tags ? Object.keys(page.twitter_tags).length : 0;

        const issues = {
            missingTitle: titleLen === 0 || titleLen < 10,
            longTitle: titleLen > 65,
            missingDescription: descLen === 0 || descLen < 40,
            longDescription: descLen > 160,
            missingCanonical: !hasCanonical,
            missingOg: ogCount === 0,
            missingTwitter: twitterCount === 0
        };

        const tr = document.createElement('tr');
        tr.dataset.issues = JSON.stringify(issues);

        tr.innerHTML = `
            <td>
                <a href="${page.url}" target="_blank">${page.title || page.url}</a>
            </td>
            <td>${titleLen || 0}</td>
            <td>${descLen || 0}</td>
            <td>${hasCanonical ? 'Yes' : 'No'}</td>
            <td>${h1Count} / ${h2Count} / ${h3Count}</td>
            <td>${ogCount}</td>
            <td>${twitterCount}</td>
        `;

        tbody.appendChild(tr);
    });

    // Simple filter based on common SEO issues
    const applyFilter = () => {
        const value = filter.value;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const issues = JSON.parse(row.dataset.issues || '{}');
            let show = true;

            switch (value) {
                case 'missing-title':
                    show = !!issues.missingTitle;
                    break;
                case 'long-title':
                    show = !!issues.longTitle;
                    break;
                case 'missing-description':
                    show = !!issues.missingDescription;
                    break;
                case 'long-description':
                    show = !!issues.longDescription;
                    break;
                case 'missing-canonical':
                    show = !!issues.missingCanonical;
                    break;
                case 'missing-og':
                    show = !!issues.missingOg;
                    break;
                case 'missing-twitter':
                    show = !!issues.missingTwitter;
                    break;
                default:
                    show = true;
            }

            row.style.display = show ? '' : 'none';
        });
    };

    filter.addEventListener('change', applyFilter);
}

// Image analyzer section
function displayImageAnalyzer(data) {
    const missingAltContainer = document.getElementById('missingAltContainer');
    const largeImagesContainer = document.getElementById('largeImagesContainer');
    const duplicateImagesContainer = document.getElementById('duplicateImagesContainer');

    if (!missingAltContainer || !largeImagesContainer || !duplicateImagesContainer) return;

    const analysis = data.image_analysis || {};

    // Missing ALT text
    const missingAlt = analysis.missing_alt || [];
    if (missingAlt.length === 0) {
        missingAltContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No images with missing ALT text were found.</p></div>';
    } else {
        let html = '<ul class="image-list">';
        missingAlt.slice(0, 200).forEach(item => {
            html += `
                <li>
                    <div><strong>Image:</strong> <a href="${item.image_url}" target="_blank">${item.image_url}</a></div>
                    <div><strong>Page:</strong> <a href="${item.page_url}" target="_blank">${item.page_title || item.page_url}</a></div>
                </li>
            `;
        });
        if (missingAlt.length > 200) {
            html += `<li><em>... and ${missingAlt.length - 200} more</em></li>`;
        }
        html += '</ul>';
        missingAltContainer.innerHTML = html;
    }

    // Large images
    const largeImages = analysis.large_images || [];
    if (largeImages.length === 0) {
        largeImagesContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No large images detected (based on Content-Length).</p></div>';
    } else {
        let html = '<ul class="image-list">';
        largeImages.forEach(item => {
            const sizeKb = (item.size_bytes / 1024).toFixed(1);
            html += `
                <li>
                    <div><strong>Image:</strong> <a href="${item.image_url}" target="_blank">${item.image_url}</a> (${sizeKb} KB)</div>
                    <div><strong>Used on:</strong>
                        <ul>
                            ${item.pages.slice(0, 5).map(p => `
                                <li><a href="${p.page_url}" target="_blank">${p.page_title || p.page_url}</a></li>
                            `).join('')}
                            ${item.pages.length > 5 ? `<li><em>... and ${item.pages.length - 5} more pages</em></li>` : ''}
                        </ul>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        largeImagesContainer.innerHTML = html;
    }

    // Duplicate images
    const duplicateImages = analysis.duplicate_images || [];
    if (duplicateImages.length === 0) {
        duplicateImagesContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No duplicate image usage detected across pages.</p></div>';
    } else {
        let html = '<ul class="image-list">';
        duplicateImages.forEach(item => {
            html += `
                <li>
                    <div><strong>Image:</strong> <a href="${item.image_url}" target="_blank">${item.image_url}</a></div>
                    <div><strong>Used on ${item.pages.length} pages:</strong>
                        <ul>
                            ${item.pages.slice(0, 8).map(p => `
                                <li><a href="${p.page_url}" target="_blank">${p.page_title || p.page_url}</a></li>
                            `).join('')}
                            ${item.pages.length > 8 ? `<li><em>... and ${item.pages.length - 8} more pages</em></li>` : ''}
                        </ul>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        duplicateImagesContainer.innerHTML = html;
    }
}

// Display keyword analysis section
function displayKeywords(data) {
    const tbody = document.getElementById('keywordsTableBody');
    const detailsContainer = document.getElementById('keywordPageDetails');
    const pageFilter = document.getElementById('keywordPageFilter');
    const searchInput = document.getElementById('keywordSearchInput');

    if (!tbody || !detailsContainer || !pageFilter || !searchInput) return;

    const keywordAnalysis = data.keyword_analysis || {};
    const globalTop = keywordAnalysis.global_top_keywords || [];

    // Populate global keyword table
    if (globalTop.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No keyword data available. Try running a new crawl.</td></tr>';
    } else {
        tbody.innerHTML = '';
        globalTop.forEach(k => {
            const tr = document.createElement('tr');
            tr.dataset.keyword = k.keyword.toLowerCase();
            tr.innerHTML = `
                <td>${k.keyword}</td>
                <td>${k.doc_count}</td>
                <td>${k.total_count}</td>
                <td>${k.idf.toFixed(4)}</td>
            `;
            tr.onclick = () => showKeywordPages(k.keyword, data);
            tbody.appendChild(tr);
        });
    }

    // Populate page filter
    if (data.pages) {
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }

    // Filter logic
    const applyFilter = () => {
        const term = searchInput.value.toLowerCase();
        const selectedPage = pageFilter.value;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            let show = true;
            const keyword = row.dataset.keyword || '';

            if (term && !keyword.includes(term)) {
                show = false;
            }

            if (selectedPage !== 'all' && show && data.pages) {
                // Only show keywords that appear on selected page
                const page = data.pages.find(p => p.url === selectedPage);
                if (!page || !page.keywords || !page.keywords.top_keywords) {
                    show = false;
                } else {
                    const hasKeyword = page.keywords.top_keywords.some(k => k.keyword.toLowerCase() === keyword);
                    if (!hasKeyword) show = false;
                }
            }

            row.style.display = show ? '' : 'none';
        });

        // Clear details when filters change
        detailsContainer.innerHTML = '';
    };

    searchInput.addEventListener('input', applyFilter);
    pageFilter.addEventListener('change', applyFilter);
}

// Show pages where a given keyword appears, with ratios, in the keyword section
function showKeywordPages(keyword, data) {
    const container = document.getElementById('keywordPageDetails');
    if (!container || !data.pages) return;

    const lower = keyword.toLowerCase();
    const pagesWithKeyword = [];

    data.pages.forEach(page => {
        if (page.keywords && page.keywords.top_keywords) {
            const entry = page.keywords.top_keywords.find(k => k.keyword.toLowerCase() === lower);
            if (entry) {
                pagesWithKeyword.push({
                    url: page.url,
                    title: page.title,
                    word_count: page.word_count,
                    keyword_count: entry.count,
                    tf_idf: entry.tf_idf,
                    keyword_ratio: page.keywords.keyword_ratio
                });
            }
        }
    });

    if (pagesWithKeyword.length === 0) {
        container.innerHTML = `<p>No pages found using keyword "<strong>${keyword}</strong>".</p>`;
        return;
    }

    // Sort pages by TF-IDF descending
    pagesWithKeyword.sort((a, b) => b.tf_idf - a.tf_idf);

    let html = `
        <div class="keyword-detail-card">
            <h3>Pages using "<span>${keyword}</span>"</h3>
            <table class="keyword-pages-table">
                <thead>
                    <tr>
                        <th>Page</th>
                        <th>Word Count</th>
                        <th>Keyword Count</th>
                        <th>TF-IDF</th>
                        <th>Keyword Ratio</th>
                        <th>View</th>
                    </tr>
                </thead>
                <tbody>
    `;

    pagesWithKeyword.forEach(p => {
        html += `
            <tr>
                <td>
                    <a href="${p.url}" target="_blank">${p.title || p.url}</a>
                </td>
                <td>${p.word_count || 0}</td>
                <td>${p.keyword_count}</td>
                <td>${p.tf_idf.toFixed(4)}</td>
                <td>${(p.keyword_ratio * 100).toFixed(1)}%</td>
                <td>
                    <button class="action-btn action-btn-view" data-url="${p.url}"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Wire up "View" buttons to open the existing page modal with full details
    const buttons = container.querySelectorAll('button.action-btn-view');
    buttons.forEach(btn => {
        const url = btn.getAttribute('data-url');
        const page = data.pages.find(p => p.url === url);
        if (page) {
            btn.onclick = () => showPageDetails(page);
        }
    });
}

// Advanced keyword search: user enters any keyword (single or multi-word phrase) and sees counts per page
function setupKeywordSearch(data) {
    const input = document.getElementById('keywordSearchTermInput');
    const btn = document.getElementById('keywordSearchBtn');
    const tbody = document.getElementById('keywordSearchTableBody');
    if (!input || !btn || !tbody || !data.pages) return;

    const runSearch = () => {
        const rawTerm = input.value || '';
        const term = rawTerm.trim().toLowerCase();

        if (!term) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Please enter a keyword or phrase to search for.</td></tr>';
            return;
        }

        // Show loading state
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Searching...</td></tr>';

        const results = [];
        const termWords = term.split(/\s+/).filter(w => w.length > 0); // Split into words
        const isMultiWord = termWords.length > 1;

        data.pages.forEach(page => {
            // Skip pages without text content
            if (!page.text_content || !page.text_content.trim()) {
                return;
            }
            
            const pageText = page.text_content.toLowerCase();
            let count = 0;
            
            if (isMultiWord) {
                // Multi-word phrase search: count occurrences of the full phrase
                // Escape special regex characters and search for exact phrase
                try {
                    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const phraseRegex = new RegExp(escapedTerm, 'gi');
                    const matches = pageText.match(phraseRegex);
                    count = matches ? matches.length : 0;
                } catch (e) {
                    console.warn('Regex error for phrase:', term, e);
                    // Fallback: simple string count
                    count = (pageText.match(new RegExp(term, 'gi')) || []).length;
                }
            } else {
                // Single word search: try term_counts first (faster), then fallback to text search
                let foundInTermCounts = false;
                
                if (page.keywords && page.keywords.term_counts && typeof page.keywords.term_counts === 'object') {
                    // Check if term exists in term_counts (exact match, already lowercase)
                    if (term in page.keywords.term_counts) {
                        count = page.keywords.term_counts[term];
                        foundInTermCounts = true;
                    }
                }
                
                // If not found in term_counts, search text directly (handles edge cases)
                if (!foundInTermCounts) {
                    try {
                        // Use word boundary regex for exact word matches
                        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const wordRegex = new RegExp('\\b' + escapedTerm + '\\b', 'gi');
                        const matches = pageText.match(wordRegex);
                        count = matches ? matches.length : 0;
                    } catch (e) {
                        console.warn('Regex error for keyword:', term, e);
                        // Fallback: simple string count (less accurate but works)
                        const simpleMatches = pageText.split(term).length - 1;
                        count = Math.max(0, simpleMatches);
                    }
                }
            }
            
            if (count > 0) {
                const wordCount = page.word_count || 0;
                // Calculate percentage based on total words, not phrase count
                const pct = wordCount > 0 ? (count / wordCount) * 100 : 0;
                results.push({
                    url: page.url,
                    title: page.title,
                    count,
                    wordCount,
                    pct
                });
            }
        });

        if (results.length === 0) {
            const searchType = isMultiWord ? 'phrase' : 'keyword';
            tbody.innerHTML = `<tr><td colspan="5">${searchType.charAt(0).toUpperCase() + searchType.slice(1)} "<strong>${term}</strong>" was not found on any page.</td></tr>`;
            return;
        }

        // Sort by count descending
        results.sort((a, b) => b.count - a.count);

        let html = '';
        results.forEach(r => {
            html += `
                <tr>
                    <td><a href="${r.url}" target="_blank">${r.title || r.url}</a></td>
                    <td>${r.count}</td>
                    <td>${r.wordCount}</td>
                    <td>${r.pct.toFixed(2)}%</td>
                    <td>
                        <button class="action-btn action-btn-view" data-url="${r.url}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Wire "View" buttons to open modal with full details
        const buttons = tbody.querySelectorAll('button.action-btn-view');
        buttons.forEach(btnEl => {
            const url = btnEl.getAttribute('data-url');
            const page = data.pages.find(p => p.url === url);
            if (page) {
                btnEl.onclick = () => showPageDetails(page);
            }
        });
    };

    btn.addEventListener('click', runSearch);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            runSearch();
        }
    });
}

// Display overview section
function displayOverview(data) {
    // Update summary cards
    const totalPages = data.pages ? data.pages.length : 0;
    const totalPagesEl = document.getElementById('totalPages');
    if (totalPagesEl) {
        totalPagesEl.textContent = totalPages;
    }
    
    // Update broken links count
    let brokenLinksCount = 0;
    if (data.pages) {
        data.pages.forEach(page => {
            brokenLinksCount += page.broken_links ? page.broken_links.length : 0;
        });
    }
    const brokenLinksEl = document.getElementById('brokenLinks');
    if (brokenLinksEl) {
        brokenLinksEl.textContent = brokenLinksCount;
    }
    
    // Update duplicate pages count
    const duplicatePages = data.pages ? data.pages.filter(p => p.is_exact_duplicate).length : 0;
    const duplicatePagesEl = document.getElementById('duplicatePages');
    if (duplicatePagesEl) {
        duplicatePagesEl.textContent = duplicatePages;
    }
    
    // Update similar pages count
    let similarPairsCount = 0;
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.similarity_scores && Object.keys(page.similarity_scores).length > 0) {
                similarPairsCount += Object.keys(page.similarity_scores).length;
            }
        });
    }
    const similarPagesEl = document.getElementById('similarPages');
    if (similarPagesEl) {
        similarPagesEl.textContent = Math.floor(similarPairsCount / 2); // Divide by 2 since each pair is counted twice
    }
    
    // Update external links count
    let externalLinksTotal = 0;
    if (data.pages) {
        data.pages.forEach(page => {
            externalLinksTotal += page.external_links ? page.external_links.length : 0;
        });
    }
    const externalLinksEl = document.getElementById('externalLinksTotal');
    if (externalLinksEl) {
        externalLinksEl.textContent = externalLinksTotal;
    }
    
    // Populate table
    const tbody = document.getElementById('resultsTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        
        if (!data.pages || data.pages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No pages found</td></tr>';
            return;
        }
        
        data.pages.forEach((page, index) => {
            const row = createTableRow(page, index);
            tbody.appendChild(row);
        });
    }
}

// Display broken links section
function displayBrokenLinks(data) {
    const container = document.getElementById('brokenLinksContainer');
    const allBrokenLinks = [];
    
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.broken_links && page.broken_links.length > 0) {
                page.broken_links.forEach(brokenLink => {
                    allBrokenLinks.push({
                        url: brokenLink.url,
                        status: brokenLink.status,
                        status_text: brokenLink.status_text,
                        source_page: page.url,
                        source_title: page.title
                    });
                });
            }
        });
    }
    
    document.getElementById('brokenLinksCount').textContent = `${allBrokenLinks.length} found`;
    
    if (allBrokenLinks.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No broken links found! All links are working correctly.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    allBrokenLinks.forEach(link => {
        const item = document.createElement('div');
        item.className = 'broken-link-item';
        item.innerHTML = `
            <div class="broken-link-info">
                <div class="broken-link-url">
                    <a href="${link.url}" target="_blank">${link.url}</a>
                </div>
                <div class="broken-link-details">
                    <span class="status-badge status-${link.status >= 400 ? 'error' : 'redirect'}">${link.status_text || 'Error'}</span>
                </div>
                <div class="broken-link-source">
                    Found on: <strong><a href="${link.source_page}" target="_blank">${link.source_title || link.source_page}</a></strong>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Display duplicates section
function displayDuplicates(data) {
    const container = document.getElementById('duplicatesContainer');
    const duplicateGroups = {};
    
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.is_exact_duplicate && page.duplicate_urls && page.duplicate_urls.length > 0) {
                // Create a key from sorted URLs to group duplicates
                const urls = [page.url, ...page.duplicate_urls].sort();
                const key = urls.join('|');
                
                if (!duplicateGroups[key]) {
                    duplicateGroups[key] = {
                        urls: urls,
                        pages: []
                    };
                }
                
                // Add page info if not already added
                const pageInfo = {
                    url: page.url,
                    title: page.title,
                    word_count: page.word_count,
                    status_code: page.status_code
                };
                
                if (!duplicateGroups[key].pages.find(p => p.url === page.url)) {
                    duplicateGroups[key].pages.push(pageInfo);
                }
            }
        });
    }
    
    const groupCount = Object.keys(duplicateGroups).length;
    document.getElementById('duplicatesCount').textContent = `${groupCount} groups`;
    
    if (groupCount === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No duplicate pages found! All pages have unique content.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    Object.values(duplicateGroups).forEach((group, index) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'duplicate-group';
        groupDiv.innerHTML = `
            <div class="duplicate-group-header">
                <div class="duplicate-group-title">Duplicate Group ${index + 1}</div>
                <div class="duplicate-group-count">${group.pages.length} pages</div>
            </div>
            <div class="duplicate-pages-list">
                ${group.pages.map(page => `
                    <div class="duplicate-page-item">
                        <div class="duplicate-page-url">
                            <a href="${page.url}" target="_blank">${page.url}</a>
                            ${page.title ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">${page.title}</div>` : ''}
                        </div>
                        <div>
                            <span class="status-badge status-${page.status_code === 200 ? '200' : 'error'}">${page.status_code || 'Unknown'}</span>
                            <span style="margin-left: 10px; color: var(--text-muted);">${page.word_count || 0} words</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(groupDiv);
    });
}

// Display similarity section
function displaySimilarity(data) {
    const container = document.getElementById('similarityContainer');
    const similarityPairs = [];
    const processed = new Set();
    
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.similarity_scores && Object.keys(page.similarity_scores).length > 0) {
                Object.entries(page.similarity_scores).forEach(([otherUrl, similarity]) => {
                    // Avoid duplicate pairs
                    const pairKey = [page.url, otherUrl].sort().join('|');
                    if (!processed.has(pairKey) && similarity >= 40) {
                        processed.add(pairKey);
                        
                        const otherPage = data.pages.find(p => p.url === otherUrl);
                        similarityPairs.push({
                            url1: page.url,
                            title1: page.title,
                            word_count1: page.word_count,
                            text_content1: page.text_content || '',
                            url2: otherUrl,
                            title2: otherPage ? otherPage.title : '',
                            word_count2: otherPage ? otherPage.word_count : 0,
                            text_content2: otherPage ? (otherPage.text_content || '') : '',
                            similarity: similarity
                        });
                    }
                });
            }
        });
    }
    
    // Sort by similarity (highest first)
    similarityPairs.sort((a, b) => b.similarity - a.similarity);
    
    document.getElementById('similarityCount').textContent = `${similarityPairs.length} pairs`;
    
    if (similarityPairs.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No similar content found! All pages have unique content.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    similarityPairs.forEach((pair, index) => {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'similarity-pair';
        pairDiv.dataset.pairIndex = index;
        
        const similarityClass = pair.similarity >= 90 ? 'similarity-high' : 
                               pair.similarity >= 70 ? 'similarity-medium' : 'similarity-low';
        
        pairDiv.innerHTML = `
            <div class="similarity-pair-header">
                <div class="similarity-percentage ${similarityClass}">${pair.similarity.toFixed(1)}%</div>
            </div>
            <div class="similarity-pages">
                <div class="similarity-page">
                    <div class="similarity-page-url">
                        <a href="${pair.url1}" target="_blank">${pair.url1}</a>
                    </div>
                    <div class="similarity-page-details">
                        ${pair.title1 ? `<strong>${pair.title1}</strong><br>` : ''}
                        ${pair.word_count1 || 0} words
                    </div>
                </div>
                <div class="similarity-page">
                    <div class="similarity-page-url">
                        <a href="${pair.url2}" target="_blank">${pair.url2}</a>
                    </div>
                    <div class="similarity-page-details">
                        ${pair.title2 ? `<strong>${pair.title2}</strong><br>` : ''}
                        ${pair.word_count2 || 0} words
                    </div>
                </div>
            </div>
            <div class="similarity-pair-actions">
                <button class="btn btn-primary btn-sm view-similar-btn" data-pair-index="${index}">
                    <i class="fas fa-eye"></i> View Similar Words
                </button>
            </div>
        `;
        
        // Store pair data globally for access
        if (!window.similarityPairsData) {
            window.similarityPairsData = [];
        }
        window.similarityPairsData[index] = pair;
        
        // Wire up button click
        const btn = pairDiv.querySelector('.view-similar-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                showSimilarContentModal(pair);
            });
        }
        
        container.appendChild(pairDiv);
    });
}

// Display external links section
function displayExternalLinks(data) {
    const container = document.getElementById('externalLinksContainer');
    const allExternalLinks = [];
    
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.external_links && page.external_links.length > 0) {
                page.external_links.forEach(linkUrl => {
                    allExternalLinks.push({
                        url: linkUrl,
                        source_page: page.url,
                        source_title: page.title,
                        source_status: page.status_code
                    });
                });
            }
        });
    }
    
    // Remove duplicates (same URL from different pages)
    const uniqueLinks = {};
    allExternalLinks.forEach(link => {
        if (!uniqueLinks[link.url]) {
            uniqueLinks[link.url] = {
                url: link.url,
                sources: []
            };
        }
        uniqueLinks[link.url].sources.push({
            page_url: link.source_page,
            page_title: link.source_title,
            page_status: link.source_status
        });
    });
    
    const totalLinks = Object.keys(uniqueLinks).length;
    document.getElementById('externalLinksCount').textContent = `${totalLinks} unique links`;
    
    // Update summary card
    const externalLinksTotal = document.getElementById('externalLinksTotal');
    if (externalLinksTotal) {
        externalLinksTotal.textContent = totalLinks;
    }
    
    // Populate page filter
    const pageFilter = document.getElementById('externalPageFilter');
    if (pageFilter && data.pages) {
        const currentOptions = pageFilter.innerHTML;
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }
    
    if (totalLinks === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No external links found.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    Object.values(uniqueLinks).forEach((linkData, index) => {
        const linkItem = document.createElement('div');
        linkItem.className = 'external-link-item';
        linkItem.innerHTML = `
            <div class="external-link-header">
                <div class="external-link-url">
                    <i class="fas fa-external-link-alt"></i>
                    <a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${linkData.url}</a>
                </div>
                <div class="external-link-count">
                    <span class="badge badge-info">${linkData.sources.length} page${linkData.sources.length > 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="external-link-sources">
                <strong>Found on:</strong>
                <ul class="source-list">
                    ${linkData.sources.map(source => `
                        <li>
                            <a href="${source.page_url}" target="_blank">${source.page_title || source.page_url}</a>
                            <span class="source-status status-badge status-${source.page_status === 200 ? '200' : 'error'}">${source.page_status || 'Unknown'}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.appendChild(linkItem);
    });
    
    // Setup filter
    setupExternalLinksFilter();
}

// Setup external links filter
function setupExternalLinksFilter() {
    const searchInput = document.getElementById('externalSearchInput');
    const pageFilter = document.getElementById('externalPageFilter');
    
    const filterLinks = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedPage = pageFilter.value;
        
        const linkItems = document.querySelectorAll('.external-link-item');
        linkItems.forEach(item => {
            const linkUrl = item.querySelector('.external-link-url a').textContent.toLowerCase();
            const sources = item.querySelectorAll('.source-list a');
            let show = true;
            
            // Search filter
            if (searchTerm && !linkUrl.includes(searchTerm)) {
                // Check if any source page matches
                let sourceMatch = false;
                sources.forEach(source => {
                    if (source.textContent.toLowerCase().includes(searchTerm)) {
                        sourceMatch = true;
                    }
                });
                if (!sourceMatch) {
                    show = false;
                }
            }
            
            // Page filter
            if (selectedPage !== 'all') {
                let pageMatch = false;
                sources.forEach(source => {
                    if (source.href === selectedPage) {
                        pageMatch = true;
                    }
                });
                if (!pageMatch) {
                    show = false;
                }
            }
            
            item.style.display = show ? '' : 'none';
        });
    };
    
    if (searchInput) {
        searchInput.addEventListener('input', filterLinks);
    }
    if (pageFilter) {
        pageFilter.addEventListener('change', filterLinks);
    }
}

// Display statistics section
function displayStatistics(data) {
    if (!data.pages || data.pages.length === 0) return;
    
    // Status code distribution
    const statusCounts = {};
    data.pages.forEach(page => {
        const status = page.status_code || 0;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    createStatusChart(statusCounts);
    
    // Word count distribution
    const wordCounts = data.pages.map(p => p.word_count || 0);
    createWordCountChart(wordCounts);
    
    // Duplicate status
    const duplicateCounts = {
        'Unique': data.pages.filter(p => !p.is_exact_duplicate).length,
        'Exact Duplicate': data.pages.filter(p => p.is_exact_duplicate).length
    };
    createDuplicateChart(duplicateCounts);
    
    // Similarity distribution
    const similarityRanges = {
        '90-100%': 0,
        '70-89%': 0,
        '40-69%': 0,
        '<40%': 0
    };
    
    data.pages.forEach(page => {
        if (page.similarity_scores && Object.keys(page.similarity_scores).length > 0) {
            const maxSimilarity = Math.max(...Object.values(page.similarity_scores));
            if (maxSimilarity >= 90) similarityRanges['90-100%']++;
            else if (maxSimilarity >= 70) similarityRanges['70-89%']++;
            else if (maxSimilarity >= 40) similarityRanges['40-69%']++;
            else similarityRanges['<40%']++;
        } else {
            similarityRanges['<40%']++;
        }
    });
    
    createSimilarityChart(similarityRanges);
}

// Create charts
function createStatusChart(statusCounts) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    if (charts.statusChart) charts.statusChart.destroy();
    
    charts.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts).map(s => s === '200' ? '200 OK' : `Status ${s}`),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#28a745',
                    '#dc3545',
                    '#ffc107',
                    '#17a2b8',
                    '#6c757d'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function createWordCountChart(wordCounts) {
    const ctx = document.getElementById('wordCountChart');
    if (!ctx) return;
    
    // Create bins
    const bins = {
        '0-100': 0,
        '101-500': 0,
        '501-1000': 0,
        '1001-2000': 0,
        '2000+': 0
    };
    
    wordCounts.forEach(count => {
        if (count <= 100) bins['0-100']++;
        else if (count <= 500) bins['101-500']++;
        else if (count <= 1000) bins['501-1000']++;
        else if (count <= 2000) bins['1001-2000']++;
        else bins['2000+']++;
    });
    
    if (charts.wordCountChart) charts.wordCountChart.destroy();
    
    charts.wordCountChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(bins),
            datasets: [{
                label: 'Number of Pages',
                data: Object.values(bins),
                backgroundColor: '#4a90e2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDuplicateChart(duplicateCounts) {
    const ctx = document.getElementById('duplicateChart');
    if (!ctx) return;
    
    if (charts.duplicateChart) charts.duplicateChart.destroy();
    
    charts.duplicateChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(duplicateCounts),
            datasets: [{
                data: Object.values(duplicateCounts),
                backgroundColor: ['#28a745', '#ffc107']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function createSimilarityChart(similarityRanges) {
    const ctx = document.getElementById('similarityChart');
    if (!ctx) return;
    
    if (charts.similarityChart) charts.similarityChart.destroy();
    
    charts.similarityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(similarityRanges),
            datasets: [{
                label: 'Pages',
                data: Object.values(similarityRanges),
                backgroundColor: ['#dc3545', '#ffc107', '#17a2b8', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create table row
function createTableRow(page, index) {
    const tr = document.createElement('tr');
    tr.dataset.pageIndex = index;
    
    // URL
    const urlCell = document.createElement('td');
    urlCell.className = 'url-cell';
    const urlLink = document.createElement('a');
    urlLink.href = page.url;
    urlLink.target = '_blank';
    urlLink.textContent = page.url;
    urlCell.appendChild(urlLink);
    tr.appendChild(urlCell);
    
    // Status
    const statusCell = document.createElement('td');
    const status = page.status_code || 0;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge';
    if (status === 200) {
        statusBadge.className += ' status-200';
        statusBadge.textContent = '200 OK';
    } else if (status === 404) {
        statusBadge.className += ' status-404';
        statusBadge.textContent = '404 Not Found';
    } else if (status >= 300 && status < 400) {
        statusBadge.className += ' status-redirect';
        statusBadge.textContent = status + ' Redirect';
    } else if (status >= 400) {
        statusBadge.className += ' status-error';
        statusBadge.textContent = status + ' Error';
    } else {
        statusBadge.textContent = status || 'Unknown';
    }
    statusCell.appendChild(statusBadge);
    tr.appendChild(statusCell);
    
    // Title
    const titleCell = document.createElement('td');
    titleCell.textContent = page.title || '-';
    titleCell.title = page.title || '';
    tr.appendChild(titleCell);
    
    // Word Count
    const wordCountCell = document.createElement('td');
    wordCountCell.textContent = page.word_count || 0;
    tr.appendChild(wordCountCell);
    
    // Duplicate
    const duplicateCell = document.createElement('td');
    const duplicateBadge = document.createElement('span');
    duplicateBadge.className = 'duplicate-badge';
    if (page.is_exact_duplicate) {
        duplicateBadge.className += ' duplicate-yes';
        duplicateBadge.textContent = 'Yes';
    } else {
        duplicateBadge.className += ' duplicate-no';
        duplicateBadge.textContent = 'No';
    }
    duplicateCell.appendChild(duplicateBadge);
    tr.appendChild(duplicateCell);
    
    // Similarity
    const similarityCell = document.createElement('td');
    const similarityScores = page.similarity_scores || {};
    if (Object.keys(similarityScores).length > 0) {
        const maxSimilarity = Math.max(...Object.values(similarityScores));
        const similaritySpan = document.createElement('span');
        similaritySpan.className = 'similarity-score';
        if (maxSimilarity >= 90) {
            similaritySpan.className += ' similarity-high';
        } else if (maxSimilarity >= 70) {
            similaritySpan.className += ' similarity-medium';
        } else {
            similaritySpan.className += ' similarity-low';
        }
        similaritySpan.textContent = maxSimilarity.toFixed(1) + '%';
        similarityCell.appendChild(similaritySpan);
    } else {
        similarityCell.textContent = '0%';
    }
    tr.appendChild(similarityCell);
    
    // Broken Links
    const brokenLinksCell = document.createElement('td');
    const brokenCount = page.broken_links ? page.broken_links.length : 0;
    if (brokenCount > 0) {
        brokenLinksCell.innerHTML = `<span style="color: var(--danger-color); font-weight: 600;">${brokenCount}</span>`;
    } else {
        brokenLinksCell.textContent = '0';
    }
    tr.appendChild(brokenLinksCell);
    
    // Actions
    const actionsCell = document.createElement('td');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'action-btn action-btn-view';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
    viewBtn.onclick = () => showPageDetails(page);
    actionsCell.appendChild(viewBtn);
    tr.appendChild(actionsCell);
    
    // Store page data for filtering
    tr.dataset.pageData = JSON.stringify({
        url: page.url,
        isDuplicate: page.is_exact_duplicate,
        status: status,
        similarity: Object.keys(similarityScores).length > 0 ? Math.max(...Object.values(similarityScores)) : 0
    });
    
    return tr;
}

// Show page details modal
function showPageDetails(page) {
    const modal = document.getElementById('pageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = page.title || 'Page Details';
    
    const keywordSection = (page.keywords && page.keywords.top_keywords && page.keywords.top_keywords.length > 0)
        ? `
        <div class="modal-section">
            <h3><i class="fas fa-key"></i> Top Keywords</h3>
            <p><strong>Keyword Coverage Ratio:</strong> ${(page.keywords.keyword_ratio * 100).toFixed(1)}%</p>
            <ul class="modal-keywords">
                ${page.keywords.top_keywords.slice(0, 15).map(k => `
                    <li>
                        <strong>${k.keyword}</strong>
                        <span>- count: ${k.count}, TF-IDF: ${k.tf_idf.toFixed(4)}</span>
                    </li>
                `).join('')}
            </ul>
            ${page.keywords.missing_important_keywords && page.keywords.missing_important_keywords.length > 0 ? `
                <p style="margin-top: 10px;"><strong>Missing important site keywords:</strong> 
                    ${page.keywords.missing_important_keywords.slice(0, 10).join(', ')}
                </p>
            ` : ''}
        </div>
        ` : '';

    modalBody.innerHTML = `
        <div class="modal-section">
            <h3><i class="fas fa-link"></i> URL</h3>
            <p><a href="${page.url}" target="_blank">${page.url}</a></p>
        </div>
        
        <div class="modal-section">
            <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
            <p><strong>Status Code:</strong> ${page.status_code || 'Unknown'}</p>
            <p><strong>Title:</strong> ${page.title || 'N/A'}</p>
            <p><strong>Meta Description:</strong> ${page.meta_description || 'N/A'}</p>
            <p><strong>Word Count:</strong> ${page.word_count || 0}</p>
            <p><strong>Crawled At:</strong> ${page.crawled_at || 'N/A'}</p>
        </div>
        
        <div class="modal-section">
            <h3><i class="fas fa-copy"></i> Duplicate Status</h3>
            <p><strong>Is Duplicate:</strong> ${page.is_exact_duplicate ? 'Yes' : 'No'}</p>
            ${page.duplicate_urls && page.duplicate_urls.length > 0 ? `
                <p><strong>Duplicate URLs:</strong></p>
                <ul class="modal-links">
                    ${page.duplicate_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                </ul>
            ` : ''}
        </div>
        
        ${page.similarity_scores && Object.keys(page.similarity_scores).length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-project-diagram"></i> Similar Pages</h3>
                <ul class="modal-links">
                    ${Object.entries(page.similarity_scores).map(([url, similarity]) => 
                        `<li><a href="${url}" target="_blank">${url}</a> - ${similarity.toFixed(1)}% similar</li>`
                    ).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${page.broken_links && page.broken_links.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-unlink"></i> Broken Links (${page.broken_links.length})</h3>
                <ul class="modal-links">
                    ${page.broken_links.map(link => 
                        `<li><a href="${link.url}" target="_blank">${link.url}</a> - ${link.status_text || 'Error'}</li>`
                    ).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="modal-section">
            <h3><i class="fas fa-link"></i> Internal Links (${page.internal_links ? page.internal_links.length : 0})</h3>
            ${page.internal_links && page.internal_links.length > 0 ? `
                <ul class="modal-links">
                    ${page.internal_links.slice(0, 20).map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                    ${page.internal_links.length > 20 ? `<li><em>... and ${page.internal_links.length - 20} more</em></li>` : ''}
                </ul>
            ` : '<p>No internal links found.</p>'}
        </div>
        
        ${page.external_links && page.external_links.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-external-link-alt"></i> External Links (${page.external_links.length})</h3>
                <ul class="modal-links">
                    ${page.external_links.slice(0, 10).map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                    ${page.external_links.length > 10 ? `<li><em>... and ${page.external_links.length - 10} more</em></li>` : ''}
                </ul>
            </div>
        ` : ''}
        
        ${keywordSection}
        
        ${page.seo_score ? `
            <div class="modal-section">
                <h3><i class="fas fa-star"></i> SEO Score: ${page.seo_score.score}/100 (Grade ${page.seo_score.grade})</h3>
                <div class="seo-score-breakdown">
                    <h4>Score Breakdown:</h4>
                    <ul class="score-breakdown-list">
                        <li>Title Tag: ${page.seo_score.breakdown?.title || 0}/15</li>
                        <li>Meta Description: ${page.seo_score.breakdown?.meta_description || 0}/10</li>
                        <li>Content Quality: ${page.seo_score.breakdown?.content_quality || 0}/20</li>
                        <li>Headings: ${page.seo_score.breakdown?.headings || 0}/10</li>
                        <li>Internal Links: ${page.seo_score.breakdown?.internal_links || 0}/10</li>
                        <li>Images: ${page.seo_score.breakdown?.images || 0}/10</li>
                        <li>Technical SEO: ${page.seo_score.breakdown?.technical_seo || 0}/10</li>
                        <li>Performance: ${page.seo_score.breakdown?.performance || 0}/10</li>
                        ${page.seo_score.breakdown?.broken_links_penalty ? `<li style="color: #dc3545;">Broken Links Penalty: -${Math.abs(page.seo_score.breakdown.broken_links_penalty)}</li>` : ''}
                    </ul>
                </div>
                ${page.seo_score.recommendations && page.seo_score.recommendations.length > 0 ? `
                    <div class="seo-recommendations">
                        <h4>Recommendations:</h4>
                        <ul class="recommendations-list">
                            ${page.seo_score.recommendations.slice(0, 15).map(rec => {
                                const priorityClass = rec.priority || 'medium';
                                const priorityIcon = priorityClass === 'critical' ? '🔴' : priorityClass === 'high' ? '🟠' : priorityClass === 'medium' ? '🟡' : '🔵';
                                return `
                                <li class="recommendation-${priorityClass}">
                                    <strong>${priorityIcon} ${priorityClass.toUpperCase()}:</strong> ${rec.message}
                                </li>
                            `;
                            }).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        ` : ''}
        
        ${page.content_quality ? `
            <div class="modal-section">
                <h3><i class="fas fa-file-alt"></i> Content Quality</h3>
                <p><strong>Word Count:</strong> ${page.content_quality.word_count || 0}</p>
                <p><strong>Content Length Status:</strong> <span class="badge badge-${page.content_quality.content_length_status === 'excellent' ? 'success' : page.content_quality.content_length_status === 'good' ? 'info' : page.content_quality.content_length_status === 'thin' ? 'warning' : 'danger'}">${page.content_quality.content_length_status || 'unknown'}</span></p>
                ${page.content_quality.is_thin_content ? '<p style="color: #dc3545; font-weight: 600;"><strong>⚠️ Thin Content Warning:</strong> This page has less than 300 words. Consider adding more valuable content.</p>' : ''}
                ${page.content_quality.readability_score !== null ? `
                    <p><strong>Readability Score:</strong> ${page.content_quality.readability_score} (${page.content_quality.readability_grade || 'N/A'})</p>
                ` : ''}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('pageModal').style.display = 'none';
}

// Show similar content modal
function showSimilarContentModal(pair) {
    const modal = document.getElementById('similarContentModal');
    const modalBody = document.getElementById('similarContentModalBody');
    
    if (!modal || !modalBody) return;
    
    // Extract similar words/phrases
    const similarContent = findSimilarContent(pair.text_content1, pair.text_content2);
    
    modalBody.innerHTML = `
        <div class="similar-content-header">
            <div class="similar-content-info">
                <p><strong>Similarity:</strong> <span class="similarity-badge">${pair.similarity.toFixed(1)}%</span></p>
            </div>
        </div>
        
        <div class="similar-content-comparison">
            <div class="similar-content-page">
                <div class="similar-content-page-header">
                    <h3><i class="fas fa-file-alt"></i> Page 1</h3>
                    <div class="page-info">
                        <a href="${pair.url1}" target="_blank">${pair.url1}</a>
                        <p><strong>${pair.title1 || 'No Title'}</strong></p>
                        <p>${pair.word_count1 || 0} words</p>
                    </div>
                </div>
                <div class="similar-content-text">
                    ${highlightSimilarText(pair.text_content1, similarContent.commonWords, similarContent.commonPhrases)}
                </div>
            </div>
            
            <div class="similar-content-page">
                <div class="similar-content-page-header">
                    <h3><i class="fas fa-file-alt"></i> Page 2</h3>
                    <div class="page-info">
                        <a href="${pair.url2}" target="_blank">${pair.url2}</a>
                        <p><strong>${pair.title2 || 'No Title'}</strong></p>
                        <p>${pair.word_count2 || 0} words</p>
                    </div>
                </div>
                <div class="similar-content-text">
                    ${highlightSimilarText(pair.text_content2, similarContent.commonWords, similarContent.commonPhrases)}
                </div>
            </div>
        </div>
        
        <div class="similar-content-summary">
            <h4><i class="fas fa-info-circle"></i> Similar Content Summary</h4>
            <div class="summary-stats">
                <div class="summary-stat">
                    <strong>${similarContent.commonWords.length}</strong>
                    <span>Common Words</span>
                </div>
                <div class="summary-stat">
                    <strong>${similarContent.commonPhrases.length}</strong>
                    <span>Common Phrases</span>
                </div>
                <div class="summary-stat">
                    <strong>${similarContent.commonWordCount}</strong>
                    <span>Total Common Word Count</span>
                </div>
            </div>
            ${similarContent.commonWords.length > 0 ? `
                <div class="common-words-list">
                    <h5>Most Common Words:</h5>
                    <div class="words-tags">
                        ${similarContent.commonWords.slice(0, 30).map(word => `
                            <span class="word-tag">${word.word} (${word.count})</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${similarContent.commonPhrases.length > 0 ? `
                <div class="common-phrases-list">
                    <h5>Common Phrases:</h5>
                    <ul>
                        ${similarContent.commonPhrases.slice(0, 20).map(phrase => `
                            <li>"${phrase}"</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Close similar content modal
function closeSimilarContentModal() {
    document.getElementById('similarContentModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const pageModal = document.getElementById('pageModal');
    const similarModal = document.getElementById('similarContentModal');
    
    if (event.target === pageModal) {
        closeModal();
    }
    if (event.target === similarModal) {
        closeSimilarContentModal();
    }
}

// Find similar content between two texts
function findSimilarContent(text1, text2) {
    if (!text1 || !text2) {
        return { commonWords: [], commonPhrases: [], commonWordCount: 0 };
    }
    
    // Normalize texts
    const normalize = (text) => text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const normalized1 = normalize(text1);
    const normalized2 = normalize(text2);
    
    // Extract words
    const words1 = normalized1.split(/\s+/).filter(w => w.length > 2);
    const words2 = normalized2.split(/\s+/).filter(w => w.length > 2);
    
    // Count word frequencies
    const countWords = (words) => {
        const counts = {};
        words.forEach(word => {
            counts[word] = (counts[word] || 0) + 1;
        });
        return counts;
    };
    
    const counts1 = countWords(words1);
    const counts2 = countWords(words2);
    
    // Find common words
    const commonWords = [];
    const allWords = new Set([...Object.keys(counts1), ...Object.keys(counts2)]);
    
    allWords.forEach(word => {
        if (counts1[word] && counts2[word]) {
            commonWords.push({
                word: word,
                count: Math.min(counts1[word], counts2[word])
            });
        }
    });
    
    // Sort by frequency
    commonWords.sort((a, b) => b.count - a.count);
    
    // Find common phrases (2-4 word phrases)
    const extractPhrases = (text, length) => {
        const words = text.split(/\s+/);
        const phrases = [];
        for (let i = 0; i <= words.length - length; i++) {
            phrases.push(words.slice(i, i + length).join(' '));
        }
        return phrases;
    };
    
    const commonPhrases = [];
    for (let len = 4; len >= 2; len--) {
        const phrases1 = extractPhrases(normalized1, len);
        const phrases2 = extractPhrases(normalized2, len);
        const phrases1Set = new Set(phrases1);
        
        phrases2.forEach(phrase => {
            if (phrases1Set.has(phrase) && phrase.length > 10) {
                if (!commonPhrases.includes(phrase)) {
                    commonPhrases.push(phrase);
                }
            }
        });
        
        if (commonPhrases.length > 20) break; // Limit to avoid too many
    }
    
    // Calculate total common word count
    const commonWordCount = commonWords.reduce((sum, w) => sum + w.count, 0);
    
    return {
        commonWords: commonWords,
        commonPhrases: commonPhrases,
        commonWordCount: commonWordCount
    };
}

// Highlight similar text in content
function highlightSimilarText(text, commonWords, commonPhrases) {
    if (!text) return '<p class="text-muted">No content available</p>';
    
    let highlighted = text;
    
    // Highlight common phrases first (longer phrases)
    commonPhrases.slice(0, 10).forEach(phrase => {
        const regex = new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="similar-phrase">$1</mark>');
    });
    
    // Highlight common words (but not if already in a highlighted phrase)
    const topWords = commonWords.slice(0, 20).map(w => w.word);
    topWords.forEach(word => {
        // Only highlight if not already inside a mark tag
        const regex = new RegExp(`(?<!<mark[^>]*>)(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)(?![^<]*</mark>)`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="similar-word">$1</mark>');
    });
    
    // Preserve line breaks
    highlighted = highlighted.replace(/\n/g, '<br>');
    
    return `<div class="highlighted-content">${highlighted}</div>`;
}

// Filter table
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const duplicateValue = document.getElementById('duplicateFilter').value;
    const statusValue = document.getElementById('statusFilter').value;
    
    const rows = document.querySelectorAll('#resultsTableBody tr');
    rows.forEach(row => {
        if (!row.dataset.pageData) return;
        
        const pageData = JSON.parse(row.dataset.pageData);
        let show = true;
        
        // Search filter
        if (searchTerm && !pageData.url.toLowerCase().includes(searchTerm)) {
            show = false;
        }
        
        // Duplicate filter
        if (duplicateValue === 'duplicate' && !pageData.isDuplicate) {
            show = false;
        } else if (duplicateValue === 'unique' && pageData.isDuplicate) {
            show = false;
        }
        
        // Status filter
        if (statusValue === '200' && pageData.status !== 200) {
            show = false;
        } else if (statusValue === '404' && pageData.status !== 404) {
            show = false;
        } else if (statusValue === 'error' && pageData.status < 400) {
            show = false;
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(sectionName + '-section');
    if (sectionElement) {
        sectionElement.classList.add('active');
    }
    
    // Add active class to clicked tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnText = btn.textContent.toLowerCase().trim();
        const sectionMatch = sectionName.replace('-', ' ').replace('-', ' ');
        if (btnText.includes(sectionMatch) || 
            (sectionName === 'external-links' && btnText.includes('external')) ||
            (sectionName === 'broken-links' && btnText.includes('broken'))) {
            btn.classList.add('active');
        }
    });
}

// Setup download buttons
function setupDownloadButtons() {
    const baseUrl = `/api/download/${jobId}`;
    
    document.getElementById('downloadJsonBtn').onclick = () => {
        window.location.href = baseUrl + '/json';
    };
    
    document.getElementById('downloadCsvBtn').onclick = () => {
        window.location.href = baseUrl + '/csv';
    };
    
    document.getElementById('downloadSitemapBtn').onclick = () => {
        window.location.href = baseUrl + '/sitemap';
    };
    
    document.getElementById('exportReportBtn').onclick = () => {
        // Export full report as formatted text
        if (reportData) {
            const reportText = generateTextReport(reportData);
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `crawl-report-${jobId}.txt`;
            a.click();
        }
    };
}

// Generate text report
function generateTextReport(data) {
    let report = '='.repeat(80) + '\n';
    report += 'WEBSITE CRAWL REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += `Crawl Date: ${data.crawl_date || 'N/A'}\n`;
    report += `Total Pages: ${data.total_pages || 0}\n\n`;
    
    if (data.pages) {
        data.pages.forEach((page, index) => {
            report += `\n${'='.repeat(80)}\n`;
            report += `Page ${index + 1}: ${page.url}\n`;
            report += `${'='.repeat(80)}\n`;
            report += `Title: ${page.title || 'N/A'}\n`;
            report += `Status: ${page.status_code || 'Unknown'}\n`;
            report += `Word Count: ${page.word_count || 0}\n`;
            report += `Duplicate: ${page.is_exact_duplicate ? 'Yes' : 'No'}\n`;
            
            if (page.keywords && page.keywords.top_keywords && page.keywords.top_keywords.length > 0) {
                report += `Keyword Coverage Ratio: ${((page.keywords.keyword_ratio || 0) * 100).toFixed(1)}%\n`;
                report += `Top Keywords:\n`;
                page.keywords.top_keywords.slice(0, 15).forEach(k => {
                    const tfIdf = typeof k.tf_idf === 'number' ? k.tf_idf.toFixed(4) : k.tf_idf;
                    report += `  - ${k.keyword} (count: ${k.count}, TF-IDF: ${tfIdf})\n`;
                });
                if (page.keywords.missing_important_keywords && page.keywords.missing_important_keywords.length > 0) {
                    report += `Missing Important Site Keywords: ${page.keywords.missing_important_keywords.slice(0, 10).join(', ')}\n`;
                }
            }

            if (page.broken_links && page.broken_links.length > 0) {
                report += `Broken Links: ${page.broken_links.length}\n`;
            }
            report += '\n';
        });
    }
    
    return report;
}

// Display performance analysis section
function displayPerformanceAnalysis(data) {
    if (!data.pages || data.pages.length === 0) return;
    
    const heavyImagesContainer = document.getElementById('heavyImagesContainer');
    const slowJsCssContainer = document.getElementById('slowJsCssContainer');
    const slowHtmlSectionsContainer = document.getElementById('slowHtmlSectionsContainer');
    const slowComponentsContainer = document.getElementById('slowComponentsContainer');
    const renderBlockingContainer = document.getElementById('renderBlockingContainer');
    const pageFilter = document.getElementById('performancePageFilter');
    
    if (!heavyImagesContainer || !slowJsCssContainer || !slowHtmlSectionsContainer || 
        !slowComponentsContainer || !renderBlockingContainer) return;
    
    // Collect all performance data from all pages
    const allHeavyImages = [];
    const allSlowJsCss = [];
    const allSlowHtmlSections = [];
    const allSlowComponents = [];
    const allRenderBlocking = [];
    
    data.pages.forEach(page => {
        const perf = page.performance_analysis || {};
        const pageUrl = page.url;
        const pageTitle = page.title || pageUrl;
        
        // Heavy images
        if (perf.heavy_images && perf.heavy_images.length > 0) {
            perf.heavy_images.forEach(img => {
                allHeavyImages.push({
                    ...img,
                    page_url: pageUrl,
                    page_title: pageTitle
                });
            });
        }
        
        // Slow JS/CSS
        if (perf.slow_js_css && perf.slow_js_css.length > 0) {
            perf.slow_js_css.forEach(file => {
                allSlowJsCss.push({
                    ...file,
                    page_url: pageUrl,
                    page_title: pageTitle
                });
            });
        }
        
        // Slow HTML sections
        if (perf.slow_html_sections && perf.slow_html_sections.length > 0) {
            perf.slow_html_sections.forEach(section => {
                allSlowHtmlSections.push({
                    ...section,
                    page_url: pageUrl,
                    page_title: pageTitle
                });
            });
        }
        
        // Slow components
        if (perf.slow_components && perf.slow_components.length > 0) {
            perf.slow_components.forEach(component => {
                allSlowComponents.push({
                    ...component,
                    page_url: pageUrl,
                    page_title: pageTitle
                });
            });
        }
        
        // Render-blocking resources
        if (perf.render_blocking_resources && perf.render_blocking_resources.length > 0) {
            perf.render_blocking_resources.forEach(resource => {
                allRenderBlocking.push({
                    ...resource,
                    page_url: pageUrl,
                    page_title: pageTitle
                });
            });
        }
    });
    
    // Populate page filter
    if (pageFilter && data.pages) {
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }
    
    // Display heavy images
    if (allHeavyImages.length === 0) {
        heavyImagesContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No heavy images detected.</p></div>';
    } else {
        let html = '<ul class="performance-list">';
        allHeavyImages.slice(0, 50).forEach(img => {
            const sizeDisplay = img.size_mb >= 1 ? `${img.size_mb.toFixed(2)} MB` : `${img.size_kb.toFixed(2)} KB`;
            html += `
                <li class="performance-item">
                    <div class="performance-item-header">
                        <strong>${sizeDisplay}</strong>
                        <span class="badge badge-warning">Heavy</span>
                    </div>
                    <div class="performance-item-content">
                        <div><strong>Image:</strong> <a href="${img.url}" target="_blank">${img.url.substring(0, 60)}${img.url.length > 60 ? '...' : ''}</a></div>
                        <div><strong>Page:</strong> <a href="${img.page_url}" target="_blank">${img.page_title}</a></div>
                        <div><strong>Location:</strong> ${img.location}</div>
                        ${img.width && img.height ? `<div><strong>Dimensions:</strong> ${img.width}×${img.height}px</div>` : ''}
                        <div><strong>Format:</strong> ${img.format}</div>
                        <div class="performance-highlight" style="border: 2px solid #ffc107; padding: 5px; margin-top: 5px; background: #fff3cd;">
                            <strong>HTML:</strong> <code>${img.html_snippet}</code>
                        </div>
                    </div>
                </li>
            `;
        });
        if (allHeavyImages.length > 50) {
            html += `<li><em>... and ${allHeavyImages.length - 50} more heavy images</em></li>`;
        }
        html += '</ul>';
        heavyImagesContainer.innerHTML = html;
    }
    
    // Display slow JS/CSS
    if (allSlowJsCss.length === 0) {
        slowJsCssContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No large JS/CSS files detected.</p></div>';
    } else {
        let html = '<ul class="performance-list">';
        allSlowJsCss.slice(0, 30).forEach(file => {
            html += `
                <li class="performance-item">
                    <div class="performance-item-header">
                        <strong>${file.size_kb.toFixed(2)} KB</strong>
                        <span class="badge badge-info">${file.type}</span>
                    </div>
                    <div class="performance-item-content">
                        <div><strong>File:</strong> <a href="${file.url}" target="_blank">${file.url.substring(0, 60)}${file.url.length > 60 ? '...' : ''}</a></div>
                        <div><strong>Page:</strong> <a href="${file.page_url}" target="_blank">${file.page_title}</a></div>
                        ${file.is_render_blocking ? '<div><span class="badge badge-danger">Render-Blocking</span></div>' : ''}
                    </div>
                </li>
            `;
        });
        if (allSlowJsCss.length > 30) {
            html += `<li><em>... and ${allSlowJsCss.length - 30} more files</em></li>`;
        }
        html += '</ul>';
        slowJsCssContainer.innerHTML = html;
    }
    
    // Display slow HTML sections
    if (allSlowHtmlSections.length === 0) {
        slowHtmlSectionsContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No problematic HTML sections detected.</p></div>';
    } else {
        let html = '<ul class="performance-list">';
        allSlowHtmlSections.slice(0, 30).forEach(section => {
            html += `
                <li class="performance-item">
                    <div class="performance-item-header">
                        <strong>${section.element}</strong>
                        <span class="badge badge-warning">Slow</span>
                    </div>
                    <div class="performance-item-content">
                        <div><strong>Page:</strong> <a href="${section.page_url}" target="_blank">${section.page_title}</a></div>
                        <div><strong>Tag:</strong> ${section.tag}</div>
                        <div><strong>Issues:</strong> ${section.issues.join(', ')}</div>
                        <div><strong>Nesting Depth:</strong> ${section.nesting_depth} levels</div>
                        <div><strong>Children:</strong> ${section.children_count} elements</div>
                        ${section.images_count > 0 ? `<div><strong>Images:</strong> ${section.images_count}</div>` : ''}
                        <div class="performance-highlight" style="border: 2px solid #ffc107; padding: 5px; margin-top: 5px; background: #fff3cd;">
                            <strong>HTML:</strong> <code>${section.html_snippet.substring(0, 200)}${section.html_snippet.length > 200 ? '...' : ''}</code>
                        </div>
                    </div>
                </li>
            `;
        });
        if (allSlowHtmlSections.length > 30) {
            html += `<li><em>... and ${allSlowHtmlSections.length - 30} more sections</em></li>`;
        }
        html += '</ul>';
        slowHtmlSectionsContainer.innerHTML = html;
    }
    
    // Display slow components
    if (allSlowComponents.length === 0) {
        slowComponentsContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No slow components detected.</p></div>';
    } else {
        let html = '<ul class="performance-list">';
        allSlowComponents.slice(0, 30).forEach(component => {
            html += `
                <li class="performance-item">
                    <div class="performance-item-header">
                        <strong>${component.type}</strong>
                        <span class="badge badge-warning">Slow</span>
                    </div>
                    <div class="performance-item-content">
                        <div><strong>Page:</strong> <a href="${component.page_url}" target="_blank">${component.page_title}</a></div>
                        <div><strong>Location:</strong> ${component.location}</div>
                        <div><strong>Issue:</strong> ${component.issue}</div>
                        ${component.images_count !== undefined ? `<div><strong>Images:</strong> ${component.images_count}</div>` : ''}
                        ${component.rows_count !== undefined ? `<div><strong>Rows:</strong> ${component.rows_count}</div>` : ''}
                        ${component.src ? `<div><strong>Source:</strong> <a href="${component.src}" target="_blank">${component.src.substring(0, 50)}${component.src.length > 50 ? '...' : ''}</a></div>` : ''}
                    </div>
                </li>
            `;
        });
        if (allSlowComponents.length > 30) {
            html += `<li><em>... and ${allSlowComponents.length - 30} more components</em></li>`;
        }
        html += '</ul>';
        slowComponentsContainer.innerHTML = html;
    }
    
    // Display render-blocking resources
    if (allRenderBlocking.length === 0) {
        renderBlockingContainer.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No render-blocking resources detected.</p></div>';
    } else {
        let html = '<ul class="performance-list">';
        allRenderBlocking.forEach(resource => {
            html += `
                <li class="performance-item">
                    <div class="performance-item-header">
                        <strong>${resource.type}</strong>
                        <span class="badge badge-danger">Render-Blocking</span>
                    </div>
                    <div class="performance-item-content">
                        <div><strong>Resource:</strong> <a href="${resource.url}" target="_blank">${resource.url.substring(0, 60)}${resource.url.length > 60 ? '...' : ''}</a></div>
                        <div><strong>Page:</strong> <a href="${resource.page_url}" target="_blank">${resource.page_title}</a></div>
                        <div><strong>Size:</strong> ${resource.size_kb.toFixed(2)} KB</div>
                        ${resource.has_async !== undefined ? `<div><strong>Async:</strong> ${resource.has_async ? 'Yes' : 'No'}</div>` : ''}
                        ${resource.has_defer !== undefined ? `<div><strong>Defer:</strong> ${resource.has_defer ? 'Yes' : 'No'}</div>` : ''}
                        <div class="performance-suggestion">
                            <strong>💡 Suggestion:</strong> Add <code>async</code> or <code>defer</code> attribute to prevent render-blocking.
                        </div>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        renderBlockingContainer.innerHTML = html;
    }
}

// Update SEO Score in summary card from Advanced SEO Audit
function updateSeoScoreSummary(data) {
    const siteSeoScore = document.getElementById('siteSeoScore');
    if (!siteSeoScore || !data.pages) return;
    
    // Calculate average from Advanced SEO Audit
    const pagesWithAudit = data.pages.filter(p => p.advanced_seo_audit);
    if (pagesWithAudit.length > 0) {
        const totalScore = pagesWithAudit.reduce((sum, p) => sum + (p.advanced_seo_audit?.overall_score || 0), 0);
        const avgScore = Math.round(totalScore / pagesWithAudit.length);
        siteSeoScore.textContent = avgScore;
    } else {
        // Fallback to old SEO Score if available
        if (data.site_seo_score && data.site_seo_score.score) {
            siteSeoScore.textContent = data.site_seo_score.score;
        } else {
            siteSeoScore.textContent = 'N/A';
        }
    }
}

// Display orphan pages section
function displayOrphanPages(data) {
    const container = document.getElementById('orphanPagesContainer');
    const countBadge = document.getElementById('orphanPagesCount');
    
    if (!container) return;
    
    const orphanPages = data.orphan_pages || [];
    const orphanCount = orphanPages.length;
    
    if (countBadge) {
        countBadge.textContent = `${orphanCount} found`;
    }
    
    if (orphanCount === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No orphan pages found! All pages are linked internally.</p></div>';
        return;
    }
    
    // Find page details for orphan pages
    const orphanPageDetails = [];
    orphanPages.forEach(url => {
        const page = data.pages?.find(p => p.url === url);
        if (page) {
            orphanPageDetails.push({
                url: page.url,
                title: page.title,
                word_count: page.word_count,
                status_code: page.status_code,
                internal_links: (page.internal_links || []).length,
                seo_score: page.seo_score?.score
            });
        } else {
            orphanPageDetails.push({
                url: url,
                title: 'Unknown',
                word_count: 0,
                status_code: 0,
                internal_links: 0,
                seo_score: null
            });
        }
    });
    
    let html = `
        <div class="orphan-pages-info">
            <p><strong>Orphan pages</strong> are pages that have no internal links pointing to them. 
            These pages are harder for search engines to discover and may not be indexed.</p>
        </div>
        <div class="table-container">
            <table id="orphanPagesTable">
                <thead>
                    <tr>
                        <th>Page URL</th>
                        <th>Title</th>
                        <th>Word Count</th>
                        <th>Status</th>
                        <th>SEO Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    orphanPageDetails.forEach(page => {
        html += `
            <tr>
                <td><a href="${page.url}" target="_blank">${page.url}</a></td>
                <td>${page.title || '-'}</td>
                <td>${page.word_count || 0}</td>
                <td>
                    <span class="status-badge status-${page.status_code === 200 ? '200' : 'error'}">
                        ${page.status_code || 'Unknown'}
                    </span>
                </td>
                <td>
                    ${page.seo_score !== null ? `<span class="score-badge">${page.seo_score}</span>` : 'N/A'}
                </td>
                <td>
                    <button class="action-btn action-btn-view" data-url="${page.url}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="orphan-pages-suggestion">
            <h4><i class="fas fa-lightbulb"></i> Recommendations:</h4>
            <ul>
                <li>Add internal links to orphan pages from your main navigation or related content</li>
                <li>Include orphan pages in your XML sitemap</li>
                <li>Create a "Site Map" page that links to all important pages</li>
                <li>Add links to orphan pages from your homepage or category pages</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Wire up view buttons
    const viewButtons = container.querySelectorAll('button.action-btn-view');
    viewButtons.forEach(btn => {
        const url = btn.getAttribute('data-url');
        const page = data.pages?.find(p => p.url === url);
        if (page) {
            btn.onclick = () => showPageDetails(page);
        }
    });
}

// Display Advanced SEO Audit section
function displayAdvancedSEO(data) {
    const container = document.getElementById('advancedSeoContainer');
    if (!container || !data.pages) return;
    
    // Filter pages with advanced SEO audit
    const pagesWithAudit = data.pages.filter(p => p.advanced_seo_audit);
    
    if (pagesWithAudit.length === 0) {
        container.innerHTML = '<div class="info-message"><i class="fas fa-info-circle"></i><p>Advanced SEO Audit data not available. Run a new crawl to generate audit reports.</p></div>';
        return;
    }
    
    // Calculate site-wide stats
    const totalScore = pagesWithAudit.reduce((sum, p) => sum + (p.advanced_seo_audit?.overall_score || 0), 0);
    const avgScore = Math.round(totalScore / pagesWithAudit.length);
    const totalCritical = pagesWithAudit.reduce((sum, p) => sum + (p.advanced_seo_audit?.critical_issues?.length || 0), 0);
    const totalWarnings = pagesWithAudit.reduce((sum, p) => sum + (p.advanced_seo_audit?.warnings?.length || 0), 0);
    
    let html = `
        <div class="audit-summary">
            <div class="audit-summary-cards">
                <div class="audit-card">
                    <div class="audit-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="audit-card-content">
                        <h3>${avgScore}</h3>
                        <p>Average SEO Score</p>
                    </div>
                </div>
                <div class="audit-card">
                    <div class="audit-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="audit-card-content">
                        <h3>${totalCritical}</h3>
                        <p>Critical Issues</p>
                    </div>
                </div>
                <div class="audit-card">
                    <div class="audit-card-icon" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="audit-card-content">
                        <h3>${totalWarnings}</h3>
                        <p>Warnings</p>
                    </div>
                </div>
                <div class="audit-card">
                    <div class="audit-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="audit-card-content">
                        <h3>${pagesWithAudit.length}</h3>
                        <p>Pages Audited</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="audit-table-section">
            <h3>Page-by-Page SEO Audit</h3>
            <div class="section-actions">
                <select id="auditScoreFilter" class="filter-select">
                    <option value="all">All Scores</option>
                    <option value="90-100">Excellent (90-100)</option>
                    <option value="80-89">Good (80-89)</option>
                    <option value="70-79">Fair (70-79)</option>
                    <option value="0-69">Poor (0-69)</option>
                </select>
                <select id="auditIssueFilter" class="filter-select">
                    <option value="all">All Pages</option>
                    <option value="critical">Has Critical Issues</option>
                    <option value="warnings">Has Warnings</option>
                </select>
            </div>
            <div class="table-container">
                <table id="auditTable">
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>SEO Score</th>
                            <th>Title</th>
                            <th>Meta Desc</th>
                            <th>Headings</th>
                            <th>Alt Tags</th>
                            <th>Issues</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="auditTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Populate table
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    
    // Sort by score (lowest first to prioritize issues)
    const sortedPages = [...pagesWithAudit].sort((a, b) => 
        (a.advanced_seo_audit?.overall_score || 0) - (b.advanced_seo_audit?.overall_score || 0)
    );
    
    sortedPages.forEach(page => {
        const audit = page.advanced_seo_audit || {};
        const titleAnalysis = audit.title_analysis || {};
        const metaAnalysis = audit.meta_description_analysis || {};
        const headingAnalysis = audit.heading_structure || {};
        const altAnalysis = audit.alt_tags_analysis || {};
        
        const score = audit.overall_score || 0;
        const scoreClass = score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'fair' : 'poor';
        const criticalCount = audit.critical_issues?.length || 0;
        const warningsCount = audit.warnings?.length || 0;
        
        const tr = document.createElement('tr');
        tr.dataset.score = score;
        tr.dataset.hasCritical = criticalCount > 0 ? 'yes' : 'no';
        tr.dataset.hasWarnings = warningsCount > 0 ? 'yes' : 'no';
        
        tr.innerHTML = `
            <td><a href="${page.url}" target="_blank">${page.url.substring(0, 50)}${page.url.length > 50 ? '...' : ''}</a></td>
            <td>
                <span class="score-badge score-${scoreClass}">${score}</span>
            </td>
            <td>
                ${titleAnalysis.is_optimal ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-warning">⚠</span>'}
                ${titleAnalysis.length || 0} chars
            </td>
            <td>
                ${metaAnalysis.is_optimal ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-warning">⚠</span>'}
                ${metaAnalysis.length || 0} chars
            </td>
            <td>
                H1: ${headingAnalysis.h1_count || 0}, H2: ${headingAnalysis.h2_count || 0}
                ${headingAnalysis.is_valid ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-danger">✗</span>'}
            </td>
            <td>
                ${altAnalysis.alt_coverage || 0}% coverage
                ${altAnalysis.alt_coverage === 100 ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-warning">⚠</span>'}
            </td>
            <td>
                ${criticalCount > 0 ? `<span class="badge badge-danger">${criticalCount} Critical</span>` : ''}
                ${warningsCount > 0 ? `<span class="badge badge-warning">${warningsCount} Warnings</span>` : ''}
                ${criticalCount === 0 && warningsCount === 0 ? '<span class="badge badge-success">No Issues</span>' : ''}
            </td>
            <td>
                <button class="action-btn action-btn-view" data-url="${page.url}">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;
        
        // Wire up view button
        const viewBtn = tr.querySelector('button.action-btn-view');
        if (viewBtn) {
            viewBtn.onclick = () => showAdvancedSEODetails(page);
        }
        
        tbody.appendChild(tr);
    });
    
    // Setup filters
    const scoreFilter = document.getElementById('auditScoreFilter');
    const issueFilter = document.getElementById('auditIssueFilter');
    
    const applyFilters = () => {
        const scoreRange = scoreFilter.value;
        const issueType = issueFilter.value;
        
        tbody.querySelectorAll('tr').forEach(tr => {
            const pageScore = parseInt(tr.dataset.score) || 0;
            const hasCritical = tr.dataset.hasCritical === 'yes';
            const hasWarnings = tr.dataset.hasWarnings === 'yes';
            
            let show = true;
            
            // Score filter
            if (scoreRange !== 'all') {
                const [min, max] = scoreRange.split('-').map(Number);
                show = show && (pageScore >= min && pageScore <= max);
            }
            
            // Issue filter
            if (issueType === 'critical') {
                show = show && hasCritical;
            } else if (issueType === 'warnings') {
                show = show && hasWarnings;
            }
            
            tr.style.display = show ? '' : 'none';
        });
    };
    
    if (scoreFilter) scoreFilter.addEventListener('change', applyFilters);
    if (issueFilter) issueFilter.addEventListener('change', applyFilters);
}

// Show Advanced SEO Audit details modal
function showAdvancedSEODetails(page) {
    const audit = page.advanced_seo_audit;
    if (!audit) return;
    
    // Create a temporary modal or use existing page modal
    const modal = document.getElementById('pageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Advanced SEO Audit: ${page.title || page.url}`;
    
    const titleAnalysis = audit.title_analysis || {};
    const metaAnalysis = audit.meta_description_analysis || {};
    const headingAnalysis = audit.heading_structure || {};
    const altAnalysis = audit.alt_tags_analysis || {};
    const wordAnalysis = audit.word_count_analysis || {};
    const spamAnalysis = audit.spam_detection || {};
    const canonicalAnalysis = audit.canonical_analysis || {};
    const ogAnalysis = audit.og_tags_analysis || {};
    const twitterAnalysis = audit.twitter_tags_analysis || {};
    
    modalBody.innerHTML = `
        <div class="modal-section">
            <h3><i class="fas fa-star"></i> Overall SEO Score: ${audit.overall_score}/100</h3>
            <div class="score-breakdown">
                <div class="breakdown-item">
                    <strong>Title:</strong> ${titleAnalysis.score || 0}/10
                </div>
                <div class="breakdown-item">
                    <strong>Meta Description:</strong> ${metaAnalysis.score || 0}/10
                </div>
                <div class="breakdown-item">
                    <strong>Headings:</strong> ${headingAnalysis.score || 0}/10
                </div>
                <div class="breakdown-item">
                    <strong>Alt Tags:</strong> ${altAnalysis.score || 0}/10
                </div>
                <div class="breakdown-item">
                    <strong>Word Count:</strong> ${wordAnalysis.score || 0}/10
                </div>
            </div>
        </div>
        
        ${audit.critical_issues && audit.critical_issues.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-exclamation-triangle"></i> Critical Issues (${audit.critical_issues.length})</h3>
                <ul class="issues-list critical">
                    ${audit.critical_issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${audit.warnings && audit.warnings.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-exclamation-circle"></i> Warnings (${audit.warnings.length})</h3>
                <ul class="issues-list warning">
                    ${audit.warnings.slice(0, 20).map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${audit.recommendations && audit.recommendations.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-lightbulb"></i> Recommendations</h3>
                <ul class="recommendations-list">
                    ${audit.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="modal-section">
            <h3><i class="fas fa-info-circle"></i> Detailed Analysis</h3>
            <div class="detailed-analysis">
                <div class="analysis-item">
                    <h4>Title Tag</h4>
                    <p><strong>Length:</strong> ${titleAnalysis.length || 0} characters</p>
                    <p><strong>Status:</strong> ${titleAnalysis.is_optimal ? 'Optimal' : 'Needs Improvement'}</p>
                    ${titleAnalysis.issues && titleAnalysis.issues.length > 0 ? `<p><strong>Issues:</strong> ${titleAnalysis.issues.join(', ')}</p>` : ''}
                </div>
                
                <div class="analysis-item">
                    <h4>Meta Description</h4>
                    <p><strong>Length:</strong> ${metaAnalysis.length || 0} characters</p>
                    <p><strong>Status:</strong> ${metaAnalysis.is_optimal ? 'Optimal' : 'Needs Improvement'}</p>
                    ${metaAnalysis.issues && metaAnalysis.issues.length > 0 ? `<p><strong>Issues:</strong> ${metaAnalysis.issues.join(', ')}</p>` : ''}
                </div>
                
                <div class="analysis-item">
                    <h4>Heading Structure</h4>
                    <p><strong>H1:</strong> ${headingAnalysis.h1_count || 0}</p>
                    <p><strong>H2:</strong> ${headingAnalysis.h2_count || 0}</p>
                    <p><strong>H3:</strong> ${headingAnalysis.h3_count || 0}</p>
                    <p><strong>Status:</strong> ${headingAnalysis.is_valid ? 'Valid' : 'Invalid'}</p>
                </div>
                
                <div class="analysis-item">
                    <h4>Image Alt Tags</h4>
                    <p><strong>Coverage:</strong> ${altAnalysis.alt_coverage || 0}%</p>
                    <p><strong>Total Images:</strong> ${altAnalysis.total_images || 0}</p>
                    <p><strong>Missing Alt:</strong> ${altAnalysis.images_without_alt || 0}</p>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Display DOM Analysis section
function displayDOMAnalysis(data) {
    const container = document.getElementById('domAnalysisContainer');
    if (!container || !data.pages) return;
    
    // Filter pages with DOM analysis
    const pagesWithDOM = data.pages.filter(p => p.dom_analysis);
    
    if (pagesWithDOM.length === 0) {
        container.innerHTML = '<div class="info-message"><i class="fas fa-info-circle"></i><p>DOM Analysis data not available. Run a new crawl to generate DOM analysis.</p></div>';
        return;
    }
    
    // Calculate site-wide stats
    const totalNodes = pagesWithDOM.reduce((sum, p) => sum + (p.dom_analysis?.total_nodes || 0), 0);
    const avgNodes = Math.round(totalNodes / pagesWithDOM.length);
    const maxDepth = Math.max(...pagesWithDOM.map(p => p.dom_analysis?.deepest_depth || 0));
    const totalReflows = pagesWithDOM.reduce((sum, p) => sum + (p.dom_analysis?.reflow_elements?.length || 0), 0);
    const totalScore = pagesWithDOM.reduce((sum, p) => sum + (p.dom_analysis?.score || 0), 0);
    const avgScore = Math.round(totalScore / pagesWithDOM.length);
    
    let html = `
        <div class="dom-summary">
            <div class="dom-summary-cards">
                <div class="dom-card">
                    <div class="dom-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <div class="dom-card-content">
                        <h3>${avgNodes.toLocaleString()}</h3>
                        <p>Avg DOM Nodes</p>
                    </div>
                </div>
                <div class="dom-card">
                    <div class="dom-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="dom-card-content">
                        <h3>${maxDepth}</h3>
                        <p>Max Depth</p>
                    </div>
                </div>
                <div class="dom-card">
                    <div class="dom-card-icon" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
                        <i class="fas fa-sync"></i>
                    </div>
                    <div class="dom-card-content">
                        <h3>${totalReflows}</h3>
                        <p>Reflow Elements</p>
                    </div>
                </div>
                <div class="dom-card">
                    <div class="dom-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="dom-card-content">
                        <h3>${avgScore}</h3>
                        <p>DOM Quality Score</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="dom-table-section">
            <h3>Page-by-Page DOM Analysis</h3>
            <div class="table-container">
                <table id="domTable">
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>DOM Nodes</th>
                            <th>Depth</th>
                            <th>Reflow Elements</th>
                            <th>Section Warnings</th>
                            <th>Quality Score</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="domTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Populate table
    const tbody = document.getElementById('domTableBody');
    if (!tbody) return;
    
    // Sort by node count (highest first)
    const sortedPages = [...pagesWithDOM].sort((a, b) => 
        (b.dom_analysis?.total_nodes || 0) - (a.dom_analysis?.total_nodes || 0)
    );
    
    sortedPages.forEach(page => {
        const dom = page.dom_analysis || {};
        const nodeCount = dom.total_nodes || 0;
        const depth = dom.deepest_depth || 0;
        const reflows = dom.reflow_elements?.length || 0;
        const warnings = dom.section_warnings?.length || 0;
        const score = dom.score || 0;
        const scoreClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="${page.url}" target="_blank">${page.url.substring(0, 50)}${page.url.length > 50 ? '...' : ''}</a></td>
            <td>
                <span class="${nodeCount > 2000 ? 'text-danger' : nodeCount > 1000 ? 'text-warning' : 'text-success'}">
                    ${nodeCount.toLocaleString()}
                </span>
            </td>
            <td>
                <span class="${depth > 15 ? 'text-danger' : depth > 10 ? 'text-warning' : 'text-success'}">
                    ${depth} levels
                </span>
            </td>
            <td>
                ${reflows > 0 ? `<span class="badge badge-warning">${reflows}</span>` : '<span class="badge badge-success">0</span>'}
            </td>
            <td>
                ${warnings > 0 ? `<span class="badge badge-warning">${warnings}</span>` : '<span class="badge badge-success">0</span>'}
            </td>
            <td>
                <span class="score-badge score-${scoreClass}">${score}</span>
            </td>
            <td>
                <button class="action-btn action-btn-view" data-url="${page.url}">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;
        
        // Wire up view button
        const viewBtn = tr.querySelector('button.action-btn-view');
        if (viewBtn) {
            viewBtn.onclick = () => showDOMDetails(page);
        }
        
        tbody.appendChild(tr);
    });
}

// Show DOM Analysis details
function showDOMDetails(page) {
    const dom = page.dom_analysis;
    if (!dom) return;
    
    const modal = document.getElementById('pageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `DOM Analysis: ${page.title || page.url}`;
    
    modalBody.innerHTML = `
        <div class="modal-section">
            <h3><i class="fas fa-sitemap"></i> DOM Structure Overview</h3>
            <div class="dom-stats">
                <div class="stat-item">
                    <strong>Total DOM Nodes:</strong> ${(dom.total_nodes || 0).toLocaleString()}
                </div>
                <div class="stat-item">
                    <strong>Deepest Depth:</strong> ${dom.deepest_depth || 0} levels
                </div>
                <div class="stat-item">
                    <strong>DOM Quality Score:</strong> <span class="score-badge">${dom.score || 0}/100</span>
                </div>
            </div>
        </div>
        
        ${dom.reflow_elements && dom.reflow_elements.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-sync"></i> Reflow-Triggering Elements (${dom.reflow_elements.length})</h3>
                <div class="reflow-list">
                    ${dom.reflow_elements.slice(0, 20).map(el => `
                        <div class="reflow-item">
                            <strong>${el.tag}</strong>
                            ${el.id ? `<span class="badge">#${el.id}</span>` : ''}
                            ${el.class ? `<span class="badge">.${el.class.split(' ')[0]}</span>` : ''}
                            <div class="reflow-location">${el.location || 'N/A'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${dom.section_warnings && dom.section_warnings.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-exclamation-triangle"></i> Section Warnings (${dom.section_warnings.length})</h3>
                <div class="warning-list">
                    ${dom.section_warnings.map(warning => `
                        <div class="warning-item">
                            <strong>${warning.tag}</strong>
                            ${warning.id ? `<span class="badge">#${warning.id}</span>` : ''}
                            <div class="warning-details">
                                <strong>Node Count:</strong> ${warning.node_count} (max recommended: 100)
                            </div>
                            <div class="warning-location">${warning.location || 'N/A'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${dom.issues && dom.issues.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-exclamation-circle"></i> Issues</h3>
                <ul class="issues-list">
                    ${dom.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${dom.recommendations && dom.recommendations.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-lightbulb"></i> Recommendations</h3>
                <ul class="recommendations-list">
                    ${dom.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}
