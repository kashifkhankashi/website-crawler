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
    try {
        displaySummaryReport(data);
    } catch (e) {
        console.error('Error displaying summary report:', e);
    }
    
    try {
        displayOverview(data);
    } catch (e) {
        console.error('Error displaying overview:', e);
    }
    
    try {
        displayBrokenLinks(data);
    } catch (e) {
        console.error('Error displaying broken links:', e);
    }
    
    try {
        displayDuplicates(data);
    } catch (e) {
        console.error('Error displaying duplicates:', e);
    }
    
    try {
        displaySimilarity(data);
    } catch (e) {
        console.error('Error displaying similarity:', e);
    }
    
    try {
        displayExternalLinks(data);
    } catch (e) {
        console.error('Error displaying external links:', e);
    }
    
    try {
        displayStatistics(data);
    } catch (e) {
        console.error('Error displaying statistics:', e);
    }
    
    try {
        displayImageAnalyzer(data);
    } catch (e) {
        console.error('Error displaying image analyzer:', e);
    }
    
    try {
        displayKeywords(data);
        setupKeywordSearch(data);
    } catch (e) {
        console.error('Error displaying keywords:', e);
    }
    
    try {
        displayMetaSeo(data);
    } catch (e) {
        console.error('Error displaying meta SEO:', e);
    }
    
    try {
        displayPerformanceAnalysis(data);
    } catch (e) {
        console.error('Error displaying performance analysis:', e);
        // Show error in performance container
        const perfContainer = document.getElementById('heavyImagesContainer');
        if (perfContainer) {
            perfContainer.innerHTML = '<div class="error">Error loading performance analysis. Please check console for details.</div>';
        }
    }
    
    try {
        displayOrphanPages(data);
    } catch (e) {
        console.error('Error displaying orphan pages:', e);
    }
    
    try {
        displayPagePower(data);
    } catch (e) {
        console.error('Error displaying page power:', e);
    }
    
    try {
        displayAdvancedSEO(data);
        displaySkippedPages(data);
    } catch (e) {
        console.error('Error displaying advanced SEO:', e);
    }
    
    try {
        displayDOMAnalysis(data);
    } catch (e) {
        console.error('Error displaying DOM analysis:', e);
    }
    
    try {
        updateSeoScoreSummary(data);
    } catch (e) {
        console.error('Error updating SEO score:', e);
    }
    
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
    if (!data || !data.pages) return;
    
    // Collect all images from all pages with full details
    const allImages = [];
    const imageMap = new Map(); // src -> image data
    const imageUsage = new Map(); // src -> array of pages using it
    
    data.pages.forEach(page => {
        if (page.images && Array.isArray(page.images)) {
            page.images.forEach(img => {
                const src = img.src || img.url || '';
                if (!src) return;
                
                // Get image format from URL
                const format = getImageFormat(src);
                
                // Check for issues
                const alt = (img.alt || '').trim();
                const hasAlt = alt.length > 0;
                const width = img.width || null;
                const height = img.height || null;
                const hasDimensions = width && height;
                
                // Detect low quality (small dimensions)
                const isLowQuality = hasDimensions && (width < 200 || height < 200);
                
                // Get size from performance analysis if available
                let sizeBytes = 0;
                let sizeKb = 0;
                if (page.performance_analysis && page.performance_analysis.heavy_images) {
                    const heavyImg = page.performance_analysis.heavy_images.find(hi => hi.url === src);
                    if (heavyImg) {
                        sizeBytes = heavyImg.size_bytes || 0;
                        sizeKb = heavyImg.size_kb || 0;
                    }
                }
                
                // Check if large (over 300KB)
                const isLarge = sizeBytes > 300 * 1024 || sizeKb > 300;
                
                // Track image usage
                if (!imageUsage.has(src)) {
                    imageUsage.set(src, []);
                }
                imageUsage.get(src).push({
                    url: page.url,
                    title: page.title || page.url
                });
                
                // Create image entry
                const imageEntry = {
                    src: src,
                    alt: alt,
                    hasAlt: hasAlt,
                    width: width,
                    height: height,
                    hasDimensions: hasDimensions,
                    isLowQuality: isLowQuality,
                    format: format,
                    sizeBytes: sizeBytes,
                    sizeKb: sizeKb,
                    isLarge: isLarge,
                    pageUrl: page.url,
                    pageTitle: page.title || page.url,
                    issues: []
                };
                
                // Collect issues
                if (!hasAlt) imageEntry.issues.push('missing-alt');
                if (isLarge) imageEntry.issues.push('large');
                if (isLowQuality) imageEntry.issues.push('low-quality');
                if (!hasDimensions) imageEntry.issues.push('no-dimensions');
                
                allImages.push(imageEntry);
                
                // Store in map for duplicate detection
                if (!imageMap.has(src)) {
                    imageMap.set(src, imageEntry);
                }
            });
        }
    });
    
    // Mark duplicates
    imageUsage.forEach((pages, src) => {
        if (pages.length > 1 && imageMap.has(src)) {
            imageMap.get(src).isDuplicate = true;
            imageMap.get(src).usageCount = pages.length;
            imageMap.get(src).issues.push('duplicate');
        }
    });
    
    // Update all images to mark duplicates
    allImages.forEach(img => {
        if (imageUsage.get(img.src) && imageUsage.get(img.src).length > 1) {
            img.isDuplicate = true;
            img.usageCount = imageUsage.get(img.src).length;
            if (!img.issues.includes('duplicate')) {
                img.issues.push('duplicate');
            }
        }
    });
    
    // Calculate statistics
    const stats = {
        total: allImages.length,
        missingAlt: allImages.filter(img => !img.hasAlt).length,
        large: allImages.filter(img => img.isLarge).length,
        lowQuality: allImages.filter(img => img.isLowQuality).length,
        duplicate: allImages.filter(img => img.isDuplicate).length,
        noDimensions: allImages.filter(img => !img.hasDimensions).length
    };
    
    // Update summary stats
    updateImageSummaryStats(stats);
    
    // Display all images table
    displayAllImagesTable(allImages, data);
    
    // Display detailed sections
    displayMissingAltImages(allImages);
    displayLargeImages(allImages);
    displayLowQualityImages(allImages);
    displayDuplicateImages(allImages, imageUsage);
    
    // Setup filters
    setupImageFilters(allImages, data);
}

// Helper function to detect image format
function getImageFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.webp') || lower.includes('webp')) return 'WebP';
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('jpeg')) return 'JPEG';
    if (lower.includes('.png')) return 'PNG';
    if (lower.includes('.gif')) return 'GIF';
    if (lower.includes('.svg')) return 'SVG';
    if (lower.includes('.avif')) return 'AVIF';
    return 'unknown';
}

// Update summary statistics
function updateImageSummaryStats(stats) {
    const elements = {
        totalImagesCount: document.getElementById('totalImagesCount'),
        missingAltCount: document.getElementById('missingAltCount'),
        largeImagesCount: document.getElementById('largeImagesCount'),
        lowQualityCount: document.getElementById('lowQualityCount'),
        duplicateImagesCount: document.getElementById('duplicateImagesCount')
    };
    
    if (elements.totalImagesCount) elements.totalImagesCount.textContent = stats.total;
    if (elements.missingAltCount) elements.missingAltCount.textContent = stats.missingAlt;
    if (elements.largeImagesCount) elements.largeImagesCount.textContent = stats.large;
    if (elements.lowQualityCount) elements.lowQualityCount.textContent = stats.lowQuality;
    if (elements.duplicateImagesCount) elements.duplicateImagesCount.textContent = stats.duplicate;
}

// Display all images in a comprehensive table
function displayAllImagesTable(allImages, data) {
    const tbody = document.getElementById('allImagesTableBody');
    if (!tbody) return;
    
    if (allImages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No images found on any pages.</td></tr>';
        return;
    }
    
    // Remove duplicates (show each unique image once)
    const uniqueImages = [];
    const seen = new Set();
    
    allImages.forEach(img => {
        if (!seen.has(img.src)) {
            seen.add(img.src);
            uniqueImages.push(img);
        }
    });
    
    let html = '';
    uniqueImages.forEach(img => {
        const dimensions = img.hasDimensions ? `${img.width} × ${img.height}` : 'N/A';
        const size = img.sizeKb > 0 ? `${img.sizeKb.toFixed(1)} KB` : 'Unknown';
        const altText = img.alt || '<em class="text-muted">No ALT text</em>';
        const issues = img.issues.map(issue => {
            const labels = {
                'missing-alt': '<span class="badge badge-warning">Missing ALT</span>',
                'large': '<span class="badge badge-danger">Large</span>',
                'low-quality': '<span class="badge badge-info">Low Quality</span>',
                'duplicate': `<span class="badge badge-secondary">Duplicate (${img.usageCount || 1})</span>`,
                'no-dimensions': '<span class="badge badge-warning">No Dimensions</span>'
            };
            return labels[issue] || '';
        }).join(' ');
        
        html += `
            <tr data-src="${img.src}" data-issues="${img.issues.join(',')}" data-page="${img.pageUrl}">
                <td>
                    <img src="${img.src}" alt="${img.alt || ''}" 
                         style="max-width: 80px; max-height: 80px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px;"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect width=\'80\' height=\'80\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'12\'%3EImage%3C/text%3E%3C/svg%3E';">
                </td>
                <td>
                    <a href="${img.src}" target="_blank" title="${img.src}">
                        ${truncateUrl(img.src, 50)}
                    </a>
                </td>
                <td>
                    <a href="${img.pageUrl}" target="_blank" title="${img.pageTitle}">
                        ${truncateText(img.pageTitle, 40)}
                    </a>
                </td>
                <td>${dimensions}</td>
                <td>${size}</td>
                <td><span class="badge">${img.format}</span></td>
                <td>${altText}</td>
                <td>${issues || '<span class="text-success">✓ OK</span>'}</td>
                <td>
                    <button class="action-btn action-btn-view" onclick="showImageDetails('${img.src}', '${img.pageUrl}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Display missing ALT images
function displayMissingAltImages(allImages) {
    const container = document.getElementById('missingAltContainer');
    if (!container) return;
    
    const missingAlt = allImages.filter(img => !img.hasAlt);
    const uniqueMissing = [];
    const seen = new Set();
    
    missingAlt.forEach(img => {
        if (!seen.has(img.src)) {
            seen.add(img.src);
            uniqueMissing.push(img);
        }
    });
    
    if (uniqueMissing.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>All images have ALT text!</p></div>';
        return;
    }
    
    let html = '<div class="image-issues-list">';
    uniqueMissing.slice(0, 50).forEach(img => {
        html += `
            <div class="image-issue-item">
                <div class="image-preview-small">
                    <img src="${img.src}" alt="" onerror="this.style.display='none';">
                </div>
                <div class="image-issue-details">
                    <div class="image-url"><a href="${img.src}" target="_blank">${truncateUrl(img.src, 60)}</a></div>
                    <div class="image-page"><strong>Page:</strong> <a href="${img.pageUrl}" target="_blank">${truncateText(img.pageTitle, 50)}</a></div>
                    ${img.hasDimensions ? `<div class="image-dimensions">Dimensions: ${img.width} × ${img.height}</div>` : ''}
                </div>
            </div>
        `;
    });
    if (uniqueMissing.length > 50) {
        html += `<div class="more-items">... and ${uniqueMissing.length - 50} more images</div>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Display large images
function displayLargeImages(allImages) {
    const container = document.getElementById('largeImagesContainer');
    if (!container) return;
    
    const large = allImages.filter(img => img.isLarge);
    const uniqueLarge = [];
    const seen = new Set();
    
    large.forEach(img => {
        if (!seen.has(img.src)) {
            seen.add(img.src);
            uniqueLarge.push(img);
        }
    });
    
    if (uniqueLarge.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No large images detected!</p></div>';
        return;
    }
    
    // Sort by size descending
    uniqueLarge.sort((a, b) => (b.sizeKb || 0) - (a.sizeKb || 0));
    
    let html = '<div class="image-issues-list">';
    uniqueLarge.slice(0, 50).forEach(img => {
        const size = img.sizeKb > 0 ? `${img.sizeKb.toFixed(1)} KB` : 'Unknown size';
        html += `
            <div class="image-issue-item">
                <div class="image-preview-small">
                    <img src="${img.src}" alt="${img.alt || ''}" onerror="this.style.display='none';">
                </div>
                <div class="image-issue-details">
                    <div class="image-url"><a href="${img.src}" target="_blank">${truncateUrl(img.src, 60)}</a></div>
                    <div class="image-size"><strong>Size:</strong> ${size}</div>
                    <div class="image-page"><strong>Page:</strong> <a href="${img.pageUrl}" target="_blank">${truncateText(img.pageTitle, 50)}</a></div>
                    ${img.hasDimensions ? `<div class="image-dimensions">Dimensions: ${img.width} × ${img.height}</div>` : ''}
                </div>
            </div>
        `;
    });
    if (uniqueLarge.length > 50) {
        html += `<div class="more-items">... and ${uniqueLarge.length - 50} more images</div>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Display low quality images
function displayLowQualityImages(allImages) {
    const container = document.getElementById('lowQualityImagesContainer');
    if (!container) return;
    
    const lowQuality = allImages.filter(img => img.isLowQuality);
    const uniqueLowQuality = [];
    const seen = new Set();
    
    lowQuality.forEach(img => {
        if (!seen.has(img.src)) {
            seen.add(img.src);
            uniqueLowQuality.push(img);
        }
    });
    
    if (uniqueLowQuality.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No low quality images detected!</p></div>';
        return;
    }
    
    let html = '<div class="image-issues-list">';
    uniqueLowQuality.slice(0, 50).forEach(img => {
        html += `
            <div class="image-issue-item">
                <div class="image-preview-small">
                    <img src="${img.src}" alt="${img.alt || ''}" onerror="this.style.display='none';">
                </div>
                <div class="image-issue-details">
                    <div class="image-url"><a href="${img.src}" target="_blank">${truncateUrl(img.src, 60)}</a></div>
                    <div class="image-dimensions"><strong>Dimensions:</strong> ${img.width} × ${img.height} (Low resolution)</div>
                    <div class="image-page"><strong>Page:</strong> <a href="${img.pageUrl}" target="_blank">${truncateText(img.pageTitle, 50)}</a></div>
                    <div class="image-recommendation"><i class="fas fa-info-circle"></i> Consider using higher resolution images for better quality</div>
                </div>
            </div>
        `;
    });
    if (uniqueLowQuality.length > 50) {
        html += `<div class="more-items">... and ${uniqueLowQuality.length - 50} more images</div>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Display duplicate images
function displayDuplicateImages(allImages, imageUsage) {
    const container = document.getElementById('duplicateImagesContainer');
    if (!container) return;
    
    const duplicates = [];
    imageUsage.forEach((pages, src) => {
        if (pages.length > 1) {
            const img = allImages.find(i => i.src === src);
            if (img) {
                duplicates.push({
                    src: src,
                    usageCount: pages.length,
                    pages: pages,
                    img: img
                });
            }
        }
    });
    
    if (duplicates.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No duplicate images detected!</p></div>';
        return;
    }
    
    // Sort by usage count descending
    duplicates.sort((a, b) => b.usageCount - a.usageCount);
    
    let html = '<div class="image-issues-list">';
    duplicates.slice(0, 30).forEach(dup => {
        html += `
            <div class="image-issue-item">
                <div class="image-preview-small">
                    <img src="${dup.src}" alt="${dup.img.alt || ''}" onerror="this.style.display='none';">
                </div>
                <div class="image-issue-details">
                    <div class="image-url"><a href="${dup.src}" target="_blank">${truncateUrl(dup.src, 60)}</a></div>
                    <div class="image-usage-count"><strong>Used on ${dup.usageCount} pages:</strong></div>
                    <div class="image-pages-list">
                        ${dup.pages.slice(0, 5).map(p => `
                            <div class="page-link-item">
                                <a href="${p.url}" target="_blank">${truncateText(p.title, 40)}</a>
                            </div>
                        `).join('')}
                        ${dup.pages.length > 5 ? `<div class="more-pages">... and ${dup.pages.length - 5} more pages</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    if (duplicates.length > 30) {
        html += `<div class="more-items">... and ${duplicates.length - 30} more duplicate images</div>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Setup image filters
function setupImageFilters(allImages, data) {
    const searchInput = document.getElementById('imageSearchInput');
    const pageFilter = document.getElementById('imagePageFilter');
    const issueFilter = document.getElementById('imageIssueFilter');
    const tbody = document.getElementById('allImagesTableBody');
    
    if (!searchInput || !pageFilter || !issueFilter || !tbody) return;
    
    // Populate page filter
    if (data.pages) {
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }
    
    const applyFilters = () => {
        const searchTerm = (searchInput.value || '').toLowerCase();
        const selectedPage = pageFilter.value;
        const selectedIssue = issueFilter.value;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            let show = true;
            
            // Search filter
            if (searchTerm) {
                const src = (row.dataset.src || '').toLowerCase();
                const page = (row.dataset.page || '').toLowerCase();
                if (!src.includes(searchTerm) && !page.includes(searchTerm)) {
                    show = false;
                }
            }
            
            // Page filter
            if (selectedPage !== 'all' && row.dataset.page !== selectedPage) {
                show = false;
            }
            
            // Issue filter
            if (selectedIssue !== 'all') {
                const issues = (row.dataset.issues || '').split(',');
                if (!issues.includes(selectedIssue)) {
                    show = false;
                }
            }
            
            row.style.display = show ? '' : 'none';
        });
    };
    
    searchInput.addEventListener('input', applyFilters);
    pageFilter.addEventListener('change', applyFilters);
    issueFilter.addEventListener('change', applyFilters);
}

// Show image details in modal
function showImageDetails(imageSrc, pageUrl) {
    // Find the page data
    if (!reportData || !reportData.pages) return;
    
    const page = reportData.pages.find(p => p.url === pageUrl);
    if (!page) return;
    
    const image = (page.images || []).find(img => (img.src || img.url) === imageSrc);
    if (!image) return;
    
    const modal = document.getElementById('pageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    const format = getImageFormat(imageSrc);
    const dimensions = (image.width && image.height) ? `${image.width} × ${image.height}` : 'Not specified';
    const alt = image.alt || 'No ALT text';
    
    modalTitle.textContent = 'Image Details';
    modalBody.innerHTML = `
        <div class="image-details-modal">
            <div class="image-preview-large">
                <img src="${imageSrc}" alt="${alt}" style="max-width: 100%; max-height: 400px; border-radius: 8px;">
            </div>
            <div class="image-details-info">
                <h3>Image Information</h3>
                <table class="details-table">
                    <tr>
                        <th>Image URL:</th>
                        <td><a href="${imageSrc}" target="_blank">${imageSrc}</a></td>
                    </tr>
                    <tr>
                        <th>Page:</th>
                        <td><a href="${pageUrl}" target="_blank">${page.title || pageUrl}</a></td>
                    </tr>
                    <tr>
                        <th>Format:</th>
                        <td>${format}</td>
                    </tr>
                    <tr>
                        <th>Dimensions:</th>
                        <td>${dimensions}</td>
                    </tr>
                    <tr>
                        <th>ALT Text:</th>
                        <td>${alt}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

// Helper function to truncate URLs
function truncateUrl(url, maxLength) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
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

// Display Summary Report (Siteliner-style)
function displaySummaryReport(data) {
    if (!data || !data.pages) return;
    
    const pages = data.pages;
    const totalPages = pages.length;
    
    // Update timestamp
    const timestampEl = document.getElementById('summaryReportTimestamp');
    if (timestampEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' });
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        timestampEl.textContent = `Siteliner scanned ${totalPages} pages of ${totalPages} found on your site. ${timeStr} ${dateStr}`;
    }
    
    // Calculate Top Issues
    displayTopIssues(data);
    
    // Calculate Page Breakdown
    displayPageBreakdown(data);
    
    // Calculate Duplicate Content Breakdown
    displayDuplicateContentBreakdown(data);
    
    // Calculate Site Comparison
    displaySiteComparison(data);
    
    // Generate Recommendations
    displayRecommendations(data);
}

// Display Top Issues
function displayTopIssues(data) {
    const container = document.getElementById('topIssuesContainer');
    if (!container) return;
    
    const pages = data.pages || [];
    
    // Count issues
    let duplicateContentCount = 0;
    let brokenLinksCount = 0;
    let missingMetaCount = 0;
    let slowPagesCount = 0;
    
    pages.forEach(page => {
        // Duplicate content
        if (page.is_exact_duplicate || (page.similarity_scores && Object.keys(page.similarity_scores).length > 0)) {
            const maxSimilarity = page.similarity_scores ? Math.max(...Object.values(page.similarity_scores)) : 100;
            if (page.is_exact_duplicate || maxSimilarity >= 70) {
                duplicateContentCount++;
            }
        }
        
        // Broken links
        if (page.broken_links && page.broken_links.length > 0) {
            brokenLinksCount += page.broken_links.length;
        }
        
        // Missing meta
        if (!page.title || page.title.length < 10 || !page.meta_description || page.meta_description.length < 50) {
            missingMetaCount++;
        }
        
        // Slow pages (if performance data available)
        if (page.performance_analysis && page.performance_analysis.load_time > 3000) {
            slowPagesCount++;
        }
    });
    
    const issues = [];
    if (duplicateContentCount > 0) {
        issues.push({
            icon: 'fa-copy',
            color: 'orange',
            text: `A large amount of duplicate content was found.`,
            count: duplicateContentCount,
            link: 'duplicates'
        });
    }
    if (brokenLinksCount > 0) {
        issues.push({
            icon: 'fa-unlink',
            color: 'red',
            text: `${brokenLinksCount} broken link${brokenLinksCount > 1 ? 's were' : ' was'} found.`,
            count: brokenLinksCount,
            link: 'broken-links'
        });
    }
    if (missingMetaCount > 0) {
        issues.push({
            icon: 'fa-code',
            color: 'yellow',
            text: `${missingMetaCount} page${missingMetaCount > 1 ? 's have' : ' has'} missing or incomplete meta tags.`,
            count: missingMetaCount,
            link: 'meta-seo'
        });
    }
    if (slowPagesCount > 0) {
        issues.push({
            icon: 'fa-tachometer-alt',
            color: 'blue',
            text: `${slowPagesCount} page${slowPagesCount > 1 ? 's are' : ' is'} loading slowly.`,
            count: slowPagesCount,
            link: 'performance'
        });
    }
    
    if (issues.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No major issues found! Your site looks good.</p></div>';
        return;
    }
    
    let html = '<div class="top-issues-list">';
    issues.forEach(issue => {
        html += `
            <div class="issue-item" onclick="showSection('${issue.link}')">
                <div class="issue-icon ${issue.color}">
                    <i class="fas ${issue.icon}"></i>
                </div>
                <div class="issue-content">
                    <div class="issue-text">${issue.text}</div>
                    <div class="issue-count">${issue.count} ${issue.count > 1 ? 'issues' : 'issue'}</div>
                </div>
                <div class="issue-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Display Page Breakdown
function displayPageBreakdown(data) {
    const container = document.getElementById('pageBreakdownContainer');
    if (!container) return;
    
    const pages = data.pages || [];
    const skippedPages = data.skipped_pages || [];
    
    let normalPages = 0;
    let skippedRedirect = 0;
    let skippedNoindex = 0;
    let skippedOther = 0;
    let errorPages = 0;
    
    pages.forEach(page => {
        if (page.status_code >= 400) {
            errorPages++;
        } else if (page.status_code >= 200 && page.status_code < 300) {
            normalPages++;
        }
    });
    
    skippedPages.forEach(skipped => {
        const reason = skipped.skip_reason || '';
        if (reason.toLowerCase().includes('redirect')) {
            skippedRedirect++;
        } else if (reason.toLowerCase().includes('noindex')) {
            skippedNoindex++;
        } else {
            skippedOther++;
        }
    });
    
    const breakdown = [
        { label: 'Normal Pages', count: normalPages, color: 'green', link: 'overview' },
        { label: 'Skipped, Redirect', count: skippedRedirect, color: 'yellow', link: 'advanced-seo' },
        { label: 'Skipped, Noindex', count: skippedNoindex, color: 'orange', link: 'advanced-seo' },
        { label: 'Skipped, Other', count: skippedOther, color: 'blue', link: 'advanced-seo' },
        { label: 'Errors', count: errorPages, color: 'red', link: 'broken-links' }
    ];
    
    let html = '<div class="page-breakdown-list">';
    breakdown.forEach(item => {
        html += `
            <div class="breakdown-item" onclick="showSection('${item.link}')">
                <div class="breakdown-label">${item.label}:</div>
                <div class="breakdown-count ${item.color}">${item.count}</div>
                <div class="breakdown-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Display Duplicate Content Breakdown
function displayDuplicateContentBreakdown(data) {
    const container = document.getElementById('duplicateContentBreakdownContainer');
    if (!container) return;
    
    const pages = data.pages || [];
    if (pages.length === 0) {
        container.innerHTML = '<p>No pages to analyze.</p>';
        return;
    }
    
    // Calculate content percentages (Siteliner-style)
    // Total words across all pages
    let totalWords = 0;
    pages.forEach(page => {
        totalWords += page.word_count || 0;
    });
    
    if (totalWords === 0) {
        container.innerHTML = '<p>No content to analyze.</p>';
        return;
    }
    
    // Exact duplicates (same content hash)
    const hashGroups = new Map();
    pages.forEach(page => {
        const hash = page.content_hash || '';
        if (hash) {
            if (!hashGroups.has(hash)) {
                hashGroups.set(hash, []);
            }
            hashGroups.get(hash).push(page);
        }
    });
    
    let duplicateWords = 0;
    hashGroups.forEach(group => {
        if (group.length > 1) {
            // All pages in this group are duplicates
            // Count words from all but one (since they're duplicates)
            const wordsPerPage = group[0].word_count || 0;
            duplicateWords += wordsPerPage * (group.length - 1);
        }
    });
    
    // Common content (high similarity but not exact duplicate)
    // This includes navigation, headers, footers, etc. that appear on multiple pages
    let commonWords = 0;
    const processedPairs = new Set();
    
    pages.forEach(page1 => {
        if (page1.similarity_scores && Object.keys(page1.similarity_scores).length > 0) {
            Object.entries(page1.similarity_scores).forEach(([url2, similarity]) => {
                // Create a unique pair identifier
                const pairKey = [page1.url, url2].sort().join('|');
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);
                
                // Only count if similarity is high (70-90%) but not exact duplicate
                if (similarity >= 70 && similarity < 90 && !page1.is_exact_duplicate) {
                    const page1Words = page1.word_count || 0;
                    // Estimate common words based on similarity
                    const estimatedCommon = page1Words * (similarity / 100) * 0.5; // 0.5 to avoid double counting
                    commonWords += estimatedCommon;
                }
            });
        }
    });
    
    // Ensure we don't double-count
    commonWords = Math.max(0, commonWords - duplicateWords);
    
    // Unique content is the remainder
    const uniqueWords = totalWords - duplicateWords - commonWords;
    
    const duplicatePercent = (duplicateWords / totalWords) * 100;
    const commonPercent = (commonWords / totalWords) * 100;
    const uniquePercent = (uniqueWords / totalWords) * 100;
    
    let html = `
        <div class="duplicate-content-breakdown-grid">
            <div class="duplicate-stat" onclick="showSection('duplicates')">
                <div class="stat-value orange">${duplicatePercent.toFixed(0)}%</div>
                <div class="stat-label">Duplicate Content</div>
            </div>
            <div class="duplicate-stat" onclick="showSection('similarity')">
                <div class="stat-value yellow">${commonPercent.toFixed(0)}%</div>
                <div class="stat-label">Common Content</div>
            </div>
            <div class="duplicate-stat">
                <div class="stat-value green">${uniquePercent.toFixed(0)}%</div>
                <div class="stat-label">Unique Content</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Industry benchmarks for percentile calculations
const BENCHMARKS = {
    avgPageSize: { median: 156 * 1024 }, // 156KB in bytes
    avgPageLoadTime: { median: 651 }, // milliseconds
    wordsPerPage: { median: 846 },
    textToHtmlRatio: { median: 3 }, // percentage
    duplicateContent: { median: 17 }, // percentage
    commonContent: { median: 30 }, // percentage
    internalLinksPerPage: { median: 24 },
    externalLinksPerPage: { median: 5 },
    totalLinksPerPage: { median: 30 },
    inboundLinksPerPage: { median: 20 }
};

// Calculate percentile
function calculatePercentile(value, median, higherIsBetter = false) {
    if (median === 0) return 50;
    
    const ratio = value / median;
    if (higherIsBetter) {
        // For metrics where higher is better (like words per page)
        if (ratio >= 1) {
            return Math.min(100, 50 + (ratio - 1) * 25);
        } else {
            return Math.max(0, 50 - (1 - ratio) * 50);
        }
    } else {
        // For metrics where lower is better (like page size, load time, duplicate content)
        if (ratio <= 1) {
            return Math.min(100, 50 + (1 - ratio) * 25);
        } else {
            return Math.max(0, 50 - (ratio - 1) * 50);
        }
    }
}

// Display Site Comparison
function displaySiteComparison(data) {
    const container = document.getElementById('siteComparisonContainer');
    if (!container) return;
    
    const pages = data.pages || [];
    if (pages.length === 0) {
        container.innerHTML = '<p>No data available for comparison.</p>';
        return;
    }
    
    // Calculate metrics
    let totalPageSize = 0;
    let totalLoadTime = 0;
    let totalWords = 0;
    let totalHtmlSize = 0;
    let totalTextSize = 0;
    let totalInternalLinks = 0;
    let totalExternalLinks = 0;
    let totalInboundLinks = 0;
    
    const inboundLinkCounts = new Map();
    
    pages.forEach(page => {
        // Page size (estimate from HTML if available, otherwise use word count * 5 bytes)
        const htmlSize = page.html_content ? page.html_content.length : (page.word_count || 0) * 5;
        totalPageSize += htmlSize;
        totalHtmlSize += htmlSize;
        
        // Load time (from performance analysis if available)
        if (page.performance_analysis && page.performance_analysis.load_time) {
            totalLoadTime += page.performance_analysis.load_time;
        }
        
        // Word count
        totalWords += page.word_count || 0;
        
        // Text size
        if (page.text_content) {
            totalTextSize += page.text_content.length;
        }
        
        // Links
        totalInternalLinks += (page.internal_links || []).length;
        totalExternalLinks += (page.external_links || []).length;
        
        // Count inbound links
        (page.internal_links || []).forEach(link => {
            inboundLinkCounts.set(link, (inboundLinkCounts.get(link) || 0) + 1);
        });
    });
    
    totalInboundLinks = Array.from(inboundLinkCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const avgPageSize = totalPageSize / pages.length;
    const avgLoadTime = totalLoadTime / pages.length || 0;
    const avgWords = totalWords / pages.length;
    const textToHtmlRatio = totalHtmlSize > 0 ? (totalTextSize / totalHtmlSize) * 100 : 0;
    const avgInternalLinks = totalInternalLinks / pages.length;
    const avgExternalLinks = totalExternalLinks / pages.length;
    const avgTotalLinks = (totalInternalLinks + totalExternalLinks) / pages.length;
    const avgInboundLinks = totalInboundLinks / pages.length;
    
    // Calculate duplicate and common content percentages
    const duplicatePercent = parseFloat(document.querySelector('.duplicate-stat .stat-value.orange')?.textContent || '0');
    const commonPercent = parseFloat(document.querySelector('.duplicate-stat .stat-value.yellow')?.textContent || '0');
    
    // Calculate percentiles
    const comparisons = [
        {
            label: 'Average Page Size',
            value: (avgPageSize / 1024).toFixed(0) + 'Kb',
            percentile: calculatePercentile(avgPageSize, BENCHMARKS.avgPageSize.median, false),
            median: (BENCHMARKS.avgPageSize.median / 1024).toFixed(0) + 'Kb',
            higherIsBetter: false
        },
        {
            label: 'Average Page Load Time',
            value: avgLoadTime > 0 ? avgLoadTime.toFixed(0) + 'ms' : 'N/A',
            percentile: avgLoadTime > 0 ? calculatePercentile(avgLoadTime, BENCHMARKS.avgPageLoadTime.median, false) : 50,
            median: BENCHMARKS.avgPageLoadTime.median + 'ms',
            higherIsBetter: false
        },
        {
            label: 'Number of Words per Page',
            value: avgWords.toFixed(0),
            percentile: calculatePercentile(avgWords, BENCHMARKS.wordsPerPage.median, true),
            median: BENCHMARKS.wordsPerPage.median.toString(),
            higherIsBetter: true
        },
        {
            label: 'Text to HTML Ratio',
            value: textToHtmlRatio.toFixed(0) + '%',
            percentile: calculatePercentile(textToHtmlRatio, BENCHMARKS.textToHtmlRatio.median, true),
            median: BENCHMARKS.textToHtmlRatio.median + '%',
            higherIsBetter: true
        },
        {
            label: 'Duplicate Content',
            value: duplicatePercent.toFixed(0) + '%',
            percentile: calculatePercentile(duplicatePercent, BENCHMARKS.duplicateContent.median, false),
            median: BENCHMARKS.duplicateContent.median + '%',
            higherIsBetter: false
        },
        {
            label: 'Common Content',
            value: commonPercent.toFixed(0) + '%',
            percentile: calculatePercentile(commonPercent, BENCHMARKS.commonContent.median, false),
            median: BENCHMARKS.commonContent.median + '%',
            higherIsBetter: false
        },
        {
            label: 'Internal Links per Page',
            value: avgInternalLinks.toFixed(0),
            percentile: calculatePercentile(avgInternalLinks, BENCHMARKS.internalLinksPerPage.median, true),
            median: BENCHMARKS.internalLinksPerPage.median.toString(),
            higherIsBetter: true
        },
        {
            label: 'External Links per Page',
            value: avgExternalLinks.toFixed(0),
            percentile: calculatePercentile(avgExternalLinks, BENCHMARKS.externalLinksPerPage.median, true),
            median: BENCHMARKS.externalLinksPerPage.median.toString(),
            higherIsBetter: true
        },
        {
            label: 'Total Links per Page',
            value: avgTotalLinks.toFixed(0),
            percentile: calculatePercentile(avgTotalLinks, BENCHMARKS.totalLinksPerPage.median, true),
            median: BENCHMARKS.totalLinksPerPage.median.toString(),
            higherIsBetter: true
        },
        {
            label: 'Inbound Links per Page',
            value: avgInboundLinks.toFixed(0),
            percentile: calculatePercentile(avgInboundLinks, BENCHMARKS.inboundLinksPerPage.median, true),
            median: BENCHMARKS.inboundLinksPerPage.median.toString(),
            higherIsBetter: true
        }
    ];
    
    let html = '<div class="comparison-list">';
    comparisons.forEach(comp => {
        const percentileClass = comp.percentile >= 70 ? 'good' : comp.percentile >= 40 ? 'average' : 'poor';
        const comparisonText = comp.higherIsBetter 
            ? `The ${comp.label.toLowerCase()} for your site is ${comp.value}. The median for all other sites is ${comp.median}.`
            : `The ${comp.label.toLowerCase()} for your site is ${comp.value}. The median for all other sites is ${comp.median}.`;
        const percentileText = comp.higherIsBetter
            ? `The ${comp.label.toLowerCase()} for your site is ${comp.percentile >= 50 ? 'more' : 'less'} than ${comp.percentile.toFixed(0)}% of all other sites.`
            : `The ${comp.label.toLowerCase()} for your site is ${comp.percentile >= 50 ? 'longer' : 'shorter'} than ${comp.percentile.toFixed(0)}% of all other sites.`;
        
        html += `
            <div class="comparison-item ${percentileClass}">
                <div class="comparison-header">
                    <span class="comparison-value">${comp.value}</span>
                    <span class="comparison-percentile">${comp.percentile.toFixed(0)}${comp.percentile === 1 ? 'st' : comp.percentile === 2 ? 'nd' : comp.percentile === 3 ? 'rd' : 'th'} percentile</span>
                </div>
                <div class="comparison-label">${comp.label}</div>
                <div class="comparison-description">${comparisonText}</div>
                <div class="comparison-percentile-text">${percentileText}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Display Recommendations
function displayRecommendations(data) {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;
    
    const pages = data.pages || [];
    const recommendations = [];
    
    // Check for duplicate content
    const duplicatePages = pages.filter(p => p.is_exact_duplicate || (p.similarity_scores && Object.keys(p.similarity_scores).length > 0));
    if (duplicatePages.length > 0) {
        recommendations.push({
            issue: 'Duplicate Content',
            severity: 'high',
            description: `You have ${duplicatePages.length} page${duplicatePages.length > 1 ? 's' : ''} with duplicate or highly similar content.`,
            fixes: [
                'Use canonical tags to indicate the preferred version of duplicate pages',
                'Rewrite duplicate content to make it unique and valuable',
                'Consolidate similar pages into a single, comprehensive page',
                'Remove unnecessary duplicate pages and redirect them to the original',
                'Use 301 redirects for old duplicate URLs to the canonical version'
            ]
        });
    }
    
    // Check for broken links
    let totalBrokenLinks = 0;
    pages.forEach(page => {
        if (page.broken_links) {
            totalBrokenLinks += page.broken_links.length;
        }
    });
    if (totalBrokenLinks > 0) {
        recommendations.push({
            issue: 'Broken Links',
            severity: 'high',
            description: `You have ${totalBrokenLinks} broken link${totalBrokenLinks > 1 ? 's' : ''} on your site.`,
            fixes: [
                'Fix or update broken internal links to point to correct pages',
                'Remove broken external links or replace them with working alternatives',
                'Set up 301 redirects for moved or renamed pages',
                'Regularly audit your links to catch broken links early',
                'Use a link checker tool to monitor link health'
            ]
        });
    }
    
    // Check for missing meta tags
    const missingMetaPages = pages.filter(p => !p.title || p.title.length < 10 || !p.meta_description || p.meta_description.length < 50);
    if (missingMetaPages.length > 0) {
        recommendations.push({
            issue: 'Missing or Incomplete Meta Tags',
            severity: 'medium',
            description: `${missingMetaPages.length} page${missingMetaPages.length > 1 ? 's have' : ' has'} missing or incomplete meta tags.`,
            fixes: [
                'Add unique, descriptive title tags (50-60 characters) to all pages',
                'Write compelling meta descriptions (150-160 characters) for each page',
                'Include relevant keywords naturally in titles and descriptions',
                'Ensure each page has a unique title and description',
                'Use title tags that accurately describe the page content'
            ]
        });
    }
    
    // Check for slow pages
    const slowPages = pages.filter(p => p.performance_analysis && p.performance_analysis.load_time > 3000);
    if (slowPages.length > 0) {
        recommendations.push({
            issue: 'Slow Loading Pages',
            severity: 'medium',
            description: `${slowPages.length} page${slowPages.length > 1 ? 's are' : ' is'} loading slowly (over 3 seconds).`,
            fixes: [
                'Optimize images by compressing and using modern formats (WebP, AVIF)',
                'Minify CSS and JavaScript files',
                'Enable browser caching for static resources',
                'Use a Content Delivery Network (CDN) for faster delivery',
                'Reduce server response time and optimize database queries',
                'Lazy load images and non-critical content'
            ]
        });
    }
    
    // Check for low text-to-HTML ratio
    let totalHtmlSize = 0;
    let totalTextSize = 0;
    pages.forEach(page => {
        totalHtmlSize += page.html_content ? page.html_content.length : (page.word_count || 0) * 5;
        if (page.text_content) {
            totalTextSize += page.text_content.length;
        }
    });
    const textToHtmlRatio = totalHtmlSize > 0 ? (totalTextSize / totalHtmlSize) * 100 : 0;
    if (textToHtmlRatio < 2) {
        recommendations.push({
            issue: 'Low Text-to-HTML Ratio',
            severity: 'medium',
            description: `Your text-to-HTML ratio is ${textToHtmlRatio.toFixed(1)}%, which is below the recommended 3%.`,
            fixes: [
                'Reduce unnecessary HTML markup and code',
                'Add more valuable text content to your pages',
                'Remove unused CSS and JavaScript',
                'Simplify page structure and reduce nested divs',
                'Move inline styles to external stylesheets'
            ]
        });
    }
    
    // Check for missing external links
    const avgExternalLinks = pages.reduce((sum, p) => sum + (p.external_links || []).length, 0) / pages.length;
    if (avgExternalLinks < 1) {
        recommendations.push({
            issue: 'Low Number of External Links',
            severity: 'low',
            description: 'Your site has very few external links, which can limit credibility and SEO value.',
            fixes: [
                'Add relevant external links to authoritative sources',
                'Link to industry resources and research',
                'Cite sources and references in your content',
                'Build relationships with other sites for mutual linking',
                'Ensure external links open in new tabs and use appropriate rel attributes'
            ]
        });
    }
    
    if (recommendations.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>Great job! No major issues found that need immediate attention.</p></div>';
        return;
    }
    
    let html = '<div class="recommendations-list">';
    recommendations.forEach(rec => {
        const severityClass = rec.severity === 'high' ? 'high' : rec.severity === 'medium' ? 'medium' : 'low';
        html += `
            <div class="recommendation-item ${severityClass}">
                <div class="recommendation-header">
                    <h4 class="recommendation-title">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${rec.issue}
                    </h4>
                    <span class="severity-badge ${severityClass}">${rec.severity.toUpperCase()}</span>
                </div>
                <p class="recommendation-description">${rec.description}</p>
                <div class="recommendation-fixes">
                    <strong>How to Fix:</strong>
                    <ul>
                        ${rec.fixes.map(fix => `<li>${fix}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
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
                        source_title: page.title,
                        // Location data
                        anchor_text: brokenLink.anchor_text || '',
                        parent_tag: brokenLink.parent_tag || '',
                        parent_class: brokenLink.parent_class || '',
                        parent_id: brokenLink.parent_id || '',
                        css_selector: brokenLink.css_selector || '',
                        context: brokenLink.context || {},
                        line_number: brokenLink.line_number || 0
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
    allBrokenLinks.forEach((link, index) => {
        const item = document.createElement('div');
        item.className = 'broken-link-item';
        
        // Build location info string
        const locationInfo = [];
        if (link.parent_tag) locationInfo.push(`<${link.parent_tag}>`);
        if (link.parent_class) locationInfo.push(`.${link.parent_class.split(' ')[0]}`);
        if (link.parent_id) locationInfo.push(`#${link.parent_id}`);
        if (link.line_number > 0) locationInfo.push(`Line ${link.line_number}`);
        
        const locationStr = locationInfo.length > 0 ? locationInfo.join(' ') : 'Unknown location';
        const contextBefore = (link.context?.before || '').substring(0, 50);
        const contextAfter = (link.context?.after || '').substring(0, 50);
        const anchorDisplay = link.anchor_text || '(no text)';
        
        item.innerHTML = `
            <div class="broken-link-info">
                <div class="broken-link-header">
                    <div class="broken-link-url">
                        <a href="${link.url}" target="_blank">${link.url}</a>
                    </div>
                    <div class="broken-link-details">
                        <span class="status-badge status-${link.status >= 400 ? 'error' : 'redirect'}">${link.status_text || 'Error'}</span>
                    </div>
                </div>
                <div class="broken-link-source">
                    <i class="fas fa-file-alt"></i> Found on: <strong><a href="${link.source_page}" target="_blank">${link.source_title || link.source_page}</a></strong>
                </div>
                <div class="broken-link-location">
                    <div class="location-info">
                        <i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${locationStr}
                        ${link.css_selector ? `<span class="css-selector" title="CSS Selector: ${link.css_selector}">${link.css_selector.length > 60 ? link.css_selector.substring(0, 60) + '...' : link.css_selector}</span>` : ''}
                    </div>
                    ${link.anchor_text ? `<div class="anchor-text"><i class="fas fa-link"></i> <strong>Link Text:</strong> "${anchorDisplay}"</div>` : ''}
                    ${(contextBefore || contextAfter) ? `
                        <div class="link-context">
                            <i class="fas fa-quote-left"></i> <strong>Context:</strong>
                            ${contextBefore ? `<span class="context-before">...${contextBefore}</span>` : ''}
                            <span class="link-highlight">${anchorDisplay}</span>
                            ${contextAfter ? `<span class="context-after">${contextAfter}...</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="broken-link-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewLinkOnPage('${link.source_page}', '${link.css_selector.replace(/'/g, "\\'")}', ${index})">
                        <i class="fas fa-eye"></i> View on Page
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showLinkLocationDetails(${index})">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
    
    // Store broken links data globally for modal access
    window.brokenLinksData = allBrokenLinks;
}

// View link on source page with highlight
function viewLinkOnPage(pageUrl, cssSelector, linkIndex) {
    // Open page in new window with highlight script
    const newWindow = window.open(pageUrl, '_blank');
    
    if (newWindow) {
        newWindow.onload = function() {
            try {
                // Inject highlight script
                const script = `
                    (function() {
                        try {
                            const selector = ${JSON.stringify(cssSelector)};
                            const element = document.querySelector(selector);
                            if (element) {
                                element.style.outline = '3px solid #ff0000';
                                element.style.outlineOffset = '2px';
                                element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                // Remove highlight after 5 seconds
                                setTimeout(() => {
                                    element.style.outline = '';
                                    element.style.outlineOffset = '';
                                    element.style.backgroundColor = '';
                                }, 5000);
                            } else {
                                alert('Link element not found on page. It may have been removed or changed.');
                            }
                        } catch(e) {
                            console.error('Error highlighting element:', e);
                        }
                    })();
                `;
                newWindow.eval(script);
            } catch (e) {
                console.error('Error opening page:', e);
                alert('Could not highlight link on page. Please check the page manually.');
            }
        };
    }
}

// Show detailed location information
function showLinkLocationDetails(linkIndex) {
    if (!window.brokenLinksData || !window.brokenLinksData[linkIndex]) return;
    
    const link = window.brokenLinksData[linkIndex];
    
    let modalHtml = `
        <div class="modal" id="linkLocationModal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2><i class="fas fa-map-marker-alt"></i> Link Location Details</h2>
                    <span class="close" onclick="closeLinkLocationModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="location-details-section">
                        <h3><i class="fas fa-link"></i> Broken Link</h3>
                        <p><a href="${link.url}" target="_blank">${link.url}</a></p>
                    </div>
                    
                    <div class="location-details-section">
                        <h3><i class="fas fa-file-alt"></i> Source Page</h3>
                        <p><a href="${link.source_page}" target="_blank">${link.source_title || link.source_page}</a></p>
                    </div>
                    
                    ${link.css_selector ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-code"></i> CSS Selector</h3>
                        <code class="css-selector-code">${link.css_selector}</code>
                        <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${link.css_selector.replace(/'/g, "\\'")}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    ` : ''}
                    
                    ${link.parent_tag ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-sitemap"></i> Parent Element</h3>
                        <ul class="location-list">
                            <li><strong>Tag:</strong> <code>&lt;${link.parent_tag}&gt;</code></li>
                            ${link.parent_class ? `<li><strong>Class:</strong> <code>.${link.parent_class}</code></li>` : ''}
                            ${link.parent_id ? `<li><strong>ID:</strong> <code>#${link.parent_id}</code></li>` : ''}
                        </ul>
                    </div>
                    ` : ''}
                    
                    ${link.line_number > 0 ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-list-ol"></i> Line Number</h3>
                        <p>Approximate line: <strong>${link.line_number}</strong></p>
                    </div>
                    ` : ''}
                    
                    ${link.anchor_text ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-font"></i> Anchor Text</h3>
                        <p>"${link.anchor_text}"</p>
                    </div>
                    ` : ''}
                    
                    ${link.context && (link.context.before || link.context.after) ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-quote-left"></i> Surrounding Context</h3>
                        <div class="context-display">
                            ${link.context.before ? `<span class="context-before">${link.context.before}</span>` : ''}
                            <span class="link-highlight">${link.anchor_text || link.url}</span>
                            ${link.context.after ? `<span class="context-after">${link.context.after}</span>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="location-details-actions">
                        <button class="btn btn-primary" onclick="viewLinkOnPage('${link.source_page}', '${link.css_selector.replace(/'/g, "\\'")}', ${linkIndex})">
                            <i class="fas fa-eye"></i> View on Page
                        </button>
                        <button class="btn btn-secondary" onclick="closeLinkLocationModal()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeLinkLocationModal() {
    const modal = document.getElementById('linkLocationModal');
    if (modal) modal.remove();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Copied to clipboard!');
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

// Display external links section (ENHANCED with deep analysis)
function displayExternalLinks(data) {
    const container = document.getElementById('externalLinksContainer');
    const summaryContainer = document.getElementById('externalLinksSummary');
    const allExternalLinks = [];
    
    // Get analyzed external links if available
    const analyzedLinksMap = {};
    if (data.external_links_analysis && data.external_links_analysis.analyzed_links) {
        data.external_links_analysis.analyzed_links.forEach(analyzed => {
            analyzedLinksMap[analyzed.url] = analyzed;
        });
    }
    
    // Extract external links with location data
    if (data.pages) {
        data.pages.forEach(page => {
            if (page.external_links && page.external_links.length > 0) {
                page.external_links.forEach(linkData => {
                    // Handle both string URLs and dict objects with location data
                    let linkUrl, anchorText, locationInfo, cssSelector, context, rel, target;
                    
                    if (typeof linkData === 'string') {
                        linkUrl = linkData;
                        anchorText = '';
                        locationInfo = {};
                        cssSelector = '';
                        context = {};
                        rel = [];
                        target = '';
                    } else if (typeof linkData === 'object') {
                        linkUrl = linkData.url || linkData.href || '';
                        anchorText = linkData.anchor_text || '';
                        locationInfo = {
                            parent_tag: linkData.parent_tag || '',
                            parent_class: linkData.parent_class || '',
                            parent_id: linkData.parent_id || '',
                            line_number: linkData.line_number || 0
                        };
                        cssSelector = linkData.css_selector || '';
                        context = linkData.context || {};
                        rel = linkData.rel || [];
                        target = linkData.target || '';
                    } else {
                        linkUrl = String(linkData);
                        anchorText = '';
                        locationInfo = {};
                        cssSelector = '';
                        context = {};
                        rel = [];
                        target = '';
                    }
                    
                    if (!linkUrl) return;
                    
                    // Extract domain
                    try {
                        const urlObj = new URL(linkUrl);
                        var domain = urlObj.hostname;
                    } catch (e) {
                        var domain = linkUrl;
                    }
                    
                    // Merge with analyzed data if available
                    const analyzed = analyzedLinksMap[linkUrl] || {};
                    
                    allExternalLinks.push({
                        url: linkUrl,
                        domain: domain,
                        source_page: page.url,
                        source_title: page.title || page.url,
                        source_status: page.status_code,
                        anchor_text: anchorText,
                        location_info: locationInfo,
                        css_selector: cssSelector,
                        context: context,
                        rel: rel,
                        target: target,
                        // Enhanced analysis data
                        accessible: analyzed.accessible,
                        status_code: analyzed.status_code,
                        status_text: analyzed.status_text,
                        category: analyzed.category || 'Other',
                        link_type: analyzed.link_type || (rel.includes('nofollow') ? 'Nofollow' : 'Follow'),
                        quality_score: analyzed.quality_score,
                        has_ssl: analyzed.has_ssl,
                        response_time: analyzed.response_time,
                        final_url: analyzed.final_url,
                        redirect_count: analyzed.redirect_count
                    });
                });
            }
        });
    }
    
    // Group by unique URL and merge analysis data
    const uniqueLinks = {};
    allExternalLinks.forEach(link => {
        if (!uniqueLinks[link.url]) {
            uniqueLinks[link.url] = {
                url: link.url,
                domain: link.domain,
                category: link.category || 'Other',
                link_type: link.link_type || 'Follow',
                accessible: link.accessible,
                status_code: link.status_code,
                status_text: link.status_text,
                quality_score: link.quality_score || { score: 0, level: 'Unknown' },
                has_ssl: link.has_ssl,
                response_time: link.response_time,
                redirect_count: link.redirect_count || 0,
                final_url: link.final_url || link.url,
                sources: []
            };
        }
        uniqueLinks[link.url].sources.push({
            page_url: link.source_page,
            page_title: link.source_title,
            page_status: link.source_status,
            anchor_text: link.anchor_text,
            location_info: link.location_info,
            css_selector: link.css_selector,
            context: link.context,
            rel: link.rel || [],
            target: link.target || ''
        });
    });
    
    const totalLinks = Object.keys(uniqueLinks).length;
    document.getElementById('externalLinksCount').textContent = `${totalLinks} unique links`;
    
    // Update summary card
    const externalLinksTotal = document.getElementById('externalLinksTotal');
    if (externalLinksTotal) {
        externalLinksTotal.textContent = totalLinks;
    }
    
    // Display summary statistics
    if (summaryContainer && data.external_links_analysis && data.external_links_analysis.summary) {
        const summary = data.external_links_analysis.summary;
        const accessible = summary.accessible || 0;
        const inaccessible = summary.inaccessible || 0;
        const withSSL = summary.with_ssl || 0;
        
        summaryContainer.innerHTML = `
            <div class="external-links-summary-grid">
                <div class="summary-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-link"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${summary.total || totalLinks}</h3>
                        <p>Total Links Analyzed</p>
                    </div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${accessible}</h3>
                        <p>Accessible Links</p>
                    </div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${inaccessible}</h3>
                        <p>Inaccessible Links</p>
                    </div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                        <i class="fas fa-lock"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${withSSL}</h3>
                        <p>HTTPS Links</p>
                    </div>
                </div>
            </div>
        `;
        summaryContainer.style.display = 'block';
    }
    
    // Populate filters
    const pageFilter = document.getElementById('externalPageFilter');
    if (pageFilter && data.pages) {
        pageFilter.innerHTML = '<option value="all">All Pages</option>';
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }
    
    // Populate category filter
    const categoryFilter = document.getElementById('externalCategoryFilter');
    if (categoryFilter) {
        const categories = [...new Set(Object.values(uniqueLinks).map(l => l.category || 'Other'))].sort();
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }
    
    if (totalLinks === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No external links found.</p></div>';
        return;
    }
    
    // Create enhanced table format with analysis data
    let html = `
        <div class="table-container">
            <table class="data-table external-links-table">
                <thead>
                    <tr>
                        <th style="width: 20%;">External URL / Domain</th>
                        <th style="width: 15%;">Status</th>
                        <th style="width: 10%;">Category</th>
                        <th style="width: 10%;">Link Type</th>
                        <th style="width: 10%;">Quality</th>
                        <th style="width: 15%;">Source Page</th>
                        <th style="width: 10%;">Anchor Text</th>
                        <th style="width: 10%;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Sort links by domain, then URL
    const sortedLinks = Object.values(uniqueLinks).sort((a, b) => {
        const domainCompare = a.domain.localeCompare(b.domain);
        if (domainCompare !== 0) return domainCompare;
        return a.url.localeCompare(b.url);
    });
    
    sortedLinks.forEach((linkData, index) => {
        linkData.sources.forEach((source, sourceIndex) => {
            const isFirstSource = sourceIndex === 0;
            const rowspan = sourceIndex === 0 ? linkData.sources.length : 0;
            
            // Get domain display
            const domainDisplay = linkData.domain.length > 30 
                ? linkData.domain.substring(0, 27) + '...' 
                : linkData.domain;
            
            // Get URL display (shortened)
            const urlDisplay = linkData.url.length > 40
                ? linkData.url.substring(0, 37) + '...'
                : linkData.url;
            
            // Status badge
            const statusCode = linkData.status_code || 0;
            const statusText = linkData.status_text || 'Unknown';
            const isAccessible = linkData.accessible !== false;
            const statusClass = isAccessible ? 'status-success' : 'status-error';
            const statusIcon = isAccessible ? 'fa-check-circle' : 'fa-times-circle';
            
            // Category badge
            const category = linkData.category || 'Other';
            const categoryColors = {
                'Social Media': '#3b82f6',
                'E-commerce': '#10b981',
                'News': '#f59e0b',
                'Search Engine': '#8b5cf6',
                'Analytics': '#06b6d4',
                'Payment': '#ef4444',
                'Other': '#6b7280'
            };
            const categoryColor = categoryColors[category] || '#6b7280';
            
            // Link type badge
            const linkType = linkData.link_type || 'Follow';
            const linkTypeClass = linkType.includes('Nofollow') ? 'badge-warning' : 
                                 linkType.includes('Sponsored') ? 'badge-danger' : 
                                 linkType.includes('UGC') ? 'badge-info' : 'badge-success';
            
            // Quality score
            const quality = linkData.quality_score || {};
            const qualityScore = quality.score || 0;
            const qualityLevel = quality.level || 'Unknown';
            const qualityClass = qualityLevel === 'Excellent' ? 'quality-excellent' :
                                qualityLevel === 'Good' ? 'quality-good' :
                                qualityLevel === 'Fair' ? 'quality-fair' : 'quality-poor';
            
            html += `
                <tr class="external-link-row" data-link-index="${index}" data-source-index="${sourceIndex}" 
                    data-category="${category}" data-link-type="${linkType}" data-quality="${qualityLevel}" 
                    data-accessible="${isAccessible}">
            `;
            
            // External URL / Domain (only show on first row)
            if (isFirstSource) {
                html += `
                    <td rowspan="${rowspan}" class="external-url-cell">
                        <div class="external-url-info">
                            <div class="external-url-link">
                                <i class="fas fa-external-link-alt"></i>
                                <a href="${linkData.url}" target="_blank" rel="noopener noreferrer" title="${linkData.url}">
                                    ${urlDisplay}
                                </a>
                                ${linkData.has_ssl ? '<i class="fas fa-lock" style="color: #10b981; margin-left: 5px;" title="HTTPS"></i>' : ''}
                            </div>
                            <div class="external-domain">
                                <i class="fas fa-globe"></i> ${domainDisplay}
                            </div>
                            ${linkData.sources.length > 1 ? `<div class="link-count-badge">${linkData.sources.length} pages</div>` : ''}
                        </div>
                    </td>
                    
                    <!-- Status (only show on first row) -->
                    <td rowspan="${rowspan}" class="status-cell">
                        <div class="status-info">
                            <span class="status-badge ${statusClass}" title="${statusText}">
                                <i class="fas ${statusIcon}"></i> ${statusCode || 'N/A'}
                            </span>
                            ${linkData.response_time ? `<div class="response-time">${linkData.response_time}ms</div>` : ''}
                            ${linkData.redirect_count > 0 ? `<div class="redirect-info"><i class="fas fa-arrow-right"></i> ${linkData.redirect_count} redirects</div>` : ''}
                        </div>
                    </td>
                    
                    <!-- Category (only show on first row) -->
                    <td rowspan="${rowspan}" class="category-cell">
                        <span class="category-badge" style="background-color: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
                            ${category}
                        </span>
                    </td>
                    
                    <!-- Link Type (only show on first row) -->
                    <td rowspan="${rowspan}" class="link-type-cell">
                        <span class="badge ${linkTypeClass}">${linkType}</span>
                    </td>
                    
                    <!-- Quality (only show on first row) -->
                    <td rowspan="${rowspan}" class="quality-cell">
                        <div class="quality-info">
                            <span class="quality-badge ${qualityClass}">${qualityScore}/100</span>
                            <div class="quality-level">${qualityLevel}</div>
                        </div>
                    </td>
                `;
            }
            
            // Source Page
            html += `
                <td class="source-page-cell">
                    <div class="source-page-info">
                        <a href="${source.page_url}" target="_blank" title="${source.page_url}">
                            ${(source.page_title || source.page_url).length > 30 ? (source.page_title || source.page_url).substring(0, 27) + '...' : (source.page_title || source.page_url)}
                        </a>
                    </div>
                </td>
            `;
            
            // Anchor Text
            html += `
                <td class="anchor-text-cell">
                    ${source.anchor_text ? `<span class="anchor-text-display" title="${source.anchor_text}">"${source.anchor_text.length > 25 ? source.anchor_text.substring(0, 22) + '...' : source.anchor_text}"</span>` : '<span class="text-muted">(no text)</span>'}
                </td>
            `;
            
            // Actions
            html += `
                <td class="actions-cell">
                    <button class="btn btn-sm btn-primary" onclick="showExternalLinkDetails(${index}, ${sourceIndex})" title="View Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    ${source.css_selector ? `<button class="btn btn-sm btn-secondary" onclick="viewExternalLinkOnPage('${source.page_url}', '${source.css_selector.replace(/'/g, "\\'")}')" title="View on Page">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </td>
            `;
            
            html += `</tr>`;
        });
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Store external links data globally for modal access
    window.externalLinksData = sortedLinks;
    
    // Setup filter
    setupExternalLinksFilter();
}

// Setup external links filter (ENHANCED)
function setupExternalLinksFilter() {
    const searchInput = document.getElementById('externalSearchInput');
    const pageFilter = document.getElementById('externalPageFilter');
    const categoryFilter = document.getElementById('externalCategoryFilter');
    const typeFilter = document.getElementById('externalTypeFilter');
    const qualityFilter = document.getElementById('externalQualityFilter');
    const accessibilityFilter = document.getElementById('externalAccessibilityFilter');
    
    const filterLinks = () => {
        const searchTerm = (searchInput?.value || '').toLowerCase();
        const selectedPage = pageFilter?.value || 'all';
        const selectedCategory = categoryFilter?.value || 'all';
        const selectedType = typeFilter?.value || 'all';
        const selectedQuality = qualityFilter?.value || 'all';
        const selectedAccessibility = accessibilityFilter?.value || 'all';
        
        const linkRows = document.querySelectorAll('.external-link-row');
        linkRows.forEach(row => {
            const linkIndex = parseInt(row.dataset.linkIndex);
            const linkData = window.externalLinksData && window.externalLinksData[linkIndex];
            
            if (!linkData) {
                row.style.display = 'none';
                return;
            }
            
            let show = true;
            
            // Search filter
            if (searchTerm) {
                const urlMatch = linkData.url.toLowerCase().includes(searchTerm);
                const domainMatch = linkData.domain.toLowerCase().includes(searchTerm);
                
                // Check source pages
                let sourceMatch = false;
                linkData.sources.forEach(source => {
                    if (source.page_title.toLowerCase().includes(searchTerm) ||
                        source.page_url.toLowerCase().includes(searchTerm) ||
                        (source.anchor_text && source.anchor_text.toLowerCase().includes(searchTerm))) {
                        sourceMatch = true;
                    }
                });
                
                if (!urlMatch && !domainMatch && !sourceMatch) {
                    show = false;
                }
            }
            
            // Page filter
            if (selectedPage !== 'all') {
                let pageMatch = false;
                linkData.sources.forEach(source => {
                    if (source.page_url === selectedPage) {
                        pageMatch = true;
                    }
                });
                if (!pageMatch) {
                    show = false;
                }
            }
            
            // Category filter
            if (selectedCategory !== 'all') {
                if (linkData.category !== selectedCategory) {
                    show = false;
                }
            }
            
            // Link type filter
            if (selectedType !== 'all') {
                const linkType = linkData.link_type || 'Follow';
                if (!linkType.includes(selectedType)) {
                    show = false;
                }
            }
            
            // Quality filter
            if (selectedQuality !== 'all') {
                const quality = linkData.quality_score?.level || 'Unknown';
                if (quality !== selectedQuality) {
                    show = false;
                }
            }
            
            // Accessibility filter
            if (selectedAccessibility !== 'all') {
                const isAccessible = linkData.accessible !== false;
                if (selectedAccessibility === 'accessible' && !isAccessible) {
                    show = false;
                } else if (selectedAccessibility === 'inaccessible' && isAccessible) {
                    show = false;
                }
            }
            
            row.style.display = show ? '' : 'none';
        });
        
        // Update visible count
        const visibleCount = document.querySelectorAll('.external-link-row[style=""]').length;
        const totalCount = linkRows.length;
        const countEl = document.getElementById('externalLinksCount');
        if (countEl) {
            if (visibleCount < totalCount) {
                countEl.textContent = `${visibleCount} of ${totalCount} links`;
            } else {
                countEl.textContent = `${totalCount} unique links`;
            }
        }
    };
    
    if (searchInput) {
        searchInput.addEventListener('input', filterLinks);
    }
    if (pageFilter) {
        pageFilter.addEventListener('change', filterLinks);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterLinks);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', filterLinks);
    }
    if (qualityFilter) {
        qualityFilter.addEventListener('change', filterLinks);
    }
    if (accessibilityFilter) {
        accessibilityFilter.addEventListener('change', filterLinks);
    }
}

// Show external link details modal (ENHANCED)
function showExternalLinkDetails(linkIndex, sourceIndex) {
    if (!window.externalLinksData || !window.externalLinksData[linkIndex]) return;
    
    const linkData = window.externalLinksData[linkIndex];
    const source = linkData.sources[sourceIndex] || linkData.sources[0];
    
    if (!source) return;
    
    const locationParts = [];
    if (source.location_info?.parent_tag) locationParts.push(`<${source.location_info.parent_tag}>`);
    if (source.location_info?.parent_class) {
        const classes = source.location_info.parent_class.split(' ')[0];
        if (classes) locationParts.push(`.${classes}`);
    }
    if (source.location_info?.parent_id) locationParts.push(`#${source.location_info.parent_id}`);
    const locationStr = locationParts.join(' ') || 'Unknown location';
    
    const contextBefore = (source.context?.before || '').substring(0, 100);
    const contextAfter = (source.context?.after || '').substring(0, 100);
    
    // Enhanced analysis data
    const statusCode = linkData.status_code || 0;
    const statusText = linkData.status_text || 'Not analyzed';
    const isAccessible = linkData.accessible !== false;
    const category = linkData.category || 'Other';
    const linkType = linkData.link_type || 'Follow';
    const quality = linkData.quality_score || {};
    const qualityScore = quality.score || 0;
    const qualityLevel = quality.level || 'Unknown';
    const hasSSL = linkData.has_ssl || false;
    const responseTime = linkData.response_time || 0;
    const redirectCount = linkData.redirect_count || 0;
    const finalUrl = linkData.final_url || linkData.url;
    
    let modalHtml = `
        <div class="modal" id="externalLinkModal" style="display: block;">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2><i class="fas fa-external-link-alt"></i> External Link Details</h2>
                    <span class="close" onclick="closeExternalLinkModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Link Information -->
                    <div class="location-details-section">
                        <h3><i class="fas fa-link"></i> External URL</h3>
                        <p><a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${linkData.url}</a></p>
                        <p><strong>Domain:</strong> ${linkData.domain}</p>
                        ${finalUrl !== linkData.url ? `<p><strong>Final URL (after redirects):</strong> <a href="${finalUrl}" target="_blank">${finalUrl}</a></p>` : ''}
                    </div>
                    
                    <!-- Analysis Results -->
                    <div class="location-details-section">
                        <h3><i class="fas fa-chart-line"></i> Analysis Results</h3>
                        <div class="analysis-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px;">
                            <div class="analysis-item">
                                <strong>Status:</strong> 
                                <span class="status-badge ${isAccessible ? 'status-success' : 'status-error'}">
                                    ${statusCode || 'N/A'} - ${statusText}
                                </span>
                            </div>
                            <div class="analysis-item">
                                <strong>Accessible:</strong> 
                                <span class="badge ${isAccessible ? 'badge-success' : 'badge-danger'}">
                                    ${isAccessible ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="analysis-item">
                                <strong>Category:</strong> 
                                <span class="category-badge">${category}</span>
                            </div>
                            <div class="analysis-item">
                                <strong>Link Type:</strong> 
                                <span class="badge ${linkType.includes('Nofollow') ? 'badge-warning' : 'badge-success'}">${linkType}</span>
                            </div>
                            <div class="analysis-item">
                                <strong>Quality Score:</strong> 
                                <span class="quality-badge quality-${qualityLevel.toLowerCase()}">${qualityScore}/100 (${qualityLevel})</span>
                            </div>
                            <div class="analysis-item">
                                <strong>HTTPS:</strong> 
                                <span class="badge ${hasSSL ? 'badge-success' : 'badge-warning'}">
                                    ${hasSSL ? '<i class="fas fa-lock"></i> Yes' : '<i class="fas fa-unlock"></i> No'}
                                </span>
                            </div>
                            ${responseTime > 0 ? `<div class="analysis-item">
                                <strong>Response Time:</strong> ${responseTime}ms
                            </div>` : ''}
                            ${redirectCount > 0 ? `<div class="analysis-item">
                                <strong>Redirects:</strong> ${redirectCount}
                            </div>` : ''}
                        </div>
                        ${quality.factors && quality.factors.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <strong>Quality Factors:</strong>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                ${quality.factors.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Source Page -->
                    <div class="location-details-section">
                        <h3><i class="fas fa-file-alt"></i> Source Page</h3>
                        <p><a href="${source.page_url}" target="_blank">${source.page_title || source.page_url}</a></p>
                        <p><strong>Status:</strong> <span class="status-badge status-${source.page_status === 200 ? '200' : 'error'}">${source.page_status || 'Unknown'}</span></p>
                    </div>
                    
                    <!-- Anchor Text & Attributes -->
                    <div class="location-details-section">
                        <h3><i class="fas fa-quote-left"></i> Anchor Text & Attributes</h3>
                        <p><strong>Anchor Text:</strong> ${source.anchor_text || '(no anchor text)'}</p>
                        ${source.rel && source.rel.length > 0 ? `<p><strong>Rel Attributes:</strong> ${source.rel.join(', ')}</p>` : ''}
                        ${source.target ? `<p><strong>Target:</strong> ${source.target}</p>` : ''}
                    </div>
                    
                    <!-- Location Information -->
                    <div class="location-details-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Location Information</h3>
                        <p><strong>HTML Element:</strong> ${locationStr}</p>
                        ${source.location_info?.line_number > 0 ? `<p><strong>Line Number:</strong> ${source.location_info.line_number}</p>` : ''}
                        ${source.css_selector ? `<p><strong>CSS Selector:</strong> <code>${source.css_selector}</code></p>` : ''}
                    </div>
                    
                    ${(contextBefore || contextAfter) ? `
                    <div class="location-details-section">
                        <h3><i class="fas fa-quote-left"></i> Context</h3>
                        <div class="link-context">
                            ${contextBefore ? `<span class="context-before">...${contextBefore}</span>` : ''}
                            <span class="link-highlight">${source.anchor_text || 'link'}</span>
                            ${contextAfter ? `<span class="context-after">${contextAfter}...</span>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                        ${source.css_selector ? `<button class="btn btn-primary" onclick="viewExternalLinkOnPage('${source.page_url}', '${source.css_selector.replace(/'/g, "\\'")}')">
                            <i class="fas fa-eye"></i> View on Page
                        </button>` : ''}
                        <button class="btn btn-secondary" onclick="closeExternalLinkModal()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('externalLinkModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeExternalLinkModal() {
    const modal = document.getElementById('externalLinkModal');
    if (modal) modal.remove();
}

// View external link on source page
function viewExternalLinkOnPage(pageUrl, cssSelector) {
    const newWindow = window.open(pageUrl, '_blank');
    
    if (newWindow) {
        newWindow.onload = function() {
            try {
                const script = `
                    (function() {
                        try {
                            const selector = ${JSON.stringify(cssSelector)};
                            const element = document.querySelector(selector);
                            if (element) {
                                element.style.outline = '3px solid #4a90e2';
                                element.style.outlineOffset = '2px';
                                element.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                setTimeout(() => {
                                    element.style.outline = '';
                                    element.style.outlineOffset = '';
                                    element.style.backgroundColor = '';
                                }, 5000);
                            } else {
                                alert('Link element not found on page.');
                            }
                        } catch(e) {
                            console.error('Error highlighting element:', e);
                        }
                    })();
                `;
                newWindow.eval(script);
            } catch (e) {
                console.error('Error opening page:', e);
                alert('Could not highlight link on page. Please check the page manually.');
            }
        };
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
    
    // Page Power
    const pagePowerCell = document.createElement('td');
    const pagePower = page.page_power;
    if (pagePower !== undefined && pagePower !== null) {
        const powerSpan = document.createElement('span');
        powerSpan.className = 'page-power-score';
        if (pagePower >= 80) {
            powerSpan.className += ' power-high';
        } else if (pagePower >= 50) {
            powerSpan.className += ' power-medium';
        } else {
            powerSpan.className += ' power-low';
        }
        powerSpan.textContent = pagePower.toFixed(1);
        pagePowerCell.appendChild(powerSpan);
    } else {
        pagePowerCell.textContent = '-';
    }
    tr.appendChild(pagePowerCell);
    
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
                    ${page.internal_links.slice(0, 20).map(link => {
                        const url = typeof link === 'string' ? link : (link.url || '');
                        return `<li><a href="${url}" target="_blank">${url}</a></li>`;
                    }).join('')}
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
            (sectionName === 'broken-links' && btnText.includes('broken')) ||
            (sectionName === 'summary-report' && btnText.includes('summary'))) {
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

// Calculate performance score based on issues
function calculatePerformanceScore(heavyImages, slowJsCss, slowSections, slowComponents, renderBlocking) {
    let score = 100;
    const maxDeduction = 50; // Maximum deduction from score
    
    // Heavy images deduction (max 15 points)
    if (heavyImages > 0) {
        const imageDeduction = Math.min(15, heavyImages * 2);
        score -= imageDeduction;
    }
    
    // Slow JS/CSS deduction (max 15 points)
    if (slowJsCss > 0) {
        const fileDeduction = Math.min(15, slowJsCss * 3);
        score -= fileDeduction;
    }
    
    // Slow sections deduction (max 10 points)
    if (slowSections > 0) {
        const sectionDeduction = Math.min(10, slowSections * 2);
        score -= sectionDeduction;
    }
    
    // Slow components deduction (max 10 points)
    if (slowComponents > 0) {
        const componentDeduction = Math.min(10, slowComponents * 2);
        score -= componentDeduction;
    }
    
    // Render-blocking deduction (max 20 points)
    if (renderBlocking > 0) {
        const blockingDeduction = Math.min(20, renderBlocking * 5);
        score -= blockingDeduction;
    }
    
    score = Math.max(0, Math.min(100, score));
    return Math.round(score);
}

// Get performance grade
function getPerformanceGrade(score) {
    if (score >= 90) return { grade: 'A', color: '#10b981', text: 'Excellent' };
    if (score >= 75) return { grade: 'B', color: '#3b82f6', text: 'Good' };
    if (score >= 60) return { grade: 'C', color: '#f59e0b', text: 'Needs Improvement' };
    if (score >= 40) return { grade: 'D', color: '#ef4444', text: 'Poor' };
    return { grade: 'F', color: '#dc2626', text: 'Critical' };
}

// Get performance status badge
function getPerformanceStatus(count, threshold, type) {
    if (count === 0) return { status: 'Good', class: 'status-good', icon: 'fa-check-circle' };
    if (count <= threshold) return { status: 'Warning', class: 'status-warning', icon: 'fa-exclamation-triangle' };
    return { status: 'Critical', class: 'status-critical', icon: 'fa-times-circle' };
}

// Generate fix guide HTML
function generateFixGuide(issueType, issue) {
    const fixGuides = {
        heavyImage: {
            title: 'How to Optimize Heavy Images',
            description: 'Large images slow down page load times and increase bandwidth usage. Follow these steps to optimize:',
            steps: [
                {
                    title: '1. Compress the Image',
                    description: 'Use image compression tools to reduce file size without significant quality loss.',
                    code: `<!-- Use tools like TinyPNG, ImageOptim, or Squoosh -->
<!-- Before: 2MB image -->
<!-- After: 150KB image (85% reduction) -->`,
                    tools: ['TinyPNG', 'ImageOptim', 'Squoosh', 'Compressor.io']
                },
                {
                    title: '2. Use Modern Image Formats',
                    description: 'Convert to WebP or AVIF format for better compression (up to 30% smaller than JPEG).',
                    code: `<!-- Convert to WebP format -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description">
</picture>`,
                    tools: ['CloudConvert', 'Squoosh', 'cwebp CLI']
                },
                {
                    title: '3. Add Lazy Loading',
                    description: 'Load images only when they\'re about to enter the viewport.',
                    code: `<!-- Add loading="lazy" attribute -->
<img src="${issue.url || 'image.jpg'}" 
     alt="Description" 
     loading="lazy"
     width="${issue.width || 800}" 
     height="${issue.height || 600}">`,
                    note: 'Native lazy loading is supported in all modern browsers'
                },
                {
                    title: '4. Specify Image Dimensions',
                    description: 'Always include width and height attributes to prevent layout shift.',
                    code: `<!-- Always specify dimensions -->
<img src="image.jpg" 
     alt="Description"
     width="800"
     height="600">`,
                    note: 'Prevents Cumulative Layout Shift (CLS)'
                },
                {
                    title: '5. Use Responsive Images',
                    description: 'Serve different image sizes for different screen sizes.',
                    code: `<!-- Responsive images with srcset -->
<img srcset="
  image-small.jpg 400w,
  image-medium.jpg 800w,
  image-large.jpg 1200w
" 
     sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
     src="image-medium.jpg"
     alt="Description">`
                }
            ],
            priority: issue.size_kb > 500 ? 'High' : 'Medium',
            estimatedSavings: `Reduce ${issue.size_kb ? (issue.size_kb * 0.7).toFixed(0) : '70'}% file size`
        },
        slowJsCss: {
            title: 'How to Optimize Slow JS/CSS Files',
            description: 'Large JavaScript and CSS files block page rendering. Optimize them with these techniques:',
            steps: [
                {
                    title: '1. Minify and Compress',
                    description: 'Minify JavaScript and CSS to remove whitespace and comments, then compress with gzip/brotli.',
                    code: `// Before minification (development)
function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

// After minification (production)
function calculateTotal(e){let t=0;for(let i=0;i<e.length;i++)t+=e[i].price;return t}`,
                    tools: ['UglifyJS', 'Terser', 'cssnano', 'Webpack', 'Parcel']
                },
                {
                    title: '2. Split and Code Split',
                    description: 'Break large files into smaller chunks and load only what\'s needed.',
                    code: `// Use dynamic imports for code splitting
// Instead of: import { heavyFunction } from './heavy-module';
// Use:
const heavyFunction = await import('./heavy-module')
  .then(module => module.heavyFunction);`,
                    note: 'Reduces initial bundle size significantly'
                },
                {
                    title: '3. Add Async/Defer Attributes',
                    description: 'Prevent JavaScript from blocking HTML parsing.',
                    code: `<!-- For scripts that don't need to run immediately -->
<script src="script.js" defer></script>

<!-- For scripts that are independent -->
<script src="analytics.js" async></script>`,
                    note: 'Defer: executes after HTML parsing. Async: downloads in parallel'
                },
                {
                    title: '4. Remove Unused CSS',
                    description: 'Remove CSS that isn\'t actually used on your pages.',
                    code: `/* Use tools to detect and remove unused CSS */
/* Before: 200KB of CSS */
/* After: 50KB of CSS (75% reduction) */`,
                    tools: ['PurgeCSS', 'UnCSS', 'Chrome DevTools Coverage']
                },
                {
                    title: '5. Use CDN for Libraries',
                    description: 'Load common libraries from CDN with caching benefits.',
                    code: `<!-- Load from CDN instead of hosting -->
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<!-- Browser may already have this cached -->`
                }
            ],
            priority: 'High',
            estimatedSavings: `Reduce ${issue.size_kb ? (issue.size_kb * 0.6).toFixed(0) : '60'}% file size`
        },
        renderBlocking: {
            title: 'How to Fix Render-Blocking Resources',
            description: 'Render-blocking resources delay the first paint of your page. Fix them immediately:',
            steps: [
                {
                    title: '1. Add Async or Defer to Scripts',
                    description: 'Move scripts to the end of body or add async/defer attributes.',
                    code: `<!-- ❌ BAD: Blocks rendering -->
<script src="script.js"></script>

<!-- ✅ GOOD: Non-blocking -->
<script src="script.js" defer></script>
<!-- OR -->
<script src="analytics.js" async></script>`,
                    note: 'Defer = after HTML parsing, Async = parallel download'
                },
                {
                    title: '2. Inline Critical CSS',
                    description: 'Inline above-the-fold CSS directly in the <head> tag.',
                    code: `<!-- Inline critical CSS in <head> -->
<style>
  /* Critical above-the-fold styles here */
  body { font-family: Arial; }
  header { background: #333; }
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>`
                },
                {
                    title: '3. Use Preload for Important Resources',
                    description: 'Hint to browser about resources needed early.',
                    code: `<!-- Preload important resources -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="hero-image.jpg" as="image">`,
                    note: 'Tells browser to fetch resource early'
                },
                {
                    title: '4. Defer Non-Critical CSS',
                    description: 'Load non-critical CSS asynchronously.',
                    code: `<!-- Load CSS asynchronously -->
<link rel="preload" href="non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="non-critical.css"></noscript>

<!-- Or use loadCSS library -->
<script>
  loadCSS("non-critical.css");
</script>`
                },
                {
                    title: '5. Minimize and Combine Files',
                    description: 'Reduce the number of render-blocking resources.',
                    code: `<!-- ❌ BAD: Multiple files -->
<link rel="stylesheet" href="reset.css">
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="components.css">

<!-- ✅ GOOD: Combined and minified -->
<link rel="stylesheet" href="main.min.css">`
                }
            ],
            priority: 'Critical',
            estimatedSavings: 'Improve First Contentful Paint by 1-2 seconds'
        },
        slowHtmlSection: {
            title: 'How to Optimize Slow HTML Sections',
            description: 'Complex or deeply nested HTML structures slow down browser rendering. Simplify your HTML structure with these techniques:',
            steps: [
                {
                    title: '1. Reduce Nesting Depth',
                    description: 'Flatten your HTML structure to reduce nesting levels. Keep nesting depth under 10 levels.',
                    code: `<!-- ❌ BAD: Too much nesting -->
<div>
  <div>
    <div>
      <div>
        <div>
          <p>Content</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ✅ GOOD: Flatter structure -->
<div>
  <p>Content</p>
</div>`,
                    note: 'Use semantic HTML5 elements (section, article, main) instead of nested divs'
                },
                {
                    title: '2. Split Large Sections',
                    description: 'Break large sections with many children into smaller, manageable components.',
                    code: `<!-- ❌ BAD: One huge section with 100+ children -->
<section>
  <!-- 100+ elements here -->
</section>

<!-- ✅ GOOD: Split into smaller sections -->
<section class="hero"></section>
<section class="features"></section>
<section class="content"></section>`,
                    note: 'Components with 50+ direct children should be split'
                },
                {
                    title: '3. Use CSS Grid/Flexbox Instead of Nested Divs',
                    description: 'Modern CSS layout methods reduce the need for wrapper divs.',
                    code: `<!-- ❌ BAD: Nested divs for layout -->
<div class="container">
  <div class="row">
    <div class="col">
      <div class="content">Content</div>
    </div>
  </div>
</div>

<!-- ✅ GOOD: CSS Grid -->
<div class="grid-container">
  <div class="content">Content</div>
</div>

/* CSS */
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}`
                },
                {
                    title: '4. Lazy Load Images in Sections',
                    description: 'Don\'t load all images in a large section at once.',
                    code: `<!-- Add loading="lazy" to images -->
<img src="image.jpg" 
     alt="Description"
     loading="lazy"
     width="800"
     height="600">`,
                    note: 'Native lazy loading loads images only when needed'
                },
                {
                    title: '5. Minimize DOM Elements',
                    description: 'Remove unnecessary wrapper elements and use CSS for styling.',
                    code: `<!-- ❌ BAD: Unnecessary wrappers -->
<div class="wrapper">
  <div class="container">
    <div class="content">
      <p>Text</p>
    </div>
  </div>
</div>

<!-- ✅ GOOD: Minimal structure -->
<div class="content">
  <p>Text</p>
</div>

/* Use CSS for layout, not extra divs */`
                }
            ],
            priority: 'High',
            estimatedSavings: 'Improve rendering time by 10-30%'
        },
        slowComponent: {
            title: 'How to Optimize Slow Components',
            description: 'Large tables, complex forms, and image galleries can slow down your page. Optimize them with these strategies:',
            steps: [
                {
                    title: '1. Implement Pagination for Large Tables',
                    description: 'Split large tables into multiple pages instead of loading all rows at once.',
                    code: `<!-- Show 25 rows per page -->
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <!-- Only render visible rows (25 per page) -->
    <tr><td>Row 1</td><td>Data</td></tr>
    <tr><td>Row 2</td><td>Data</td></tr>
    <!-- ... 23 more rows ... -->
  </tbody>
</table>

<!-- Pagination controls -->
<div class="pagination">
  <button>Previous</button>
  <span>Page 1 of 10</span>
  <button>Next</button>
</div>`,
                    tools: ['DataTables', 'AG Grid', 'React Table']
                },
                {
                    title: '2. Use Virtual Scrolling',
                    description: 'Only render visible items in long lists (100+ items).',
                    code: `// JavaScript example - only render visible items
function renderVisibleItems(items, containerHeight, itemHeight) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = startIndex + visibleCount;
  
  return items.slice(startIndex, endIndex).map(item => renderItem(item));
}`,
                    tools: ['react-window', 'react-virtualized', 'vue-virtual-scroller']
                },
                {
                    title: '3. Lazy Load Images in Galleries',
                    description: 'Load images as users scroll through galleries.',
                    code: `<!-- Use native lazy loading -->
<div class="gallery">
  <img src="image1.jpg" loading="lazy" alt="Image 1">
  <img src="image2.jpg" loading="lazy" alt="Image 2">
  <!-- Images load only when visible -->
</div>

<!-- Or use Intersection Observer API -->
<script>
  const images = document.querySelectorAll('.gallery img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
</script>`
                },
                {
                    title: '4. Optimize Forms',
                    description: 'Split long forms into multiple steps or use progressive disclosure.',
                    code: `<!-- Multi-step form -->
<form id="multi-step-form">
  <div class="form-step active" data-step="1">
    <!-- Step 1 fields -->
  </div>
  <div class="form-step" data-step="2">
    <!-- Step 2 fields -->
  </div>
  <div class="form-step" data-step="3">
    <!-- Step 3 fields -->
  </div>
</form>

<!-- Only validate/process visible step -->
<script>
  function showStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });
    document.querySelector('[data-step="' + stepNumber + '"]').classList.add('active');
  }
</script>`
                },
                {
                    title: '5. Defer Heavy Widgets',
                    description: 'Load widgets and iframes after the main content.',
                    code: `<!-- Load widget after page load -->
<script>
  window.addEventListener('load', () => {
    // Load heavy widget after everything else
    const script = document.createElement('script');
    script.src = 'heavy-widget.js';
    document.body.appendChild(script);
  });
</script>

<!-- Or use async/defer for iframes -->
<iframe src="widget.html" 
        loading="lazy"
        style="width: 100%; height: 600px;">
</iframe>`
                }
            ],
            priority: 'High',
            estimatedSavings: 'Improve interactivity by 20-50%'
        }
    };
    
    return fixGuides[issueType] || null;
}

// Update performance overview cards
function updatePerformanceOverview(score, gradeInfo, heavyImages, slowJsCss, slowSections, slowComponents, renderBlocking) {
    const totalIssues = heavyImages + slowJsCss + slowSections + slowComponents + renderBlocking;
    
    // Update score circle
    const scoreCircle = document.getElementById('performanceScoreCircle');
    const scoreValue = document.getElementById('performanceScoreValue');
    const scoreGrade = document.getElementById('performanceScoreGrade');
    const scoreDescription = document.getElementById('performanceScoreDescription');
    
    if (scoreCircle && scoreValue) {
        const circumference = 2 * Math.PI * 54; // radius is 54
        const offset = circumference - (score / 100) * circumference;
        scoreCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        scoreCircle.style.strokeDashoffset = offset;
        scoreCircle.style.stroke = gradeInfo.color;
        scoreValue.textContent = score;
        scoreValue.style.color = gradeInfo.color;
    }
    
    if (scoreGrade) {
        scoreGrade.textContent = gradeInfo.grade;
        scoreGrade.style.color = gradeInfo.color;
        scoreGrade.style.borderColor = gradeInfo.color;
    }
    
    if (scoreDescription) {
        scoreDescription.textContent = gradeInfo.text + ' • ' + totalIssues + ' issue' + (totalIssues !== 1 ? 's' : '') + ' found';
    }
    
    // Update metric cards
    const metrics = [
        { id: 'metricHeavyImages', statusId: 'statusHeavyImages', value: heavyImages, threshold: 3 },
        { id: 'metricSlowFiles', statusId: 'statusSlowFiles', value: slowJsCss, threshold: 5 },
        { id: 'metricSlowSections', statusId: 'statusSlowSections', value: slowSections, threshold: 5 },
        { id: 'metricSlowComponents', statusId: 'statusSlowComponents', value: slowComponents, threshold: 3 },
        { id: 'metricRenderBlocking', statusId: 'statusRenderBlocking', value: renderBlocking, threshold: 2 },
        { id: 'metricTotalIssues', statusId: 'statusTotalIssues', value: totalIssues, threshold: 10 }
    ];
    
    metrics.forEach(metric => {
        const valueEl = document.getElementById(metric.id);
        const statusEl = document.getElementById(metric.statusId);
        
        if (valueEl) valueEl.textContent = metric.value;
        if (statusEl) {
            const status = getPerformanceStatus(metric.value, metric.threshold, 'general');
            statusEl.textContent = status.status;
            statusEl.className = 'metric-status ' + status.class;
        }
    });
}

// Generate pages summary table
function generatePagesPerformanceSummary(allHeavyImages, allSlowJsCss, allSlowHtmlSections, allSlowComponents, allRenderBlocking) {
    const pagesSummary = {};
    
    // Count issues per page
    allHeavyImages.forEach(img => {
        if (!pagesSummary[img.page_url]) {
            pagesSummary[img.page_url] = {
                url: img.page_url,
                title: img.page_title,
                heavyImages: 0,
                slowJsCss: 0,
                slowSections: 0,
                slowComponents: 0,
                renderBlocking: 0
            };
        }
        pagesSummary[img.page_url].heavyImages++;
    });
    
    allSlowJsCss.forEach(file => {
        if (!pagesSummary[file.page_url]) {
            pagesSummary[file.page_url] = {
                url: file.page_url,
                title: file.page_title,
                heavyImages: 0,
                slowJsCss: 0,
                slowSections: 0,
                slowComponents: 0,
                renderBlocking: 0
            };
        }
        pagesSummary[file.page_url].slowJsCss++;
    });
    
    allSlowHtmlSections.forEach(section => {
        if (!pagesSummary[section.page_url]) {
            pagesSummary[section.page_url] = {
                url: section.page_url,
                title: section.page_title,
                heavyImages: 0,
                slowJsCss: 0,
                slowSections: 0,
                slowComponents: 0,
                renderBlocking: 0
            };
        }
        pagesSummary[section.page_url].slowSections++;
    });
    
    allSlowComponents.forEach(component => {
        if (!pagesSummary[component.page_url]) {
            pagesSummary[component.page_url] = {
                url: component.page_url,
                title: component.page_title,
                heavyImages: 0,
                slowJsCss: 0,
                slowSections: 0,
                slowComponents: 0,
                renderBlocking: 0
            };
        }
        pagesSummary[component.page_url].slowComponents++;
    });
    
    allRenderBlocking.forEach(resource => {
        if (!pagesSummary[resource.page_url]) {
            pagesSummary[resource.page_url] = {
                url: resource.page_url,
                title: resource.page_title,
                heavyImages: 0,
                slowJsCss: 0,
                slowSections: 0,
                slowComponents: 0,
                renderBlocking: 0
            };
        }
        pagesSummary[resource.page_url].renderBlocking++;
    });
    
    // Convert to array and calculate totals
    const pagesArray = Object.values(pagesSummary).map(page => ({
        ...page,
        totalIssues: page.heavyImages + page.slowJsCss + page.slowSections + page.slowComponents + page.renderBlocking
    }));
    
    // Sort by total issues (descending)
    pagesArray.sort((a, b) => b.totalIssues - a.totalIssues);
    
    return pagesArray;
}

// Display pages performance summary
function displayPagesPerformanceSummary(pagesArray) {
    const summaryContainer = document.getElementById('performancePagesSummary');
    const summaryBody = document.getElementById('performancePagesSummaryBody');
    
    if (!summaryContainer || !summaryBody) return;
    
    if (pagesArray.length === 0) {
        summaryContainer.style.display = 'none';
        return;
    }
    
    summaryContainer.style.display = 'block';
    
    let html = '';
    pagesArray.forEach(page => {
        const urlDisplay = page.url.length > 60 ? page.url.substring(0, 57) + '...' : page.url;
        
        html += `
            <tr>
                <td class="page-url-cell">
                    <a href="${page.url}" target="_blank" title="${page.url}">${urlDisplay}</a>
                    ${page.title ? `<div class="page-title-small">${page.title}</div>` : ''}
                </td>
                <td class="issue-count-cell">
                    ${page.heavyImages > 0 ? `<span class="badge badge-warning">${page.heavyImages}</span>` : '<span class="text-success">0</span>'}
                </td>
                <td class="issue-count-cell">
                    ${page.slowJsCss > 0 ? `<span class="badge badge-info">${page.slowJsCss}</span>` : '<span class="text-success">0</span>'}
                </td>
                <td class="issue-count-cell">
                    ${page.slowSections > 0 ? `<span class="badge badge-warning">${page.slowSections}</span>` : '<span class="text-success">0</span>'}
                </td>
                <td class="issue-count-cell">
                    ${page.slowComponents > 0 ? `<span class="badge badge-warning">${page.slowComponents}</span>` : '<span class="text-success">0</span>'}
                </td>
                <td class="issue-count-cell">
                    ${page.renderBlocking > 0 ? `<span class="badge badge-danger">${page.renderBlocking}</span>` : '<span class="text-success">0</span>'}
                </td>
                <td class="issue-count-cell">
                    <strong>${page.totalIssues}</strong>
                </td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-primary" onclick="showPageDetailsByUrl('${page.url}')" title="View Page Details">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    summaryBody.innerHTML = html;
}

// Display performance analysis section
function displayPerformanceAnalysis(data) {
    try {
        if (!data || !data.pages || data.pages.length === 0) {
            console.warn('No performance data available');
            return;
        }
        
        const heavyImagesContainer = document.getElementById('heavyImagesContainer');
        const slowJsCssContainer = document.getElementById('slowJsCssContainer');
        const slowHtmlSectionsContainer = document.getElementById('slowHtmlSectionsContainer');
        const slowComponentsContainer = document.getElementById('slowComponentsContainer');
        const renderBlockingContainer = document.getElementById('renderBlockingContainer');
        const pageFilter = document.getElementById('performancePageFilter');
        
        if (!heavyImagesContainer || !slowJsCssContainer || !slowHtmlSectionsContainer || 
            !slowComponentsContainer || !renderBlockingContainer) {
            console.warn('Performance containers not found');
            return;
        }
    
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
        pageFilter.innerHTML = '<option value="all">All Pages</option>';
        data.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.url;
            option.textContent = page.title || page.url;
            pageFilter.appendChild(option);
        });
    }
    
    // Calculate performance score
    const performanceScore = calculatePerformanceScore(
        allHeavyImages.length,
        allSlowJsCss.length,
        allSlowHtmlSections.length,
        allSlowComponents.length,
        allRenderBlocking.length
    );
    const gradeInfo = getPerformanceGrade(performanceScore);
    
    // Update performance overview
    updatePerformanceOverview(
        performanceScore,
        gradeInfo,
        allHeavyImages.length,
        allSlowJsCss.length,
        allSlowHtmlSections.length,
        allSlowComponents.length,
        allRenderBlocking.length
    );
    
    // Generate and display pages summary
    const pagesSummary = generatePagesPerformanceSummary(
        allHeavyImages,
        allSlowJsCss,
        allSlowHtmlSections,
        allSlowComponents,
        allRenderBlocking
    );
    displayPagesPerformanceSummary(pagesSummary);
    
    // Display heavy images with enhanced UI
    if (allHeavyImages.length === 0) {
        heavyImagesContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <p>No heavy images detected. Your images are optimized!</p>
            </div>
        `;
    } else {
        let html = `
            <div class="performance-issue-intro">
                <div class="issue-description">
                    <h4><i class="fas fa-info-circle"></i> About Heavy Images</h4>
                    <p>Large image files significantly slow down page load times. Images over 200KB can cause:</p>
                    <ul>
                        <li>Increased bandwidth usage</li>
                        <li>Slower page load times (especially on mobile)</li>
                        <li>Poor user experience and higher bounce rates</li>
                        <li>Negative impact on SEO rankings</li>
                    </ul>
                    <p><strong>Recommended:</strong> Keep images under 100KB for web use. Use compression, modern formats (WebP), and lazy loading.</p>
                </div>
            </div>
            <div class="performance-items-list">
        `;
        
        allHeavyImages.slice(0, 20).forEach((img, index) => {
            const sizeDisplay = img.size_mb >= 1 ? `${img.size_mb.toFixed(2)} MB` : `${img.size_kb.toFixed(2)} KB`;
            const isCritical = img.size_kb > 500;
            const priority = isCritical ? 'Critical' : img.size_kb > 200 ? 'High' : 'Medium';
            const priorityClass = isCritical ? 'priority-critical' : 'priority-high';
            
            html += `
                <div class="performance-issue-card ${priorityClass}">
                    <div class="issue-card-header">
                        <div class="issue-priority">
                            <span class="priority-badge ${priorityClass}">
                                <i class="fas fa-${isCritical ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                                ${priority} Priority
                            </span>
                            <span class="issue-size">${sizeDisplay}</span>
                        </div>
                        <button class="btn-fix-guide" onclick="showPerformanceFixGuide('heavyImage', ${index})">
                            <i class="fas fa-wrench"></i> How to Fix
                        </button>
                    </div>
                    <div class="issue-card-content">
                        <div class="issue-details-grid">
                            <div class="issue-detail">
                                <strong><i class="fas fa-image"></i> Image URL:</strong>
                                <a href="${img.url}" target="_blank" title="${img.url}">
                                    ${img.url.length > 60 ? img.url.substring(0, 57) + '...' : img.url}
                                </a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-alt"></i> Page:</strong>
                                <a href="${img.page_url}" target="_blank">${img.page_title || img.page_url}</a>
                            </div>
                            ${img.width && img.height ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-expand-arrows-alt"></i> Dimensions:</strong>
                                ${img.width}×${img.height}px
                            </div>
                            ` : ''}
                            <div class="issue-detail">
                                <strong><i class="fas fa-file"></i> Format:</strong>
                                ${img.format || 'Unknown'}
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-map-marker-alt"></i> Location:</strong>
                                ${img.location || 'Unknown'}
                            </div>
                        </div>
                        ${img.html_snippet ? `
                        <div class="issue-code-preview">
                            <strong>Current HTML:</strong>
                            <pre><code>${img.html_snippet}</code></pre>
                        </div>
                        ` : ''}
                        <div class="issue-impact">
                            <strong>Impact:</strong>
                            <span class="impact-text">This image adds ${sizeDisplay} to page load. Optimizing could save approximately ${(img.size_kb * 0.7).toFixed(0)}KB (70% reduction).</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (allHeavyImages.length > 20) {
            html += `<div class="performance-more-items">... and ${allHeavyImages.length - 20} more heavy images</div>`;
        }
        
        html += `</div>`;
        heavyImagesContainer.innerHTML = html;
        
        // Store heavy images data for fix guide
        window.performanceHeavyImages = allHeavyImages;
    }
    
    // Display slow JS/CSS with enhanced UI
    if (allSlowJsCss.length === 0) {
        slowJsCssContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <p>No large JS/CSS files detected. Your files are optimized!</p>
            </div>
        `;
    } else {
        let html = `
            <div class="performance-issue-intro">
                <div class="issue-description">
                    <h4><i class="fas fa-info-circle"></i> About Slow JS/CSS Files</h4>
                    <p>Large JavaScript and CSS files significantly impact page load times:</p>
                    <ul>
                        <li>JavaScript files over 100KB slow down parsing and execution</li>
                        <li>CSS files block rendering until fully loaded</li>
                        <li>Unminified code contains unnecessary whitespace and comments</li>
                        <li>Unused code increases bundle size unnecessarily</li>
                    </ul>
                    <p><strong>Recommended:</strong> Keep JS files under 100KB, CSS files under 50KB. Use minification, compression, and code splitting.</p>
                </div>
            </div>
            <div class="performance-items-list">
        `;
        
        allSlowJsCss.slice(0, 20).forEach((file, index) => {
            const sizeKB = file.size_kb || 0;
            const isCritical = sizeKB > 200;
            const priority = isCritical ? 'Critical' : sizeKB > 100 ? 'High' : 'Medium';
            const priorityClass = isCritical ? 'priority-critical' : 'priority-high';
            
            html += `
                <div class="performance-issue-card ${priorityClass}">
                    <div class="issue-card-header">
                        <div class="issue-priority">
                            <span class="priority-badge ${priorityClass}">
                                <i class="fas fa-${isCritical ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                                ${priority} Priority
                            </span>
                            <span class="issue-size">${sizeKB.toFixed(2)} KB</span>
                        </div>
                        <button class="btn-fix-guide" onclick="showPerformanceFixGuide('slowJsCss', ${index})">
                            <i class="fas fa-wrench"></i> How to Fix
                        </button>
                    </div>
                    <div class="issue-card-content">
                        <div class="issue-details-grid">
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-code"></i> File URL:</strong>
                                <a href="${file.url}" target="_blank" title="${file.url}">
                                    ${file.url.length > 60 ? file.url.substring(0, 57) + '...' : file.url}
                                </a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-alt"></i> Page:</strong>
                                <a href="${file.page_url}" target="_blank">${file.page_title || file.page_url}</a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-file"></i> File Type:</strong>
                                ${file.type || 'Unknown'}
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-hdd"></i> File Size:</strong>
                                ${sizeKB >= 1024 ? (sizeKB / 1024).toFixed(2) + ' MB' : sizeKB.toFixed(2) + ' KB'}
                            </div>
                            ${file.is_render_blocking ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-ban"></i> Render-Blocking:</strong>
                                <span class="text-danger">Yes - This file blocks page rendering</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="issue-impact">
                            <strong>Impact:</strong>
                            <span class="impact-text">This ${file.type || 'file'} (${sizeKB.toFixed(2)} KB) ${file.is_render_blocking ? 'is blocking page rendering and ' : ''}slows down page load. Optimizing could reduce file size by 60-80% and improve load time by ${Math.round(sizeKB / 50)}-${Math.round(sizeKB / 30)}ms.</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (allSlowJsCss.length > 20) {
            html += `<div class="performance-more-items">... and ${allSlowJsCss.length - 20} more slow JS/CSS files</div>`;
        }
        
        html += `</div>`;
        slowJsCssContainer.innerHTML = html;
        
        // Store data for fix guide
        window.performanceSlowJsCss = allSlowJsCss;
    }
    
    // Display slow HTML sections with enhanced UI
    if (allSlowHtmlSections.length === 0) {
        slowHtmlSectionsContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <p>No problematic HTML sections detected. Your HTML structure is optimized!</p>
            </div>
        `;
    } else {
        let html = `
            <div class="performance-issue-intro">
                <div class="issue-description">
                    <h4><i class="fas fa-info-circle"></i> About Slow HTML Sections</h4>
                    <p>Complex or deeply nested HTML structures can slow down page rendering. Issues include:</p>
                    <ul>
                        <li>Excessive nesting depth (harder for browser to parse)</li>
                        <li>Too many child elements in a single container</li>
                        <li>Large sections with many images</li>
                        <li>Complex DOM structures that slow down JavaScript</li>
                    </ul>
                    <p><strong>Recommended:</strong> Keep nesting depth under 10 levels, limit children per container to 50, and split large sections into smaller components.</p>
                </div>
            </div>
            <div class="performance-items-list">
        `;
        
        allSlowHtmlSections.slice(0, 20).forEach((section, index) => {
            const isCritical = section.nesting_depth > 15 || section.children_count > 100;
            const priority = isCritical ? 'Critical' : section.nesting_depth > 10 || section.children_count > 50 ? 'High' : 'Medium';
            const priorityClass = isCritical ? 'priority-critical' : 'priority-high';
            
            html += `
                <div class="performance-issue-card ${priorityClass}">
                    <div class="issue-card-header">
                        <div class="issue-priority">
                            <span class="priority-badge ${priorityClass}">
                                <i class="fas fa-${isCritical ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                                ${priority} Priority
                            </span>
                            <span class="issue-size">${section.element || 'HTML Section'}</span>
                        </div>
                        <button class="btn-fix-guide" onclick="showPerformanceFixGuide('slowHtmlSection', ${index})">
                            <i class="fas fa-wrench"></i> How to Fix
                        </button>
                    </div>
                    <div class="issue-card-content">
                        <div class="issue-details-grid">
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-alt"></i> Page:</strong>
                                <a href="${section.page_url}" target="_blank">${section.page_title || section.page_url}</a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-code"></i> HTML Tag:</strong>
                                ${section.tag || 'Unknown'}
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-layer-group"></i> Nesting Depth:</strong>
                                ${section.nesting_depth || 0} levels
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-sitemap"></i> Child Elements:</strong>
                                ${section.children_count || 0} elements
                            </div>
                            ${section.images_count > 0 ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-image"></i> Images:</strong>
                                ${section.images_count} images
                            </div>
                            ` : ''}
                            <div class="issue-detail">
                                <strong><i class="fas fa-exclamation-triangle"></i> Issues:</strong>
                                ${section.issues ? section.issues.join(', ') : 'Performance issues detected'}
                            </div>
                        </div>
                        ${section.html_snippet ? `
                        <div class="issue-code-preview">
                            <strong>HTML Code (Preview):</strong>
                            <pre><code>${section.html_snippet.length > 500 ? section.html_snippet.substring(0, 497) + '...' : section.html_snippet}</code></pre>
                        </div>
                        ` : ''}
                        <div class="issue-impact">
                            <strong>Impact:</strong>
                            <span class="impact-text">This HTML section has ${section.nesting_depth || 0} levels of nesting and ${section.children_count || 0} child elements, which slows down browser rendering. Simplifying the structure could improve page load time by 10-30%.</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (allSlowHtmlSections.length > 20) {
            html += `<div class="performance-more-items">... and ${allSlowHtmlSections.length - 20} more slow HTML sections</div>`;
        }
        
        html += `</div>`;
        slowHtmlSectionsContainer.innerHTML = html;
        
        // Store data for fix guide
        window.performanceSlowHtmlSections = allSlowHtmlSections;
    }
    
    // Display slow components with enhanced UI
    if (allSlowComponents.length === 0) {
        slowComponentsContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <p>No slow components detected. Your page components are optimized!</p>
            </div>
        `;
    } else {
        let html = `
            <div class="performance-issue-intro">
                <div class="issue-description">
                    <h4><i class="fas fa-info-circle"></i> About Slow Components</h4>
                    <p>Certain HTML components can slow down page rendering and interactivity:</p>
                    <ul>
                        <li>Large tables with many rows</li>
                        <li>Complex forms with many fields</li>
                        <li>Image galleries with many images</li>
                        <li>Widgets and iframes that load external content</li>
                    </ul>
                    <p><strong>Recommended:</strong> Optimize components by lazy loading, pagination, virtualization, or splitting into smaller parts.</p>
                </div>
            </div>
            <div class="performance-items-list">
        `;
        
        allSlowComponents.slice(0, 20).forEach((component, index) => {
            const isCritical = (component.rows_count && component.rows_count > 100) || (component.images_count && component.images_count > 50);
            const priority = isCritical ? 'Critical' : 'High';
            const priorityClass = isCritical ? 'priority-critical' : 'priority-high';
            
            html += `
                <div class="performance-issue-card ${priorityClass}">
                    <div class="issue-card-header">
                        <div class="issue-priority">
                            <span class="priority-badge ${priorityClass}">
                                <i class="fas fa-${isCritical ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                                ${priority} Priority
                            </span>
                            <span class="issue-size">${component.type || 'Component'}</span>
                        </div>
                        <button class="btn-fix-guide" onclick="showPerformanceFixGuide('slowComponent', ${index})">
                            <i class="fas fa-wrench"></i> How to Fix
                        </button>
                    </div>
                    <div class="issue-card-content">
                        <div class="issue-details-grid">
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-alt"></i> Page:</strong>
                                <a href="${component.page_url}" target="_blank">${component.page_title || component.page_url}</a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-map-marker-alt"></i> Location:</strong>
                                ${component.location || 'Unknown'}
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-exclamation-circle"></i> Issue:</strong>
                                ${component.issue || 'Performance issue detected'}
                            </div>
                            ${component.images_count !== undefined ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-image"></i> Images:</strong>
                                ${component.images_count} images
                            </div>
                            ` : ''}
                            ${component.rows_count !== undefined ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-table"></i> Table Rows:</strong>
                                ${component.rows_count} rows
                            </div>
                            ` : ''}
                            ${component.src ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-link"></i> Source:</strong>
                                <a href="${component.src}" target="_blank" title="${component.src}">
                                    ${component.src.length > 50 ? component.src.substring(0, 47) + '...' : component.src}
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        <div class="issue-impact">
                            <strong>Impact:</strong>
                            <span class="impact-text">This ${component.type || 'component'} is causing performance issues${component.rows_count ? ` with ${component.rows_count} rows` : ''}${component.images_count ? ` and ${component.images_count} images` : ''}. Optimizing this component could improve page responsiveness significantly.</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (allSlowComponents.length > 20) {
            html += `<div class="performance-more-items">... and ${allSlowComponents.length - 20} more slow components</div>`;
        }
        
        html += `</div>`;
        slowComponentsContainer.innerHTML = html;
        
        // Store data for fix guide
        window.performanceSlowComponents = allSlowComponents;
    }
    
    // Display render-blocking resources with enhanced UI
    if (allRenderBlocking.length === 0) {
        renderBlockingContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <p>No render-blocking resources detected. Your resources are optimized!</p>
            </div>
        `;
    } else {
        let html = `
            <div class="performance-issue-intro">
                <div class="issue-description">
                    <h4><i class="fas fa-info-circle"></i> About Render-Blocking Resources</h4>
                    <p>Render-blocking resources prevent the browser from displaying page content until they're loaded:</p>
                    <ul>
                        <li>JavaScript files in the <code>&lt;head&gt;</code> without async/defer</li>
                        <li>CSS stylesheets that block rendering</li>
                        <li>Large fonts that delay text rendering</li>
                        <li>Synchronous scripts that halt HTML parsing</li>
                    </ul>
                    <p><strong>Recommended:</strong> Use async/defer for scripts, inline critical CSS, and preload important resources to improve First Contentful Paint (FCP) by 1-3 seconds.</p>
                </div>
            </div>
            <div class="performance-items-list">
        `;
        
        allRenderBlocking.forEach((resource, index) => {
            const isCritical = resource.size_kb && resource.size_kb > 100;
            const priority = isCritical ? 'Critical' : 'High';
            const priorityClass = isCritical ? 'priority-critical' : 'priority-high';
            
            html += `
                <div class="performance-issue-card ${priorityClass}">
                    <div class="issue-card-header">
                        <div class="issue-priority">
                            <span class="priority-badge ${priorityClass}">
                                <i class="fas fa-${isCritical ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                                ${priority} Priority
                            </span>
                            <span class="issue-size">${resource.type || 'Resource'}</span>
                        </div>
                        <button class="btn-fix-guide" onclick="showPerformanceFixGuide('renderBlocking', ${index})">
                            <i class="fas fa-wrench"></i> How to Fix
                        </button>
                    </div>
                    <div class="issue-card-content">
                        <div class="issue-details-grid">
                            <div class="issue-detail">
                                <strong><i class="fas fa-file-alt"></i> Page:</strong>
                                <a href="${resource.page_url}" target="_blank">${resource.page_title || resource.page_url}</a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-link"></i> Resource URL:</strong>
                                <a href="${resource.url}" target="_blank" title="${resource.url}">
                                    ${resource.url.length > 60 ? resource.url.substring(0, 57) + '...' : resource.url}
                                </a>
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-hdd"></i> File Size:</strong>
                                ${resource.size_kb ? resource.size_kb.toFixed(2) + ' KB' : 'Unknown'}
                            </div>
                            <div class="issue-detail">
                                <strong><i class="fas fa-file"></i> Resource Type:</strong>
                                ${resource.type || 'Unknown'}
                            </div>
                            ${resource.has_async !== undefined ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-bolt"></i> Has Async:</strong>
                                <span class="${resource.has_async ? 'text-success' : 'text-danger'}">
                                    ${resource.has_async ? 'Yes ✓' : 'No ✗'}
                                </span>
                            </div>
                            ` : ''}
                            ${resource.has_defer !== undefined ? `
                            <div class="issue-detail">
                                <strong><i class="fas fa-clock"></i> Has Defer:</strong>
                                <span class="${resource.has_defer ? 'text-success' : 'text-danger'}">
                                    ${resource.has_defer ? 'Yes ✓' : 'No ✗'}
                                </span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="issue-impact">
                            <strong>Impact:</strong>
                            <span class="impact-text">This ${resource.type || 'resource'} is blocking page rendering. Adding async/defer attributes or optimizing loading could improve First Contentful Paint by 1-2 seconds and reduce perceived load time.</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        renderBlockingContainer.innerHTML = html;
        
        // Store data for fix guide
        window.performanceRenderBlocking = allRenderBlocking;
    }
    } catch (error) {
        console.error('Error in displayPerformanceAnalysis:', error);
        console.error('Error stack:', error.stack);
        // Show error message in containers
        const containers = [
            heavyImagesContainer,
            slowJsCssContainer,
            slowHtmlSectionsContainer,
            slowComponentsContainer,
            renderBlockingContainer
        ];
        containers.forEach(container => {
            if (container) {
                container.innerHTML = `<div class="error">Error loading performance data: ${error.message}. Please check console for details.</div>`;
            }
        });
    }
}

// Show performance fix guide modal
function showPerformanceFixGuide(issueType, issueIndex) {
    // Get the appropriate data based on issue type
    let issueData = {};
    if (issueType === 'heavyImage' && window.performanceHeavyImages) {
        issueData = window.performanceHeavyImages[issueIndex] || {};
    } else if (issueType === 'slowJsCss' && window.performanceSlowJsCss) {
        issueData = window.performanceSlowJsCss[issueIndex] || {};
    } else if (issueType === 'slowHtmlSection' && window.performanceSlowHtmlSections) {
        issueData = window.performanceSlowHtmlSections[issueIndex] || {};
    } else if (issueType === 'slowComponent' && window.performanceSlowComponents) {
        issueData = window.performanceSlowComponents[issueIndex] || {};
    } else if (issueType === 'renderBlocking' && window.performanceRenderBlocking) {
        issueData = window.performanceRenderBlocking[issueIndex] || {};
    }
    
    const fixGuide = generateFixGuide(issueType, issueData);
    
    if (!fixGuide) {
        alert('Fix guide not available for this issue type.');
        return;
    }
    
    // Remove existing modal if any
    const existingModal = document.getElementById('performanceFixGuideModal');
    if (existingModal) existingModal.remove();
    
    let stepsHTML = '';
    fixGuide.steps.forEach((step, index) => {
        stepsHTML += `
            <div class="fix-step">
                <div class="step-title">${step.title}</div>
                <div class="step-description">${step.description}</div>
                ${step.code ? `
                <div class="step-code">
                    <code>${step.code}</code>
                </div>
                ` : ''}
                ${step.tools && step.tools.length > 0 ? `
                <div class="step-tools">
                    <strong>Recommended Tools:</strong>
                    ${step.tools.map(tool => `<span>${tool}</span>`).join('')}
                </div>
                ` : ''}
                ${step.note ? `
                <div class="step-note">
                    <strong>Note:</strong> ${step.note}
                </div>
                ` : ''}
            </div>
        `;
    });
    
    const modalHTML = `
        <div class="modal fix-guide-modal" id="performanceFixGuideModal" style="display: block;">
            <div class="fix-guide-modal-content">
                <div class="fix-guide-header">
                    <h2><i class="fas fa-wrench"></i> ${fixGuide.title}</h2>
                    <span class="fix-guide-close" onclick="closePerformanceFixGuide()">&times;</span>
                </div>
                <div class="fix-guide-body">
                    <div class="fix-guide-description">
                        <strong>Priority:</strong> <span class="priority-badge priority-${fixGuide.priority.toLowerCase()}">${fixGuide.priority}</span>
                        ${fixGuide.estimatedSavings ? `<br><strong>Estimated Savings:</strong> ${fixGuide.estimatedSavings}` : ''}
                        <p style="margin-top: 12px; margin-bottom: 0;">${fixGuide.description}</p>
                    </div>
                    <div class="fix-guide-steps">
                        ${stepsHTML}
                    </div>
                    ${fixGuide.estimatedSavings ? `
                    <div class="estimated-savings">
                        <i class="fas fa-chart-line"></i> ${fixGuide.estimatedSavings}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Close on outside click
    document.getElementById('performanceFixGuideModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closePerformanceFixGuide();
        }
    });
}

// Close performance fix guide modal
function closePerformanceFixGuide() {
    const modal = document.getElementById('performanceFixGuideModal');
    if (modal) modal.remove();
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

// Display Page Power section
function displayPagePower(data) {
    const container = document.getElementById('pagePowerContainer');
    if (!container) return;
    
    const stats = data.page_power_stats || {};
    const pages = data.pages || [];
    const linkAnalysis = stats.link_analysis || {};
    
    if (!stats || !stats.top_pages || stats.top_pages.length === 0) {
        container.innerHTML = '<div class="info-message"><i class="fas fa-info-circle"></i><p>Page Power data not available. Run a new crawl to generate page power analysis.</p></div>';
        return;
    }
    
    // Get page classifications
    const pageClassifications = stats.page_classifications || {};
    const mainPagesCount = stats.main_pages_count || 0;
    const utilityPagesCount = stats.utility_pages_count || 0;
    
    // Sort all pages by page power and classify
    const allPagesWithPower = pages
        .filter(p => p.page_power !== undefined && p.page_power !== null)
        .map(p => {
            const linkData = linkAnalysis[p.url] || {};
            const pageType = pageClassifications[p.url] || 'main';
            return {
                url: p.url,
                title: p.title || 'No Title',
                power: p.page_power,
                word_count: p.word_count || 0,
                status_code: p.status_code,
                incoming_count: linkData.incoming_count || 0,
                outgoing_count: linkData.outgoing_count || 0,
                page_type: pageType
            };
        })
        .sort((a, b) => b.power - a.power);
    
    // Separate main and utility pages
    const pagesWithPower = allPagesWithPower.filter(p => p.page_type === 'main');
    const utilityPagesWithPower = allPagesWithPower.filter(p => p.page_type === 'utility');
    
    // Power distribution data
    const powerDist = stats.power_distribution || { high: 0, medium: 0, low: 0 };
    const totalDist = powerDist.high + powerDist.medium + powerDist.low;
    
    let html = `
        <div class="page-power-summary">
            <div class="power-stats-grid">
                <div class="power-stat-item">
                    <div class="stat-value">${stats.total_pages || 0}</div>
                    <div class="stat-label">Total Pages</div>
                </div>
                <div class="power-stat-item">
                    <div class="stat-value">${mainPagesCount}</div>
                    <div class="stat-label">Main Pages</div>
                </div>
                <div class="power-stat-item">
                    <div class="stat-value">${utilityPagesCount}</div>
                    <div class="stat-label">Utility Pages</div>
                </div>
                <div class="power-stat-item">
                    <div class="stat-value">${stats.highest_power || 0}</div>
                    <div class="stat-label">Highest Power</div>
                </div>
            </div>
        </div>
        
        <!-- Power Distribution Chart -->
        <div class="page-power-chart-section">
            <h3><i class="fas fa-chart-pie"></i> Power Distribution</h3>
            <div class="power-distribution-chart">
                <canvas id="powerDistributionChart" width="400" height="200"></canvas>
            </div>
        </div>
        
        <!-- Orphan Pages Section -->
        ${stats.orphan_pages && stats.orphan_pages.length > 0 ? `
        <div class="orphan-pages-section">
            <h3><i class="fas fa-unlink"></i> Orphan Pages (${stats.orphan_pages.length})</h3>
            <p class="section-description">Pages with no incoming internal links. These pages may be harder for search engines and users to discover.</p>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>Page Power</th>
                            <th>Word Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.orphan_pages.map(page => `
                            <tr>
                                <td>
                                    <div class="page-url-cell">
                                        <a href="${page.url}" target="_blank">${page.url}</a>
                                        ${page.title ? `<div class="page-title-small">${page.title}</div>` : ''}
                                    </div>
                                </td>
                                <td><span class="page-power-badge power-low">${page.power.toFixed(1)}</span></td>
                                <td>${(page.word_count || 0).toLocaleString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="showPageLinkAnalysis('${page.url}')">
                                        <i class="fas fa-link"></i> Link Analysis
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
        
        <!-- Hub Pages Section -->
        ${stats.hub_pages && stats.hub_pages.length > 0 ? `
        <div class="hub-pages-section">
            <h3><i class="fas fa-sitemap"></i> Hub Pages (Top 10)</h3>
            <p class="section-description">Pages with the most outgoing internal links. These pages distribute link equity across your site.</p>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>Outgoing Links</th>
                            <th>Page Power</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.hub_pages.map(page => `
                            <tr>
                                <td>
                                    <div class="page-url-cell">
                                        <a href="${page.url}" target="_blank">${page.url}</a>
                                        ${page.title ? `<div class="page-title-small">${page.title}</div>` : ''}
                                    </div>
                                </td>
                                <td><strong>${page.outgoing_links}</strong></td>
                                <td><span class="page-power-badge ${page.power >= 70 ? 'power-high' : page.power >= 40 ? 'power-medium' : 'power-low'}">${page.power.toFixed(1)}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="showPageLinkAnalysis('${page.url}')">
                                        <i class="fas fa-link"></i> Link Analysis
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
        
        <!-- Pages Ranked by Power -->
        <div class="page-power-table-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3><i class="fas fa-list"></i> Main Pages Ranked by Power</h3>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="showUtilityPages" onchange="toggleUtilityPages()" style="cursor: pointer;">
                    <span>Show Utility Pages (About, Privacy, Terms, etc.)</span>
                </label>
            </div>
            <p class="section-description" style="margin-bottom: 15px;">Main content pages only. Utility pages (About, Privacy Policy, Terms, etc.) are filtered out. Toggle above to include them.</p>
            <div class="table-container" id="mainPagesTable">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Page</th>
                            <th>Page Power</th>
                            <th>Incoming Links</th>
                            <th>Outgoing Links</th>
                            <th>Word Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    pagesWithPower.forEach((page, index) => {
        const powerClass = page.power >= 70 ? 'power-high' : 
                          page.power >= 40 ? 'power-medium' : 'power-low';
        
        html += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>
                    <div class="page-url-cell">
                        <a href="${page.url}" target="_blank">${page.url}</a>
                        ${page.title ? `<div class="page-title-small">${page.title}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="page-power-badge ${powerClass}">${page.power.toFixed(1)}</span>
                </td>
                <td><span class="badge badge-info">${page.incoming_count}</span></td>
                <td><span class="badge badge-info">${page.outgoing_count}</span></td>
                <td>${page.word_count.toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showPageLinkAnalysis('${page.url}')" title="View Link Analysis">
                        <i class="fas fa-link"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showPageDetailsByUrl('${page.url}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Utility Pages (Hidden by default) -->
        ${utilityPagesWithPower.length > 0 ? `
        <div class="page-power-table-container" id="utilityPagesSection" style="display: none; margin-top: 40px;">
            <h3><i class="fas fa-list"></i> Utility Pages Ranked by Power</h3>
            <p class="section-description" style="margin-bottom: 15px;">Pages like About, Privacy Policy, Terms of Service, etc.</p>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Page</th>
                            <th>Page Power</th>
                            <th>Incoming Links</th>
                            <th>Outgoing Links</th>
                            <th>Word Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${utilityPagesWithPower.map((page, index) => {
                            const powerClass = page.power >= 70 ? 'power-high' : 
                                              page.power >= 40 ? 'power-medium' : 'power-low';
                            return `
                                <tr>
                                    <td><strong>#${index + 1}</strong></td>
                                    <td>
                                        <div class="page-url-cell">
                                            <a href="${page.url}" target="_blank">${page.url}</a>
                                            ${page.title ? `<div class="page-title-small">${page.title}</div>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="page-power-badge ${powerClass}">${page.power.toFixed(1)}</span>
                                    </td>
                                    <td><span class="badge badge-info">${page.incoming_count}</span></td>
                                    <td><span class="badge badge-info">${page.outgoing_count}</span></td>
                                    <td>${page.word_count.toLocaleString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="showPageLinkAnalysis('${page.url}')" title="View Link Analysis">
                                            <i class="fas fa-link"></i>
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="showPageDetailsByUrl('${page.url}')" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
    `;
    
    container.innerHTML = html;
    
    // Render power distribution chart
    if (typeof Chart !== 'undefined' && totalDist > 0) {
        const ctx = document.getElementById('powerDistributionChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['High Power (≥70)', 'Medium Power (40-69)', 'Low Power (<40)'],
                    datasets: [{
                        data: [powerDist.high, powerDist.medium, powerDist.low],
                        backgroundColor: [
                            'rgba(17, 153, 142, 0.8)',
                            'rgba(245, 87, 108, 0.8)',
                            'rgba(79, 172, 254, 0.8)'
                        ],
                        borderColor: [
                            'rgba(17, 153, 142, 1)',
                            'rgba(245, 87, 108, 1)',
                            'rgba(79, 172, 254, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const percentage = ((value / totalDist) * 100).toFixed(1);
                                    return label + ': ' + value + ' pages (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

// Toggle utility pages visibility
function toggleUtilityPages() {
    const checkbox = document.getElementById('showUtilityPages');
    const utilitySection = document.getElementById('utilityPagesSection');
    if (checkbox && utilitySection) {
        utilitySection.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Show page link analysis modal
function showPageLinkAnalysis(url) {
    if (!reportData || !reportData.page_power_stats) return;
    
    const linkAnalysis = reportData.page_power_stats.link_analysis || {};
    const pageData = linkAnalysis[url];
    
    if (!pageData) {
        alert('Link analysis data not available for this page.');
        return;
    }
    
    const page = reportData.pages.find(p => p.url === url) || {};
    const power = page.page_power || 0;
    const powerClass = power >= 70 ? 'power-high' : power >= 40 ? 'power-medium' : 'power-low';
    
    // Truncate title if too long
    const displayTitle = (page.title || url).length > 60 
        ? (page.title || url).substring(0, 60) + '...' 
        : (page.title || url);
    
    let modalHtml = `
        <div class="modal" id="linkAnalysisModal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-link"></i> ${displayTitle}</h2>
                    <span class="close" onclick="closeLinkAnalysisModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="link-analysis-summary">
                        <div class="link-stat-card">
                            <div class="link-stat-value">${power.toFixed(1)}</div>
                            <div class="link-stat-label">Page Power</div>
                        </div>
                        <div class="link-stat-card">
                            <div class="link-stat-value">${pageData.incoming_count || 0}</div>
                            <div class="link-stat-label">Incoming</div>
                        </div>
                        <div class="link-stat-card">
                            <div class="link-stat-value">${pageData.outgoing_count || 0}</div>
                            <div class="link-stat-label">Outgoing</div>
                        </div>
                    </div>
                    
                    <div class="link-analysis-grid">
                        <div class="link-analysis-column">
                            <h3><i class="fas fa-arrow-down"></i> Incoming (${pageData.incoming_links.length})</h3>
                            <div class="link-list">
                                ${pageData.incoming_links.length > 0 ? 
                                    pageData.incoming_links.map(link => `
                                        <div class="link-item">
                                            <a href="${link.url}" target="_blank" title="${link.url}">${link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}</a>
                                            <div class="link-meta">
                                                <span class="page-title-small" title="${link.title}">${link.title.length > 40 ? link.title.substring(0, 40) + '...' : link.title}</span>
                                                <span class="page-power-badge ${link.power >= 70 ? 'power-high' : link.power >= 40 ? 'power-medium' : 'power-low'}">${link.power.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    `).join('') 
                                    : '<div class="link-item"><p style="margin:0; color: var(--text-muted); font-size: 0.75rem;">No incoming links</p></div>'
                                }
                            </div>
                        </div>
                        
                        <div class="link-analysis-column">
                            <h3><i class="fas fa-arrow-up"></i> Outgoing (${pageData.outgoing_links.length})</h3>
                            <div class="link-list">
                                ${pageData.outgoing_links.length > 0 ? 
                                    pageData.outgoing_links.map(link => `
                                        <div class="link-item">
                                            <a href="${link.url}" target="_blank" title="${link.url}">${link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}</a>
                                            <div class="link-meta">
                                                <span class="page-title-small" title="${link.title}">${link.title.length > 40 ? link.title.substring(0, 40) + '...' : link.title}</span>
                                                <span class="page-power-badge ${link.power >= 70 ? 'power-high' : link.power >= 40 ? 'power-medium' : 'power-low'}">${link.power.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    `).join('') 
                                    : '<div class="link-item"><p style="margin:0; color: var(--text-muted); font-size: 0.75rem;">No outgoing links</p></div>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    ${generateLinkRecommendations(pageData, power)}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeLinkAnalysisModal() {
    const modal = document.getElementById('linkAnalysisModal');
    if (modal) modal.remove();
}

function generateLinkRecommendations(pageData, power) {
    const recommendations = [];
    
    if (pageData.incoming_count === 0) {
        recommendations.push({
            type: 'warning',
            message: 'This page has no incoming links. Consider adding internal links from high-power pages to improve discoverability.'
        });
    }
    
    if (pageData.incoming_count < 3 && power < 50) {
        recommendations.push({
            type: 'info',
            message: 'Low incoming link count may be limiting this page\'s power. Consider getting links from pages with higher power.'
        });
    }
    
    if (pageData.outgoing_count === 0) {
        recommendations.push({
            type: 'info',
            message: 'This page doesn\'t link to other pages. Consider adding relevant internal links to help distribute link equity.'
        });
    }
    
    if (pageData.outgoing_count > 50) {
        recommendations.push({
            type: 'warning',
            message: 'This page has many outgoing links. Consider reducing the number to pass more link equity to fewer pages.'
        });
    }
    
    if (power < 30 && pageData.incoming_count > 0) {
        recommendations.push({
            type: 'info',
            message: 'Low power despite having incoming links. The linking pages may have low power themselves.'
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'success',
            message: 'This page has a good internal linking structure!'
        });
    }
    
    return `
        <div class="link-recommendations">
            <h3><i class="fas fa-lightbulb"></i> Recommendations</h3>
            ${recommendations.map(rec => `
                <div class="recommendation-item recommendation-${rec.type}">
                    <i class="fas fa-${rec.type === 'warning' ? 'exclamation-triangle' : rec.type === 'info' ? 'info-circle' : 'check-circle'}"></i>
                    <p>${rec.message}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper function to show page details by URL
function showPageDetailsByUrl(url) {
    if (!reportData || !reportData.pages) return;
    const page = reportData.pages.find(p => p.url === url);
    if (page) {
        showPageDetails(page);
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
            <div class="table-container" style="font-size: 0.5rem;">
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

// Display Skipped Pages section (similar to Siteliner)
function displaySkippedPages(data) {
    const container = document.getElementById('skippedPagesContainer');
    if (!container) return;
    
    const skippedPages = data.skipped_pages || [];
    
    if (skippedPages.length === 0) {
        container.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i><p>No pages were skipped during crawling.</p></div>';
        return;
    }
    
    // Get page power data if available
    const pagePowers = data.page_power_stats?.page_powers || {};
    
    // Sort by skip reason, then by URL
    const sortedSkipped = [...skippedPages].sort((a, b) => {
        if (a.skip_reason !== b.skip_reason) {
            return a.skip_reason.localeCompare(b.skip_reason);
        }
        return a.url.localeCompare(b.url);
    });
    
    // Get unique skip reasons for filter
    const skipReasons = [...new Set(skippedPages.map(sp => sp.skip_reason))].sort();
    
    let html = `
        <div class="skipped-pages-header">
            <p class="subtitle">To see complete results for a specific page, click on a row in the table below:</p>
            <div class="skipped-pages-controls">
                <div class="filter-group">
                    <label for="skippedPagesFilter">Filter results by:</label>
                    <select id="skippedPagesFilter" class="filter-select">
                        <option value="all">Show All</option>
                        ${skipReasons.map(reason => `<option value="${reason.replace(/"/g, '&quot;')}">${reason}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <table id="skippedPagesTable" class="data-table">
                <thead>
                    <tr>
                        <th>URL</th>
                        <th class="sortable" data-sort="reason">Skip Reason <i class="fas fa-sort"></i></th>
                        <th class="sortable" data-sort="power">Page Power</th>
                        <th class="sortable" data-sort="links">Links In</th>
                    </tr>
                </thead>
                <tbody id="skippedPagesTableBody">
                </tbody>
            </table>
        </div>
        
        <div class="pagination-container" id="skippedPagesPagination">
        </div>
    `;
    
    container.innerHTML = html;
    
    // Store data globally for filtering and pagination
    window.skippedPagesData = sortedSkipped;
    window.currentSkippedPage = 1;
    window.itemsPerPage = 12;
    
    // Render table
    renderSkippedPagesTable();
    
    // Add filter event listener
    const filter = document.getElementById('skippedPagesFilter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            window.currentSkippedPage = 1;
            renderSkippedPagesTable();
        });
    }
    
    // Add sort event listeners
    document.querySelectorAll('#skippedPagesTable .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.dataset.sort;
            const currentSort = window.skippedPagesSort || { field: null, direction: 'asc' };
            
            if (currentSort.field === sortBy) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = sortBy;
                currentSort.direction = 'asc';
            }
            
            window.skippedPagesSort = currentSort;
            
            // Update sort indicators
            document.querySelectorAll('#skippedPagesTable .sortable i').forEach(icon => {
                icon.className = 'fas fa-sort';
            });
            const icon = header.querySelector('i');
            if (icon) {
                icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
            
            // Sort data
            sortSkippedPages();
            renderSkippedPagesTable();
        });
    });
    
    function sortSkippedPages() {
        const sort = window.skippedPagesSort || { field: null, direction: 'asc' };
        if (!sort.field) return;
        
        window.skippedPagesData.sort((a, b) => {
            let aVal, bVal;
            
            switch(sort.field) {
                case 'reason':
                    aVal = a.skip_reason || '';
                    bVal = b.skip_reason || '';
                    break;
                case 'power':
                    aVal = pagePowers[a.url]?.power || 0;
                    bVal = pagePowers[b.url]?.power || 0;
                    break;
                case 'links':
                    aVal = a.links_in || 0;
                    bVal = b.links_in || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    function renderSkippedPagesTable() {
        const tbody = document.getElementById('skippedPagesTableBody');
        const pagination = document.getElementById('skippedPagesPagination');
        if (!tbody) return;
        
        // Get filter value
        const filterValue = document.getElementById('skippedPagesFilter')?.value || 'all';
        
        // Filter data
        let filteredData = window.skippedPagesData;
        if (filterValue !== 'all') {
            filteredData = window.skippedPagesData.filter(sp => sp.skip_reason === filterValue);
        }
        
        // Pagination
        const totalPages = Math.ceil(filteredData.length / window.itemsPerPage);
        const startIndex = (window.currentSkippedPage - 1) * window.itemsPerPage;
        const endIndex = startIndex + window.itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        // Render table rows
        tbody.innerHTML = pageData.map((skipped, index) => {
            const pagePower = pagePowers[skipped.url]?.power || 0;
            const linksIn = skipped.links_in || 0;
            const fullIndex = startIndex + index;
            
            // Get reason icon
            let reasonIcon = 'fas fa-ban';
            if (skipped.skip_reason.includes('noindex')) {
                reasonIcon = 'fas fa-robot';
            } else if (skipped.skip_reason.includes('404')) {
                reasonIcon = 'fas fa-exclamation-triangle';
            } else if (skipped.skip_reason.includes('Redirect')) {
                reasonIcon = 'fas fa-arrow-right';
            } else if (skipped.skip_reason.includes('character set')) {
                reasonIcon = 'fas fa-language';
            }
            
            return `
                <tr class="clickable-row" onclick="showSkippedPageDetails('${skipped.url.replace(/'/g, "\\'")}')">
                    <td class="url-cell">
                        <a href="${skipped.url}" target="_blank" onclick="event.stopPropagation();">
                            ${skipped.url}
                        </a>
                    </td>
                    <td>
                        <i class="${reasonIcon}"></i> ${skipped.skip_reason}
                    </td>
                    <td>${pagePower.toFixed(1)}</td>
                    <td>${linksIn}</td>
                </tr>
            `;
        }).join('');
        
        // Render pagination
        if (pagination) {
            if (totalPages <= 1) {
                pagination.innerHTML = '';
            } else {
                let paginationHTML = '<div class="pagination">';
                
                // Previous button
                if (window.currentSkippedPage > 1) {
                    paginationHTML += `<button class="pagination-btn" onclick="changeSkippedPage(${window.currentSkippedPage - 1})">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>`;
                }
                
                // Page numbers
                const maxPagesToShow = 5;
                let startPage = Math.max(1, window.currentSkippedPage - Math.floor(maxPagesToShow / 2));
                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                
                if (endPage - startPage < maxPagesToShow - 1) {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }
                
                if (startPage > 1) {
                    paginationHTML += `<button class="pagination-btn" onclick="changeSkippedPage(1)">1</button>`;
                    if (startPage > 2) {
                        paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                    }
                }
                
                for (let i = startPage; i <= endPage; i++) {
                    paginationHTML += `<button class="pagination-btn ${i === window.currentSkippedPage ? 'active' : ''}" 
                        onclick="changeSkippedPage(${i})">${i}</button>`;
                }
                
                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                    }
                    paginationHTML += `<button class="pagination-btn" onclick="changeSkippedPage(${totalPages})">${totalPages}</button>`;
                }
                
                // Next button
                if (window.currentSkippedPage < totalPages) {
                    paginationHTML += `<button class="pagination-btn" onclick="changeSkippedPage(${window.currentSkippedPage + 1})">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>`;
                }
                
                paginationHTML += '</div>';
                paginationHTML += `<div class="pagination-info">Showing ${startIndex + 1}–${Math.min(endIndex, filteredData.length)} of ${filteredData.length} results</div>`;
                paginationHTML += `<div class="pagination-jump">
                    <label>Jump to result:</label>
                    <input type="number" id="skippedPagesJumpInput" min="1" max="${totalPages}" value="${window.currentSkippedPage}">
                    <button class="pagination-btn" onclick="jumpToSkippedPage()">Go</button>
                </div>`;
                
                pagination.innerHTML = paginationHTML;
            }
        }
    }
    
    // Make functions globally available
    window.changeSkippedPage = function(page) {
        window.currentSkippedPage = page;
        renderSkippedPagesTable();
        // Scroll to top of table
        document.getElementById('skippedPagesTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    
    window.jumpToSkippedPage = function() {
        const input = document.getElementById('skippedPagesJumpInput');
        if (input) {
            const page = parseInt(input.value);
            const filterValue = document.getElementById('skippedPagesFilter')?.value || 'all';
            let filteredData = window.skippedPagesData;
            if (filterValue !== 'all') {
                filteredData = window.skippedPagesData.filter(sp => sp.skip_reason === filterValue);
            }
            const totalPages = Math.ceil(filteredData.length / window.itemsPerPage);
            if (page >= 1 && page <= totalPages) {
                window.changeSkippedPage(page);
            }
        }
    };
    
    window.showSkippedPageDetails = function(url) {
        // Find the skipped page data
        const skippedPage = window.skippedPagesData.find(sp => sp.url === url);
        if (!skippedPage) return;
        
        // Show in page modal or create a simple alert
        const modal = document.getElementById('pageModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = 'Skipped Page Details';
            modalBody.innerHTML = `
                <div class="page-details">
                    <h3>URL</h3>
                    <p><a href="${skippedPage.url}" target="_blank">${skippedPage.url}</a></p>
                    
                    <h3>Skip Reason</h3>
                    <p>${skippedPage.skip_reason}</p>
                    
                    <h3>Status Code</h3>
                    <p>${skippedPage.status_code || 'N/A'}</p>
                    
                    <h3>Links In</h3>
                    <p>${skippedPage.links_in || 0} internal link(s) point to this page</p>
                    
                    <h3>Page Power</h3>
                    <p>${(pagePowers[skippedPage.url]?.power || 0).toFixed(2)}</p>
                </div>
            `;
            modal.style.display = 'block';
        } else {
            alert(`Skipped Page: ${skippedPage.url}\nReason: ${skippedPage.skip_reason}`);
        }
    };
}
