// Main JavaScript for the crawler interface

let socket;
let currentJobId = null;

// Show crawl history
async function showHistory() {
    const historyCard = document.getElementById('historyCard');
    const historyContainer = document.getElementById('historyContainer');
    
    if (!historyCard || !historyContainer) return;
    
    historyCard.style.display = 'block';
    historyContainer.innerHTML = '<p class="loading">Loading crawl history...</p>';
    
    try {
        const response = await fetch('/api/list-jobs');
        const data = await response.json();
        
        if (!data.jobs || data.jobs.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No crawl history found. Start your first crawl!</p>';
            return;
        }
        
        let html = '<div class="history-list">';
        data.jobs.forEach(job => {
            const date = new Date(job.started_at || job.completed_at || Date.now());
            const dateStr = date.toLocaleString();
            const statusBadge = job.status === 'completed' 
                ? '<span class="badge badge-success">Completed</span>'
                : job.status === 'crawling'
                ? '<span class="badge badge-info">Crawling</span>'
                : '<span class="badge badge-warning">' + job.status + '</span>';
            
            html += `
                <div class="history-item" onclick="viewHistoryJob('${job.job_id}')">
                    <div class="history-item-header">
                        <div class="history-item-title">
                            <strong>${job.url || 'Unknown URL'}</strong>
                            ${statusBadge}
                        </div>
                        <div class="history-item-meta">
                            <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                        </div>
                    </div>
                    <div class="history-item-stats">
                        <span><i class="fas fa-file-alt"></i> ${job.pages_crawled || 0} pages</span>
                        <span><i class="fas fa-link"></i> ${job.links_found || 0} links</span>
                        ${job.site_seo_score !== null ? `<span><i class="fas fa-star"></i> SEO: ${job.site_seo_score}/100</span>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        historyContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
        historyContainer.innerHTML = '<p class="error">Error loading crawl history. Please try again.</p>';
    }
}

// Hide crawl history
function hideHistory() {
    const historyCard = document.getElementById('historyCard');
    if (historyCard) {
        historyCard.style.display = 'none';
    }
}

// View a historical job
function viewHistoryJob(jobId) {
    window.location.href = `/results/${jobId}`;
}

// Initialize Socket.IO connection
document.addEventListener('DOMContentLoaded', function() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
    });
    
    socket.on('progress', function(data) {
        updateProgress(data);
    });
    
    // Form submission
    const form = document.getElementById('crawlForm');
    form.addEventListener('submit', handleFormSubmit);
});

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const url = document.getElementById('url').value;
    const maxDepth = document.getElementById('max_depth').value;
    const startBtn = document.getElementById('startBtn');
    
    // Disable button
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    
    // Auto-fix URL (add https:// if missing)
    let fixedUrl = url.trim();
    if (!fixedUrl.match(/^https?:\/\//i)) {
        fixedUrl = 'https://' + fixedUrl;
    }
    
    try {
        const response = await fetch('/api/start-crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: fixedUrl,
                max_depth: parseInt(maxDepth),
                output_dir: 'output', // Fixed output directory
                clear_cache: document.getElementById('clear_cache').checked
            })
        });
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            throw new Error(`Server returned non-JSON response. Status: ${response.status}. Please check server logs.`);
        }
        
        const data = await response.json();
        
        if (response.ok && data.job_id) {
            currentJobId = data.job_id;
            console.log('Crawl started with job_id:', data.job_id);
            showProgressCard();
            
            // Immediately check status once, then start polling
            // This helps catch any immediate issues
            setTimeout(async () => {
                try {
                    const statusResponse = await fetch(`/api/crawl-status/${data.job_id}`);
                    const statusData = await statusResponse.json();
                    
                    if (statusData.status === 'not_found' || statusData.error) {
                        showError(statusData.message || 'Job was not found. Please try again.');
                        return;
                    }
                    
                    // If job exists, start polling
                    startPolling(data.job_id);
                } catch (error) {
                    console.error('Error checking initial status:', error);
                    // Still try to start polling
                    startPolling(data.job_id);
                }
            }, 1000); // Wait 1 second for job to be fully initialized
        } else {
            alert('Error: ' + data.error);
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Crawling';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error starting crawl: ' + error.message);
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Crawling';
    }
}

// Show progress card
function showProgressCard() {
    document.getElementById('progressCard').style.display = 'block';
    document.getElementById('resultsCard').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    const progressMessageText = document.getElementById('progressMessageText');
    const loadingIcon = document.getElementById('loadingIcon');
    if (progressMessageText) progressMessageText.textContent = 'Initializing...';
    if (loadingIcon) loadingIcon.style.display = 'inline-block';
}

// Update progress
function updateProgress(data) {
    if (data.job_id !== currentJobId) return;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressMessageText = document.getElementById('progressMessageText');
    const loadingIcon = document.getElementById('loadingIcon');
    const stats = document.getElementById('stats');
    const errorContainer = document.getElementById('errorContainer');
    
    // Update progress bar with smooth animation
    const progress = data.progress || 0;
    progressFill.style.width = progress + '%';
    progressText.textContent = progress + '%';
    
    // Update message
    if (data.message) {
        progressMessageText.textContent = data.message;
        
        // Show/hide loading icon based on status
        if (data.status === 'completed' || data.status === 'error') {
            if (loadingIcon) loadingIcon.style.display = 'none';
        } else {
            if (loadingIcon) loadingIcon.style.display = 'inline-block';
        }
    }
    
    // Update stats
    if (data.pages_crawled !== undefined || data.links_found !== undefined) {
        stats.style.display = 'flex';
        if (data.pages_crawled !== undefined) {
            document.getElementById('pagesCount').textContent = data.pages_crawled;
        }
        if (data.links_found !== undefined) {
            document.getElementById('linksCount').textContent = data.links_found;
        }
        // Show internal/external links if available
        if (data.internal_links !== undefined) {
            const internalItem = document.getElementById('internalLinksItem');
            const internalCount = document.getElementById('internalLinksCount');
            if (internalItem && internalCount) {
                internalItem.style.display = 'flex';
                internalCount.textContent = data.internal_links;
            }
        }
        if (data.external_links !== undefined) {
            const externalItem = document.getElementById('externalLinksItem');
            const externalCount = document.getElementById('externalLinksCount');
            if (externalItem && externalCount) {
                externalItem.style.display = 'flex';
                externalCount.textContent = data.external_links;
            }
        }
    }
    
    // Update current page info
    if (data.current_page) {
        const currentPageInfo = document.getElementById('currentPageInfo');
        const currentPageText = document.getElementById('currentPageText');
        if (currentPageInfo && currentPageText) {
            currentPageInfo.style.display = 'block';
            const pageDisplay = data.current_page.length > 60 
                ? data.current_page.substring(0, 60) + '...' 
                : data.current_page;
            currentPageText.textContent = `Current: ${pageDisplay}`;
        }
    }
    
    // Handle errors
    if (data.status === 'error') {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = '<strong>Error:</strong> ' + data.message;
        if (loadingIcon) loadingIcon.style.display = 'none';
    } else {
        errorContainer.style.display = 'none';
    }
    
    // Handle completion
    if (data.status === 'completed') {
        if (loadingIcon) loadingIcon.style.display = 'none';
        
        // Reset button state
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Crawling';
        }
        
        setTimeout(() => {
            showResultsCard(data.job_id);
        }, 1000);
    }
    
    // Handle errors - also reset button
    if (data.status === 'error') {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Crawling';
        }
    }
}

// Show results card
function showResultsCard(jobId) {
    document.getElementById('progressCard').style.display = 'none';
    document.getElementById('resultsCard').style.display = 'block';
    
    // Set up download buttons
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
    
    // Set up view results button
    document.getElementById('viewResultsBtn').href = `/results/${jobId}`;
}

// Poll for status updates
function startPolling(jobId) {
    let pollCount = 0;
    const maxPolls = 300; // Stop after 10 minutes (300 * 2 seconds)
    
    const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
            const response = await fetch(`/api/crawl-status/${jobId}`);
            
            if (!response.ok && response.status === 404) {
                // Job not found - stop polling and show error
                clearInterval(pollInterval);
                showError('Crawl job not found. Please try starting a new crawl.');
                return;
            }
            
            const data = await response.json();
            
            // Handle job not found status
            if (data.status === 'not_found' || data.error) {
                clearInterval(pollInterval);
                showError(data.message || 'Crawl job not found. Please try starting a new crawl.');
                return;
            }
            
            // Update progress if available
            if (data.progress !== undefined) {
                updateProgress(data);
            }
            
            // Stop polling if crawl is done
            if (data.status === 'completed' || data.status === 'error') {
                clearInterval(pollInterval);
                if (data.status === 'completed') {
                    showResultsCard(jobId);
                } else if (data.status === 'error') {
                    showError(data.message || 'Crawl failed. Please try again.');
                }
            }
            
            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                showError('Crawl is taking longer than expected. Please check the results page or try again.');
            }
        } catch (error) {
            console.error('Error polling status:', error);
            // Don't stop polling on network errors, but stop after too many failures
            if (pollCount >= 10) {
                clearInterval(pollInterval);
                showError('Unable to check crawl status. Please refresh the page.');
            }
        }
    }, 2000); // Poll every 2 seconds
}

// Show error message
function showError(message) {
    const progressCard = document.getElementById('progressCard');
    const errorContainer = document.getElementById('errorContainer');
    
    if (errorContainer) {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `<strong>Error:</strong> ${message}`;
    }
    
    // Update progress message
    const progressMessageText = document.getElementById('progressMessageText');
    const loadingIcon = document.getElementById('loadingIcon');
    if (progressMessageText) {
        progressMessageText.textContent = message;
        progressMessageText.style.color = '#dc3545';
    }
    if (loadingIcon) loadingIcon.style.display = 'none';
    
    // Hide progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = 'Error';
    }
    
    // Reset button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Crawling';
    }
}

