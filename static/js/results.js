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

// Advanced keyword search: user enters any keyword and sees counts per page
function setupKeywordSearch(data) {
    const input = document.getElementById('keywordSearchTermInput');
    const btn = document.getElementById('keywordSearchBtn');
    const tbody = document.getElementById('keywordSearchTableBody');
    if (!input || !btn || !tbody || !data.pages) return;

    const runSearch = () => {
        const rawTerm = input.value || '';
        const term = rawTerm.trim().toLowerCase();

        if (!term) {
            tbody.innerHTML = '<tr><td colspan="5">Please enter a keyword to search for.</td></tr>';
            return;
        }

        const results = [];

        data.pages.forEach(page => {
            if (!page.keywords || !page.keywords.term_counts) return;
            const count = page.keywords.term_counts[term] || 0;
            if (count > 0) {
                const wordCount = page.word_count || 0;
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
            tbody.innerHTML = `<tr><td colspan="5">Keyword "<strong>${term}</strong>" was not found on any page.</td></tr>`;
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
    document.getElementById('totalPages').textContent = totalPages;
    
    const uniquePages = data.pages ? data.pages.filter(p => !p.is_exact_duplicate).length : 0;
    
    const duplicatePages = data.pages ? data.pages.filter(p => p.is_exact_duplicate).length : 0;
    document.getElementById('duplicatePages').textContent = duplicatePages;
    
    let brokenLinksCount = 0;
    let similarPairsCount = 0;
    if (data.pages) {
        data.pages.forEach(page => {
            brokenLinksCount += page.broken_links ? page.broken_links.length : 0;
            if (page.similarity_scores && Object.keys(page.similarity_scores).length > 0) {
                similarPairsCount += Object.keys(page.similarity_scores).length;
            }
        });
    }
    document.getElementById('brokenLinks').textContent = brokenLinksCount;
    document.getElementById('similarPages').textContent = Math.floor(similarPairsCount / 2); // Divide by 2 since each pair is counted twice
    
    // Populate table
    const tbody = document.getElementById('resultsTableBody');
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
                            url2: otherUrl,
                            title2: otherPage ? otherPage.title : '',
                            word_count2: otherPage ? otherPage.word_count : 0,
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
    similarityPairs.forEach(pair => {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'similarity-pair';
        
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
        `;
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
    `;
    
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('pageModal').style.display = 'none';
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
