// Main JavaScript for the crawler interface

let socket;
let currentJobId = null;

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for keyword search form
    const keywordSearchForm = document.getElementById('keywordSearchForm');
    if (keywordSearchForm) {
        keywordSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            event.stopPropagation();
            searchKeyword(event);
            return false;
        });
    }
    
    // Also add click handler to button as backup
    const keywordSearchBtn = document.getElementById('keywordSearchBtn');
    if (keywordSearchBtn) {
        keywordSearchBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            searchKeyword(event);
            return false;
        });
    }
});

// Show crawl history

async function showHistory() {
    const historyCard = document.getElementById('historyCard');
    const historyContainer = document.getElementById('historyContainer');
    const mainContent = document.getElementById('mainContent');
    const competitorCard = document.getElementById('competitorCard');
    const keywordCard = document.getElementById('keywordResearchCard');
    const startNewCrawlCard = document.getElementById('startNewCrawlCard');
    const progressCard = document.getElementById('progressCard');
    const resultsCard = document.getElementById('resultsCard');
    const progressCompletionSection = document.getElementById('progressCompletionSection');
    
    // Hide other sections
    if (competitorCard) competitorCard.style.display = 'none';
    if (keywordCard) keywordCard.style.display = 'none';
    if (startNewCrawlCard) startNewCrawlCard.style.display = 'none';
    if (progressCard) progressCard.style.display = 'none';
    if (resultsCard) resultsCard.style.display = 'none';
    if (progressCompletionSection) progressCompletionSection.style.display = 'none';
    
    // Show main content and history
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    if (!historyCard || !historyContainer) return;
    
    historyCard.style.display = 'block';
    historyContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading crawl history...</p></div>';
    
    // Update active nav item
    updateActiveNavItem('nav-history');
    
    try {
        const response = await fetch('/api/list-jobs');
        const data = await response.json();
        
        if (!data.jobs || data.jobs.length === 0) {
            historyContainer.innerHTML = `
                <div class="history-empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3>No Crawl History</h3>
                    <p>You haven't run any crawls yet. Start your first crawl to see results here!</p>
                    <button class="btn btn-primary" onclick="showMainContentNav()">
                        <i class="fas fa-play"></i> Start Your First Crawl
                    </button>
                </div>
            `;
            return;
        }
        
        // Store jobs for filtering/sorting
        window.historyJobs = data.jobs;
        
        renderHistoryList(data.jobs);
        
        // Add event listeners for search and sort
        const searchInput = document.getElementById('historySearch');
        const sortSelect = document.getElementById('historySort');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterAndSortHistory(e.target.value, sortSelect.value);
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                filterAndSortHistory(searchInput ? searchInput.value : '', e.target.value);
            });
        }
    } catch (error) {
        console.error('Error loading history:', error);
        historyContainer.innerHTML = '<p class="error-message">Error loading history. Please try again.</p>';
    }
}

function renderHistoryList(jobs) {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    if (!jobs || jobs.length === 0) {
        historyContainer.innerHTML = `
            <div class="history-empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>No Crawl History</h3>
                <p>You haven't run any crawls yet. Start your first crawl to see results here!</p>
                <button class="btn btn-primary" onclick="showMainContentNav()">
                    <i class="fas fa-play"></i> Start Your First Crawl
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="history-list">';
    jobs.forEach((job) => {
        const date = new Date(job.started_at || job.completed_at || Date.now());
        const dateStr = date.toLocaleString();
        const timeAgo = getTimeAgo(date);
        
        // Clean and truncate URL for display
        let displayUrl = job.url || 'Unknown URL';
        let cleanUrl = displayUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (cleanUrl.length > 50) {
            cleanUrl = cleanUrl.substring(0, 47) + '...';
        }
        
        let statusBadge = '';
        if (job.status === 'completed') {
            statusBadge = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Completed</span>';
        } else if (job.status === 'crawling') {
            statusBadge = '<span class="badge badge-info"><i class="fas fa-spinner fa-spin"></i> Crawling</span>';
        } else {
            statusBadge = `<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> ${job.status}</span>`;
        }
        
        html += `
            <div class="history-item" data-url="${(job.url || '').toLowerCase()}" data-pages="${job.pages_crawled || 0}" data-links="${job.links_found || 0}" data-date="${date.getTime()}">
                <div class="history-url-icon">
                    <i class="fas fa-globe"></i>
                </div>
                <div class="history-url-text" title="${job.url || 'Unknown URL'}">${cleanUrl}</div>
                <div class="history-item-meta">
                    <i class="fas fa-clock"></i>
                    <span>${timeAgo}</span>
                    ${statusBadge}
                </div>
                <div class="history-item-stats-compact">
                    <div class="stat-badge" title="Pages crawled">
                        <i class="fas fa-file-alt"></i>
                        <span>${job.pages_crawled || 0}</span>
                    </div>
                    <div class="stat-badge" title="Links found">
                        <i class="fas fa-link"></i>
                        <span>${job.links_found || 0}</span>
                    </div>
                    ${job.site_seo_score !== null && job.site_seo_score !== undefined ? `<div class="stat-badge seo-badge" title="SEO Score"><i class="fas fa-star"></i><span>${job.site_seo_score}</span></div>` : ''}
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewHistoryJob('${job.job_id}')">
                        <i class="fas fa-eye"></i> View Results
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    historyContainer.innerHTML = html;
}

function filterAndSortHistory(searchTerm, sortBy) {
    if (!window.historyJobs) return;
    
    let filtered = [...window.historyJobs];
    
    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(job => 
            (job.url || '').toLowerCase().includes(term)
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.started_at || a.completed_at || 0).getTime();
        const dateB = new Date(b.started_at || b.completed_at || 0).getTime();
        
        switch(sortBy) {
            case 'newest':
                return dateB - dateA;
            case 'oldest':
                return dateA - dateB;
            case 'pages':
                return (b.pages_crawled || 0) - (a.pages_crawled || 0);
            case 'links':
                return (b.links_found || 0) - (a.links_found || 0);
            default:
                return dateB - dateA;
        }
    });
    
    renderHistoryList(filtered);
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

// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (hours > 0) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (minutes > 0) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else {
        return 'Just now';
    }
}

// Show competitor analyzer
function showCompetitorAnalyzer() {
    const competitorCard = document.getElementById('competitorCard');
    const mainContent = document.getElementById('mainContent');
    const keywordCard = document.getElementById('keywordResearchCard');
    const historyCard = document.getElementById('historyCard');
    const loginCard = document.getElementById('loginCard');
    const progressCard = document.getElementById('progressCard');
    const resultsCard = document.getElementById('resultsCard');
    const progressCompletionSection = document.getElementById('progressCompletionSection');
    
    // Hide other sections
    if (mainContent) mainContent.style.display = 'none';
    if (keywordCard) keywordCard.style.display = 'none';
    if (historyCard) historyCard.style.display = 'none';
    if (loginCard) loginCard.style.display = 'none';
    if (progressCard) progressCard.style.display = 'none';
    if (resultsCard) resultsCard.style.display = 'none';
    if (progressCompletionSection) progressCompletionSection.style.display = 'none';
    
    // Show competitor analyzer
    if (competitorCard) {
        competitorCard.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.error('competitorCard element not found!');
        alert('Competitor Analyzer section not found. Please refresh the page.');
    }
    
    // Update active nav item
    updateActiveNavItem('nav-competitor');
}

// Hide competitor analyzer
function hideCompetitorAnalyzer() {
    const competitorCard = document.getElementById('competitorCard');
    const mainContent = document.getElementById('mainContent');
    
    // Hide competitor analyzer
    if (competitorCard) {
        competitorCard.style.display = 'none';
    }
    
    // Show main content
    if (mainContent) {
        mainContent.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Show keyword research
function showKeywordResearch() {
    const keywordCard = document.getElementById('keywordResearchCard');
    const mainContent = document.getElementById('mainContent');
    const competitorCard = document.getElementById('competitorCard');
    const historyCard = document.getElementById('historyCard');
    const loginCard = document.getElementById('loginCard');
    const progressCard = document.getElementById('progressCard');
    const resultsCard = document.getElementById('resultsCard');
    const progressCompletionSection = document.getElementById('progressCompletionSection');
    
    // Hide other sections
    if (mainContent) mainContent.style.display = 'none';
    if (competitorCard) competitorCard.style.display = 'none';
    if (historyCard) historyCard.style.display = 'none';
    if (loginCard) loginCard.style.display = 'none';
    if (progressCard) progressCard.style.display = 'none';
    if (resultsCard) resultsCard.style.display = 'none';
    if (progressCompletionSection) progressCompletionSection.style.display = 'none';
    
    // Show keyword research
    if (keywordCard) {
        keywordCard.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.error('keywordResearchCard element not found!');
        alert('Keyword Research section not found. Please refresh the page.');
    }
    
    // Update active nav item
    updateActiveNavItem('nav-keyword');
}

// Switch between Keyword Research tabs
function switchKeywordTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.keyword-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hide all tab contents
    document.querySelectorAll('.keyword-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    const selectedContent = document.getElementById(`keyword-${tabName}-tab`);
    
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    if (selectedContent) {
        selectedContent.classList.add('active');
        // Smooth scroll to top of tab content
        setTimeout(() => {
            selectedContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Show main content (Start New Crawl) - Navigation function
function showMainContentNav() {
    const mainContent = document.getElementById('mainContent');
    const competitorCard = document.getElementById('competitorCard');
    const keywordCard = document.getElementById('keywordResearchCard');
    const historyCard = document.getElementById('historyCard');
    const startNewCrawlCard = document.getElementById('startNewCrawlCard');
    const progressCard = document.getElementById('progressCard');
    const resultsCard = document.getElementById('resultsCard');
    const progressCompletionSection = document.getElementById('progressCompletionSection');
    
    // Hide other sections
    if (competitorCard) competitorCard.style.display = 'none';
    if (keywordCard) keywordCard.style.display = 'none';
    if (historyCard) historyCard.style.display = 'none';
    if (progressCard) progressCard.style.display = 'none';
    if (resultsCard) resultsCard.style.display = 'none';
    if (progressCompletionSection) progressCompletionSection.style.display = 'none';
    
    // Show main content and Start New Crawl card
    if (mainContent) {
        mainContent.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (startNewCrawlCard) startNewCrawlCard.style.display = 'block';
    
    // Update active nav item
    updateActiveNavItem('nav-start-crawl');
}

// Hide keyword research
function hideKeywordResearch() {
    const keywordCard = document.getElementById('keywordResearchCard');
    const mainContent = document.getElementById('mainContent');
    
    // Hide keyword research
    if (keywordCard) {
        keywordCard.style.display = 'none';
    }
    
    // Show main content
    if (mainContent) {
        mainContent.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Update active nav item
    updateActiveNavItem('nav-start-crawl');
}

// Update active navigation item
function updateActiveNavItem(activeId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.getElementById(activeId);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Set analysis preset configurations
function setAnalysisPreset(preset) {
    const perfAnalysis = document.getElementById('enable_performance_analysis');
    const htmlContent = document.getElementById('store_html_content');
    const similarity = document.getElementById('enable_similarity_during_crawl');
    const maxComparisons = document.getElementById('max_similarity_comparisons');
    const maxComparisonsSlider = document.getElementById('max_similarity_comparisons_slider');
    const crawlSpeed = document.getElementById('crawl_speed');
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected preset
    const selectedBtn = document.querySelector(`[data-preset="${preset}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    if (preset === 'full') {
        // Full Deep Analysis - Everything enabled, maximum comparisons, most aggressive
        if (perfAnalysis) perfAnalysis.checked = true;
        if (htmlContent) htmlContent.checked = true;
        if (similarity) similarity.checked = true;
        if (maxComparisons) maxComparisons.value = 200;
        if (maxComparisonsSlider) maxComparisonsSlider.value = 200;
        if (crawlSpeed) crawlSpeed.value = 'full';
    } else if (preset === 'standard') {
        // Standard Analysis - Balanced settings
        if (perfAnalysis) perfAnalysis.checked = true;
        if (htmlContent) htmlContent.checked = true;
        if (similarity) similarity.checked = true;
        if (maxComparisons) maxComparisons.value = 100;
        if (maxComparisonsSlider) maxComparisonsSlider.value = 100;
        if (crawlSpeed) crawlSpeed.value = 'balanced';
    } else if (preset === 'fast') {
        // Fast Analysis - Minimal analysis for speed
        if (perfAnalysis) perfAnalysis.checked = false;
        if (htmlContent) htmlContent.checked = true; // Keep for schema analysis
        if (similarity) similarity.checked = true;
        if (maxComparisons) maxComparisons.value = 50;
        if (maxComparisonsSlider) maxComparisonsSlider.value = 50;
        if (crawlSpeed) crawlSpeed.value = 'fast';
    }
    
    // Update comparison preset buttons
    updateComparisonPresets();
}

// Toggle advanced settings visibility
function toggleAdvancedSettings() {
    const advancedSection = document.getElementById('advancedOptionsSection');
    const toggleBtn = document.getElementById('advancedToggleBtn');
    const toggleText = document.getElementById('advancedToggleText');
    const toggleChevron = document.getElementById('advancedToggleChevron');
    const options = document.getElementById('advancedOptions');
    
    if (advancedSection.style.display === 'none' || !advancedSection.style.display) {
        // Show advanced settings
        advancedSection.style.display = 'block';
        toggleText.textContent = 'Hide Advanced Settings';
        toggleChevron.classList.remove('fa-chevron-down');
        toggleChevron.classList.add('fa-chevron-up');
        toggleBtn.classList.add('active');
        
        // Expand options if needed
        setTimeout(() => {
            if (options) {
                options.classList.add('expanded');
            }
        }, 100);
    } else {
        // Hide advanced settings
        advancedSection.style.display = 'none';
        toggleText.textContent = 'Show Advanced Settings';
        toggleChevron.classList.remove('fa-chevron-up');
        toggleChevron.classList.add('fa-chevron-down');
        toggleBtn.classList.remove('active');
        
        // Reset to full deep analysis when hiding
        setAnalysisPreset('full');
    }
}

// Update comparison value from slider
function updateComparisonValue(value) {
    const input = document.getElementById('max_similarity_comparisons');
    if (input) {
        input.value = value;
    }
    updateComparisonPresets();
}

// Update comparison slider from input
function updateComparisonSlider(value) {
    const slider = document.getElementById('max_similarity_comparisons_slider');
    if (slider) {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            slider.value = Math.min(Math.max(numValue, 10), 500);
        }
    }
    updateComparisonPresets();
}

// Set comparison value (from preset buttons)
function setComparisons(value) {
    const input = document.getElementById('max_similarity_comparisons');
    const slider = document.getElementById('max_similarity_comparisons_slider');
    
    if (input) input.value = value;
    if (slider) slider.value = value;
    
    updateComparisonPresets();
}

// Update comparison preset button states
function updateComparisonPresets() {
    const input = document.getElementById('max_similarity_comparisons');
    if (!input) return;
    
    const value = parseInt(input.value);
    document.querySelectorAll('.mini-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnValue = parseInt(btn.textContent.match(/\d+/)?.[0]);
        if (btnValue === value) {
            btn.classList.add('active');
        }
    });
}

// Initialize with full deep analysis as default (hidden advanced settings)
document.addEventListener('DOMContentLoaded', function() {
    // Set default to full deep analysis (most aggressive)
    setAnalysisPreset('full');
    
    // Mark full preset as active (in case user opens advanced)
    const fullPresetBtn = document.querySelector('[data-preset="full"]');
    if (fullPresetBtn) {
        fullPresetBtn.classList.add('active');
    }
    
    // Advanced options are hidden by default - users can show them if needed
    // This ensures full deep analysis runs by default
    
    // Sync slider and input
    const slider = document.getElementById('max_similarity_comparisons_slider');
    const input = document.getElementById('max_similarity_comparisons');
    if (slider && input) {
        slider.addEventListener('input', function() {
            input.value = this.value;
            updateComparisonPresets();
        });
        
        input.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value)) {
                slider.value = Math.min(Math.max(value, 10), 500);
                updateComparisonPresets();
            }
        });
    }
    
    // Initialize comparison presets
    updateComparisonPresets();
});


// Start keyword research
async function startKeywordResearch(event) {
    event.preventDefault();
    
    const domain = document.getElementById('yourDomain').value.trim();
    const competitorsText = document.getElementById('competitorUrls').value.trim();
    const researchBtn = document.getElementById('keywordResearchBtn');
    const progressDiv = document.getElementById('keywordResearchProgress');
    const resultsDiv = document.getElementById('keywordResearchResults');
    
    if (!domain || !competitorsText) {
        alert('Please enter your domain and at least one competitor URL');
        return;
    }
    
    // Show progress, hide results
    progressDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    researchBtn.disabled = true;
    researchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Analysis...';
    
    // Initialize progress display
    updateKeywordProgress(0, 'Initializing analysis...', 'Preparing to analyze your website and competitors');
    
    try {
        // Start analysis (returns job_id)
        const response = await fetch('/api/keyword-research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: domain,
                competitors: competitorsText
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Keyword research failed');
        }
        
        const startData = await response.json();
        const jobId = startData.job_id;
        
        if (!jobId) {
            throw new Error('Failed to start analysis');
        }
        
        // Start polling for progress
        pollKeywordResearchProgress(jobId, progressDiv, resultsDiv, researchBtn);
        
    } catch (error) {
        console.error('Error in keyword research:', error);
        alert('Error: ' + error.message);
        progressDiv.style.display = 'none';
        researchBtn.disabled = false;
        researchBtn.innerHTML = '<i class="fas fa-search"></i> Start Keyword Research';
    }
}

// Poll for keyword research progress
async function pollKeywordResearchProgress(jobId, progressDiv, resultsDiv, researchBtn) {
    let pollCount = 0;
    const maxPolls = 600; // 10 minutes max (600 * 1 second)
    
    const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
            const response = await fetch(`/api/keyword-research-status/${jobId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    clearInterval(pollInterval);
                    showKeywordError('Analysis job not found. Please try again.');
                    resetKeywordResearchButton(researchBtn);
                    return;
                }
                throw new Error('Failed to get progress');
            }
            
            const progressData = await response.json();
            
            // Update progress display
            updateKeywordProgressDisplay(progressData, progressDiv);
            
            // Check if completed
            if (progressData.status === 'completed') {
                clearInterval(pollInterval);
                
                // Get full results
                try {
                    const resultsResponse = await fetch(`/api/keyword-research-results/${jobId}`);
                    if (!resultsResponse.ok) {
                        throw new Error('Failed to get results');
                    }
                    
                    const results = await resultsResponse.json();
                    
                    // Show completion
                    updateKeywordProgress(100, 'Analysis complete!', 'All data processed successfully');
                    
                    // Display results after a short delay
                    setTimeout(() => {
                        displayKeywordResearchResults(results);
                        progressDiv.style.display = 'none';
                        resultsDiv.style.display = 'block';
                        resetKeywordResearchButton(researchBtn);
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error fetching results:', error);
                    showKeywordError('Analysis completed but failed to load results. Please try again.');
                    resetKeywordResearchButton(researchBtn);
                }
                
            } else if (progressData.status === 'error') {
                clearInterval(pollInterval);
                showKeywordError(progressData.error || 'Analysis failed');
                resetKeywordResearchButton(researchBtn);
            }
            
            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                showKeywordError('Analysis is taking longer than expected. Please check back later or try again.');
                resetKeywordResearchButton(researchBtn);
            }
            
        } catch (error) {
            console.error('Error polling progress:', error);
            if (pollCount >= 10) {
                clearInterval(pollInterval);
                showKeywordError('Unable to check analysis status. Please refresh the page.');
                resetKeywordResearchButton(researchBtn);
            }
        }
    }, 1000); // Poll every 1 second
}

// Update keyword progress display with detailed information
function updateKeywordProgressDisplay(progressData, progressDiv) {
    const progress = progressData.progress || 0;
    const stage = progressData.stage || 'Processing...';
    const currentCompetitor = progressData.current_competitor;
    const competitorIndex = progressData.competitor_index || 0;
    const totalCompetitors = progressData.total_competitors || 0;
    const details = progressData.details || [];
    
    // Update competitor count
    if (totalCompetitors > 0) {
        const currentCount = currentCompetitor ? competitorIndex + 1 : competitorIndex;
        updateCompetitorCount(currentCount, totalCompetitors);
    }
    
    // Build status message
    let statusMessage = stage;
    let detailMessage = '';
    
    if (currentCompetitor && totalCompetitors > 0) {
        statusMessage = `Analyzing Competitor ${competitorIndex + 1}/${totalCompetitors}`;
        detailMessage = `${currentCompetitor} - ${stage}`;
    } else {
        detailMessage = stage;
    }
    
    // Update progress bar and text
    updateKeywordProgress(progress, statusMessage, detailMessage);
    
    // Update detailed progress log
    const progressLog = document.getElementById('keywordProgressLog');
    if (progressLog) {
        // Show last 8 details
        const recentDetails = details.slice(-8).reverse();
        let logHtml = '<div class="progress-log-header"><strong><i class="fas fa-list"></i> Activity Log:</strong></div>';
        
        if (recentDetails.length > 0) {
            recentDetails.forEach(detail => {
                const time = new Date(detail.time).toLocaleTimeString();
                logHtml += `<div class="progress-log-item">
                    <span class="log-time">${time}</span>
                    <span class="log-message">${detail.message}</span>
                </div>`;
            });
        } else {
            logHtml += `<div class="progress-log-item">
                <span class="log-time">--:--:--</span>
                <span class="log-message">Waiting for updates...</span>
            </div>`;
        }
        
        progressLog.innerHTML = logHtml;
    }
}

// Show keyword research error
function showKeywordError(message) {
    const progressDiv = document.getElementById('keywordResearchProgress');
    if (progressDiv) {
        const errorHtml = `
            <div class="progress-error">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Error:</strong> ${message}
            </div>
        `;
        progressDiv.innerHTML = errorHtml;
    }
}

// Reset keyword research button
function resetKeywordResearchButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Start Keyword Research';
    }
}

// Update keyword research progress
function updateKeywordProgress(percent, message, detailMessage = '') {
    const progressFill = document.getElementById('keywordProgressFill');
    const progressText = document.getElementById('keywordProgressText');
    const progressDetail = document.getElementById('keywordProgressDetail');
    const progressPercent = document.getElementById('keywordProgressPercent');
    const progressLog = document.getElementById('keywordProgressLog');
    
    // Update progress bar
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    
    // Update percentage
    if (progressPercent) {
        progressPercent.textContent = Math.round(percent) + '%';
    }
    
    // Update main message
    if (progressText) {
        progressText.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    }
    
    // Update detail message
    if (progressDetail) {
        progressDetail.textContent = detailMessage || '';
    }
    
    // Update stage indicators based on progress
    updateProgressStages(percent);
}

// Update progress stage indicators
function updateProgressStages(percent) {
    // Your site crawling (0-10%)
    const stageYourSite = document.getElementById('stage-your-site');
    if (stageYourSite) {
        if (percent >= 10) {
            stageYourSite.classList.add('completed');
            stageYourSite.querySelector('i').className = 'fas fa-check-circle';
        } else if (percent > 0) {
            stageYourSite.classList.add('active');
            stageYourSite.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }
    
    // Competitors crawling (10-40%)
    const stageCompetitors = document.getElementById('stage-competitors');
    if (stageCompetitors) {
        if (percent >= 40) {
            stageCompetitors.classList.add('completed');
            stageCompetitors.querySelector('i').className = 'fas fa-check-circle';
        } else if (percent >= 10) {
            stageCompetitors.classList.add('active');
            stageCompetitors.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }
    
    // Keywords extraction (50-70%)
    const stageKeywords = document.getElementById('stage-keywords');
    if (stageKeywords) {
        if (percent >= 70) {
            stageKeywords.classList.add('completed');
            stageKeywords.querySelector('i').className = 'fas fa-check-circle';
        } else if (percent >= 50) {
            stageKeywords.classList.add('active');
            stageKeywords.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }
    
    // Analysis (70-95%)
    const stageAnalysis = document.getElementById('stage-analysis');
    if (stageAnalysis) {
        if (percent >= 95) {
            stageAnalysis.classList.add('completed');
            stageAnalysis.querySelector('i').className = 'fas fa-check-circle';
        } else if (percent >= 70) {
            stageAnalysis.classList.add('active');
            stageAnalysis.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }
    
    // Complete (95-100%)
    const stageComplete = document.getElementById('stage-complete');
    if (stageComplete) {
        if (percent >= 100) {
            stageComplete.classList.add('completed');
            stageComplete.querySelector('i').className = 'fas fa-check-circle';
        } else if (percent >= 95) {
            stageComplete.classList.add('active');
            stageComplete.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }
}

// Update competitor count in progress
function updateCompetitorCount(current, total) {
    const competitorCount = document.getElementById('competitor-count');
    if (competitorCount) {
        competitorCount.textContent = `${current}/${total}`;
    }
}

// Display keyword research results
function displayKeywordResearchResults(data) {
    const resultsDiv = document.getElementById('keywordResearchResults');
    if (!resultsDiv) return;
    
    const stats = data.statistics || {};
    const competitors = data.competitors || [];
    const perCompetitorData = data.per_competitor_data || {};
    
    let html = `
        <div class="keyword-research-results">
            <div class="keyword-research-header">
                <h3><i class="fas fa-chart-line"></i> Keyword Research Analysis Complete</h3>
                <p class="analysis-date">
                    <i class="fas fa-calendar"></i> Analysis Date: ${data.analysis_date || 'N/A'} | 
                    <i class="fas fa-clock"></i> Analysis Time: ${stats.analysis_time || 0}s | 
                    <i class="fas fa-users"></i> Competitors Analyzed: ${stats.competitor_count || 0}
                </p>
            </div>
            
            <!-- Overview Section -->
            <div class="keyword-section overview-section">
                <h3><i class="fas fa-tachometer-alt"></i> Analysis Overview</h3>
                <p class="section-description">
                    This analysis compared your website (<strong>${data.domain || 'N/A'}</strong>) against 
                    <strong>${stats.competitor_count || 0}</strong> competitor${stats.competitor_count !== 1 ? 's' : ''}. 
                    Below you'll find aggregated insights and individual competitor breakdowns.
                </p>
                
                <div class="keyword-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-key"></i></div>
                        <div class="stat-value">${stats.your_keyword_count || 0}</div>
                        <div class="stat-label">Your Keywords</div>
                        <div class="stat-description">Unique keywords found on your website</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-value">${stats.competitor_keyword_count || 0}</div>
                        <div class="stat-label">Competitor Keywords</div>
                        <div class="stat-description">Total unique keywords from all competitors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-gap"></i></div>
                        <div class="stat-value">${stats.content_gap_count || 0}</div>
                        <div class="stat-label">Content Gaps</div>
                        <div class="stat-description">Keywords competitors use that you don't</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-project-diagram"></i></div>
                        <div class="stat-value">${stats.topic_cluster_count || 0}</div>
                        <div class="stat-label">Topic Clusters</div>
                        <div class="stat-description">Related keyword groups identified</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-tag"></i></div>
                        <div class="stat-value">${stats.entity_count || 0}</div>
                        <div class="stat-label">Entities Found</div>
                        <div class="stat-description">Product names, brands, menu items extracted</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-question-circle"></i></div>
                        <div class="stat-value">${stats.faq_count || 0}</div>
                        <div class="stat-label">FAQ Patterns</div>
                        <div class="stat-description">Question patterns found in content</div>
                    </div>
                </div>
            </div>
            
            <!-- Per-Competitor Breakdown Tabs -->
            ${competitors.length > 0 && Object.keys(perCompetitorData).length > 0 ? `
                <div class="keyword-section competitor-breakdown-section">
                    <h3><i class="fas fa-building"></i> Individual Competitor Analysis</h3>
                    <p class="section-description">
                        Click on each competitor tab below to see detailed keyword data, top keywords, and phrases for that specific competitor. 
                        This helps you understand each competitor's keyword strategy individually.
                    </p>
                    
                    <div class="competitor-tabs">
                        ${competitors.map((url, index) => {
                            const compData = perCompetitorData[url] || {};
                            const domain = compData.domain || url.replace(/^https?:\/\//, '').split('/')[0];
                            return `
                                <button class="competitor-tab ${index === 0 ? 'active' : ''}" 
                                        onclick="showCompetitorData('${url.replace(/'/g, "\\'")}', ${index})">
                                    <span class="tab-number">${index + 1}</span>
                                    <span class="tab-domain">${domain}</span>
                                    <span class="tab-badge">${compData.keyword_count || 0} keywords</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    
                    ${competitors.map((url, index) => {
                        const compData = perCompetitorData[url] || {};
                        return `
                            <div class="competitor-data-panel" id="competitor-panel-${index}" style="display: ${index === 0 ? 'block' : 'none'}">
                                <div class="competitor-panel-header">
                                    <h4><i class="fas fa-globe"></i> ${compData.domain || url}</h4>
                                    <div class="competitor-stats">
                                        <span><i class="fas fa-file-alt"></i> ${compData.pages_crawled || 0} pages crawled</span>
                                        <span><i class="fas fa-key"></i> ${compData.keyword_count || 0} keywords</span>
                                        <span><i class="fas fa-quote-left"></i> ${compData.phrase_count || 0} phrases</span>
                                    </div>
                                </div>
                                
                                <div class="competitor-keywords-grid">
                                    <div class="comp-keywords-column">
                                        <h5><i class="fas fa-list"></i> Top Keywords</h5>
                                        <p class="column-description">Most frequently used keywords on this competitor's website</p>
                                        <div class="comp-keyword-list">
                                            ${(compData.keywords || []).slice(0, 30).map((kw, idx) => `
                                                <div class="comp-keyword-item">
                                                    <span class="comp-kw-rank">#${idx + 1}</span>
                                                    <span class="comp-kw-text">${kw}</span>
                                                    ${compData.top_keywords && compData.top_keywords[kw] ? 
                                                        `<span class="comp-kw-freq">${compData.top_keywords[kw]}x</span>` : ''}
                                                </div>
                                            `).join('') || '<p class="no-data">No keywords found</p>'}
                                        </div>
                                    </div>
                                    <div class="comp-keywords-column">
                                        <h5><i class="fas fa-quote-left"></i> Top Phrases</h5>
                                        <p class="column-description">2-3 word keyword phrases commonly used</p>
                                        <div class="comp-keyword-list">
                                            ${(compData.phrases || []).slice(0, 30).map((phrase, idx) => `
                                                <div class="comp-keyword-item">
                                                    <span class="comp-kw-rank">#${idx + 1}</span>
                                                    <span class="comp-kw-text">${phrase}</span>
                                                </div>
                                            `).join('') || '<p class="no-data">No phrases found</p>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
            
            <!-- Keyword Opportunities -->
            ${data.opportunities && data.opportunities.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-star"></i> Top Keyword Opportunities</h3>
                    <p class="section-description">
                        These are keywords and phrases that your competitors are using but you're not. 
                        Higher scores indicate better opportunities. Focus on keywords with scores above 50 for maximum impact.
                    </p>
                    <div class="opportunities-grid">
                        ${data.opportunities.slice(0, 50).map((opp, index) => `
                            <div class="opportunity-card">
                                <div class="opp-header-row">
                                    <span class="opp-rank">#${index + 1}</span>
                                    <div class="opp-content">
                                        <div class="opp-keyword">${opp.keyword}</div>
                                        <div class="opp-badges">
                                            <span class="opp-type">${opp.type}</span>
                                            <span class="opp-score">${Math.round(opp.opportunity_score)}</span>
                                        </div>
                                    </div>
                                </div>
                                <p class="opp-recommendation">${opp.recommendation}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Content Gaps -->
            ${data.content_gaps ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-exclamation-triangle"></i> Content Gaps Analysis</h3>
                    <p class="section-description">
                        Content gaps are keywords and phrases that competitors use frequently but are missing from your website. 
                        These represent opportunities to create new content or optimize existing pages. 
                        Frequency shows how often competitors use these terms, and the score indicates the opportunity value.
                    </p>
                    <div class="content-gaps-grid">
                        <div class="gap-column">
                            <h4>
                                <i class="fas fa-key"></i> Missing Keywords 
                                <span class="count-badge">${data.content_gaps.missing_keywords?.length || 0}</span>
                            </h4>
                            <p class="column-description">Single keywords competitors use that you don't</p>
                            <div class="keyword-list">
                                ${(data.content_gaps.missing_keywords || []).slice(0, 50).map(kw => `
                                    <div class="keyword-item">
                                        <span class="keyword-text">${kw.keyword}</span>
                                        <div class="keyword-metrics">
                                            <span class="keyword-freq" title="Frequency across competitors">Freq: ${kw.frequency}</span>
                                            <span class="keyword-score" title="Opportunity score (higher = better)">Score: ${Math.round(kw.opportunity_score)}</span>
                                        </div>
                                    </div>
                                `).join('') || '<p class="no-data">No missing keywords found</p>'}
                            </div>
                        </div>
                        <div class="gap-column">
                            <h4>
                                <i class="fas fa-quote-left"></i> Missing Phrases 
                                <span class="count-badge">${data.content_gaps.missing_phrases?.length || 0}</span>
                            </h4>
                            <p class="column-description">2-3 word phrases competitors use that you don't</p>
                            <div class="keyword-list">
                                ${(data.content_gaps.missing_phrases || []).slice(0, 50).map(phrase => `
                                    <div class="keyword-item">
                                        <span class="keyword-text">${phrase.phrase}</span>
                                        <div class="keyword-metrics">
                                            <span class="keyword-freq" title="Frequency across competitors">Freq: ${phrase.frequency}</span>
                                            <span class="keyword-score" title="Opportunity score (higher = better)">Score: ${Math.round(phrase.opportunity_score)}</span>
                                        </div>
                                    </div>
                                `).join('') || '<p class="no-data">No missing phrases found</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Topic Clusters -->
            ${data.topic_clusters && data.topic_clusters.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-project-diagram"></i> Topic Clusters</h3>
                    <p class="section-description">
                        Topic clusters group related keywords together. This shows what main topics your competitors are focusing on. 
                        Each cluster represents a content theme. Use this to identify content pillars you might want to create.
                    </p>
                    <div class="topic-clusters-grid">
                        ${data.topic_clusters.slice(0, 30).map(cluster => `
                            <div class="topic-cluster-card">
                                <h4>${cluster.topic}</h4>
                                <p class="cluster-meta">
                                    <i class="fas fa-key"></i> ${cluster.keyword_count} keywords | 
                                    <i class="fas fa-star"></i> Relevance: ${cluster.relevance_score}
                                </p>
                                <div class="cluster-keywords">
                                    ${cluster.keywords.slice(0, 15).map(kw => `<span class="cluster-keyword">${kw}</span>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Entities -->
            ${data.entities && data.entities.all_entities && data.entities.all_entities.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-tag"></i> Extracted Entities</h3>
                    <p class="section-description">
                        Entities are specific named items like product names, menu items, brand names, locations, or events. 
                        These are extracted using NLP techniques. Use this to see what specific products or services competitors mention.
                    </p>
                    <div class="entities-list">
                        ${data.entities.all_entities.slice(0, 100).map(entity => `
                            <span class="entity-tag" title="Entity extracted from content">${entity}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- FAQ Patterns -->
            ${data.faq_patterns && data.faq_patterns.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-question-circle"></i> FAQ Patterns</h3>
                    <p class="section-description">
                        These are questions found in competitor content. Use these to create FAQ sections or answer content. 
                        Questions are categorized by type (what, how, why, when, where, who).
                    </p>
                    <div class="faq-list">
                        ${data.faq_patterns.slice(0, 50).map(faq => `
                            <div class="faq-item">
                                <span class="faq-type">${faq.type}</span>
                                <p class="faq-question">${faq.question}</p>
                                <small class="faq-source">Source: <a href="${faq.source}" target="_blank">${faq.source}</a></small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Keyword Difficulty Analysis -->
            ${data.keyword_difficulty ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-chart-line"></i> Keyword Difficulty Analysis</h3>
                    <p class="section-description">
                        Keyword difficulty measures how competitive a keyword is based on how many competitors use it and how frequently. 
                        Easy keywords (< 30) are less competitive and easier to rank for. Hard keywords (≥ 70) are highly competitive.
                    </p>
                    <div class="difficulty-tabs">
                        <button class="difficulty-tab active" onclick="showDifficultyTab('easy')">
                            <i class="fas fa-check-circle"></i> Easy Keywords 
                            <span class="count-badge">${data.keyword_difficulty.easy_keywords?.length || 0}</span>
                        </button>
                        <button class="difficulty-tab" onclick="showDifficultyTab('medium')">
                            <i class="fas fa-exclamation-circle"></i> Medium Keywords 
                            <span class="count-badge">${data.keyword_difficulty.medium_keywords?.length || 0}</span>
                        </button>
                        <button class="difficulty-tab" onclick="showDifficultyTab('hard')">
                            <i class="fas fa-times-circle"></i> Hard Keywords 
                            <span class="count-badge">${data.keyword_difficulty.hard_keywords?.length || 0}</span>
                        </button>
                    </div>
                    <div id="difficulty-easy" class="difficulty-content active">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.easy_keywords || []).map(kw => `
                                <div class="difficulty-card easy">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge easy">Easy</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div id="difficulty-medium" class="difficulty-content">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.medium_keywords || []).map(kw => `
                                <div class="difficulty-card medium">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge medium">Medium</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div id="difficulty-hard" class="difficulty-content">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.hard_keywords || []).map(kw => `
                                <div class="difficulty-card hard">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge hard">Hard</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Keyword Intent Analysis -->
            ${data.keyword_intent ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-bullseye"></i> Keyword Intent Classification</h3>
                    <p class="section-description">
                        Keywords are classified by search intent: <strong>Informational</strong> (seeking information), 
                        <strong>Transactional</strong> (ready to buy), <strong>Commercial</strong> (comparing options), 
                        and <strong>Navigational</strong> (looking for specific site). This helps you create content that matches user intent.
                    </p>
                    <div class="intent-grid">
                        <div class="intent-column informational">
                            <h4><i class="fas fa-info-circle"></i> Informational <span class="count-badge">${data.keyword_intent.informational?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.informational || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column transactional">
                            <h4><i class="fas fa-shopping-cart"></i> Transactional <span class="count-badge">${data.keyword_intent.transactional?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.transactional || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column commercial">
                            <h4><i class="fas fa-balance-scale"></i> Commercial <span class="count-badge">${data.keyword_intent.commercial?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.commercial || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column navigational">
                            <h4><i class="fas fa-compass"></i> Navigational <span class="count-badge">${data.keyword_intent.navigational?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.navigational || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Long-Tail Keywords -->
            ${data.long_tail_keywords && data.long_tail_keywords.keywords?.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-stream"></i> Long-Tail Keywords (4+ Words)</h3>
                    <p class="section-description">
                        Long-tail keywords are longer, more specific phrases (4+ words) that are less competitive and often have higher conversion rates. 
                        These are great for targeting niche audiences and specific search queries.
                    </p>
                    <div class="long-tail-grid">
                        ${data.long_tail_keywords.keywords.slice(0, 50).map(kw => `
                            <div class="long-tail-card">
                                <div class="long-tail-keyword">${kw.keyword}</div>
                                <div class="long-tail-freq"><i class="fas fa-chart-line"></i> Frequency: ${kw.frequency}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- LSI Keywords -->
            ${data.lsi_keywords && data.lsi_keywords.keyword_groups?.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-sitemap"></i> LSI (Latent Semantic Indexing) Keywords</h3>
                    <p class="section-description">
                        LSI keywords are semantically related terms that search engines use to understand content context. 
                        Using these related keywords helps improve your content's relevance and SEO performance.
                    </p>
                    <div class="lsi-grid">
                        ${data.lsi_keywords.keyword_groups.slice(0, 20).map(group => `
                            <div class="lsi-card">
                                <h4 class="lsi-main">${group.main_keyword}</h4>
                                <div class="lsi-related">
                                    <strong>Related Keywords:</strong>
                                    <div class="lsi-keywords">
                                        ${group.related_keywords.slice(0, 8).map(rel => `
                                            <span class="lsi-keyword" title="Similarity: ${rel.similarity}%">
                                                ${rel.keyword} <span class="lsi-sim">${rel.similarity}%</span>
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Keyword Variations -->
            ${data.keyword_variations && data.keyword_variations.variations?.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-exchange-alt"></i> Keyword Variations & Synonyms</h3>
                    <p class="section-description">
                        These are variations of keywords (plural/singular forms, different word order, synonyms) that competitors use. 
                        Including these variations in your content helps cover more search queries.
                    </p>
                    <div class="variations-grid">
                        ${data.keyword_variations.variations.slice(0, 30).map(var_item => `
                            <div class="variation-card">
                                <div class="variation-base"><strong>Base:</strong> ${var_item.base_keyword}</div>
                                <div class="variation-list">
                                    <strong>Variations:</strong>
                                    ${var_item.variations.map(v => `<span class="variation-item">${v}</span>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Content Suggestions -->
            ${data.content_suggestions && data.content_suggestions.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-lightbulb"></i> AI-Powered Content Suggestions</h3>
                    <p class="section-description">
                        Based on keyword opportunities, content gaps, and competitor analysis, here are specific content ideas you should create. 
                        Each suggestion includes the target keywords and estimated value.
                    </p>
                    <div class="suggestions-grid">
                        ${data.content_suggestions.map((suggestion, idx) => `
                            <div class="suggestion-card ${suggestion.priority}">
                                <div class="suggestion-header">
                                    <h4>${suggestion.title}</h4>
                                    <span class="suggestion-type">${suggestion.type.replace('_', ' ')}</span>
                                </div>
                                <div class="suggestion-priority">
                                    <i class="fas fa-${suggestion.priority === 'high' ? 'exclamation-triangle' : 'info-circle'}"></i>
                                    Priority: <strong>${suggestion.priority.toUpperCase()}</strong>
                                </div>
                                <p class="suggestion-text">${suggestion.suggestion}</p>
                                <div class="suggestion-keywords">
                                    <strong>Target Keywords:</strong>
                                    ${suggestion.keywords.map(kw => `<span class="suggestion-kw">${kw}</span>`).join('')}
                                </div>
                                <div class="suggestion-value">
                                    <i class="fas fa-star"></i> Estimated Value: <strong>${suggestion.estimated_value}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- SERP Opportunities -->
            ${data.serp_opportunities ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-trophy"></i> SERP Feature Opportunities</h3>
                    <p class="section-description">
                        SERP (Search Engine Results Page) features like Featured Snippets, People Also Ask, and Related Searches can significantly 
                        increase your visibility. Here are opportunities to target these features.
                    </p>
                    <div class="serp-grid">
                        <div class="serp-column">
                            <h4><i class="fas fa-star"></i> Featured Snippet Opportunities</h4>
                            <div class="serp-list">
                                ${(data.serp_opportunities.featured_snippet || []).slice(0, 15).map(item => `
                                    <div class="serp-item">
                                        <div class="serp-keyword">${item.keyword}</div>
                                        <div class="serp-opportunity">${item.opportunity}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="serp-column">
                            <h4><i class="fas fa-question"></i> People Also Ask</h4>
                            <div class="serp-list">
                                ${(data.serp_opportunities.people_also_ask || []).slice(0, 15).map(item => `
                                    <div class="serp-item">
                                        <div class="serp-keyword">${item.keyword}</div>
                                        <div class="serp-opportunity">${item.opportunity}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="serp-column">
                            <h4><i class="fas fa-search"></i> Related Searches</h4>
                            <div class="serp-list">
                                ${(data.serp_opportunities.related_searches || []).slice(0, 10).map(item => `
                                    <div class="serp-item">
                                        <div class="serp-keyword">${item.main_keyword}</div>
                                        <div class="serp-related">
                                            ${item.related.map(r => `<span class="serp-related-kw">${r}</span>`).join('')}
                                        </div>
                                        <div class="serp-opportunity">${item.opportunity}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Keyword Difficulty Analysis -->
            ${data.keyword_difficulty ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-chart-line"></i> Keyword Difficulty Analysis</h3>
                    <p class="section-description">
                        Keyword difficulty measures how competitive a keyword is based on how many competitors use it and how frequently. 
                        Easy keywords (< 30) are less competitive and easier to rank for. Hard keywords (≥ 70) are highly competitive.
                    </p>
                    <div class="difficulty-tabs">
                        <button class="difficulty-tab active" onclick="showDifficultyTab('easy')">
                            <i class="fas fa-check-circle"></i> Easy Keywords 
                            <span class="count-badge">${data.keyword_difficulty.easy_keywords?.length || 0}</span>
                        </button>
                        <button class="difficulty-tab" onclick="showDifficultyTab('medium')">
                            <i class="fas fa-exclamation-circle"></i> Medium Keywords 
                            <span class="count-badge">${data.keyword_difficulty.medium_keywords?.length || 0}</span>
                        </button>
                        <button class="difficulty-tab" onclick="showDifficultyTab('hard')">
                            <i class="fas fa-times-circle"></i> Hard Keywords 
                            <span class="count-badge">${data.keyword_difficulty.hard_keywords?.length || 0}</span>
                        </button>
                    </div>
                    <div id="difficulty-easy" class="difficulty-content active">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.easy_keywords || []).map(kw => `
                                <div class="difficulty-card easy">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge easy">Easy</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div id="difficulty-medium" class="difficulty-content">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.medium_keywords || []).map(kw => `
                                <div class="difficulty-card medium">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge medium">Medium</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div id="difficulty-hard" class="difficulty-content">
                        <div class="difficulty-grid">
                            ${(data.keyword_difficulty.hard_keywords || []).map(kw => `
                                <div class="difficulty-card hard">
                                    <div class="difficulty-header">
                                        <span class="difficulty-keyword">${kw.keyword}</span>
                                        <span class="difficulty-badge hard">Hard</span>
                                    </div>
                                    <div class="difficulty-metrics">
                                        <span><i class="fas fa-users"></i> Competitors: ${kw.competitor_count}</span>
                                        <span><i class="fas fa-chart-bar"></i> Frequency: ${kw.total_frequency}</span>
                                        <span><i class="fas fa-percentage"></i> Difficulty: ${kw.difficulty}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Keyword Intent Analysis -->
            ${data.keyword_intent ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-bullseye"></i> Keyword Intent Classification</h3>
                    <p class="section-description">
                        Keywords are classified by search intent: <strong>Informational</strong> (seeking information), 
                        <strong>Transactional</strong> (ready to buy), <strong>Commercial</strong> (comparing options), 
                        and <strong>Navigational</strong> (looking for specific site). This helps you create content that matches user intent.
                    </p>
                    <div class="intent-grid">
                        <div class="intent-column informational">
                            <h4><i class="fas fa-info-circle"></i> Informational <span class="count-badge">${data.keyword_intent.informational?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.informational || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column transactional">
                            <h4><i class="fas fa-shopping-cart"></i> Transactional <span class="count-badge">${data.keyword_intent.transactional?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.transactional || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column commercial">
                            <h4><i class="fas fa-balance-scale"></i> Commercial <span class="count-badge">${data.keyword_intent.commercial?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.commercial || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="intent-column navigational">
                            <h4><i class="fas fa-compass"></i> Navigational <span class="count-badge">${data.keyword_intent.navigational?.length || 0}</span></h4>
                            <div class="intent-keywords">
                                ${(data.keyword_intent.navigational || []).slice(0, 30).map(kw => `
                                    <span class="intent-keyword" title="${kw.keyword}">${kw.keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Long-Tail Keywords -->
            ${data.long_tail_keywords && data.long_tail_keywords.keywords?.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-stream"></i> Long-Tail Keywords (4+ Words)</h3>
                    <p class="section-description">
                        Long-tail keywords are longer, more specific phrases (4+ words) that are less competitive and often have higher conversion rates. 
                        These are great for targeting niche audiences and specific search queries.
                    </p>
                    <div class="long-tail-grid">
                        ${data.long_tail_keywords.keywords.slice(0, 50).map(kw => `
                            <div class="long-tail-card">
                                <div class="long-tail-keyword">${kw.keyword}</div>
                                <div class="long-tail-freq"><i class="fas fa-chart-line"></i> Frequency: ${kw.frequency}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- LSI Keywords -->
            ${data.lsi_keywords && data.lsi_keywords.keyword_groups?.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-sitemap"></i> LSI (Latent Semantic Indexing) Keywords</h3>
                    <p class="section-description">
                        LSI keywords are semantically related terms that search engines use to understand content context. 
                        Using these related keywords helps improve your content's relevance and SEO performance.
                    </p>
                    <div class="lsi-grid">
                        ${data.lsi_keywords.keyword_groups.slice(0, 20).map(group => `
                            <div class="lsi-card">
                                <h4 class="lsi-main">${group.main_keyword}</h4>
                                <div class="lsi-related">
                                    <strong>Related Keywords:</strong>
                                    <div class="lsi-keywords">
                                        ${group.related_keywords.slice(0, 8).map(rel => `
                                            <span class="lsi-keyword" title="Similarity: ${rel.similarity}%">
                                                ${rel.keyword} <span class="lsi-sim">${rel.similarity}%</span>
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Content Suggestions -->
            ${data.content_suggestions && data.content_suggestions.length > 0 ? `
                <div class="keyword-section">
                    <h3><i class="fas fa-lightbulb"></i> AI-Powered Content Suggestions</h3>
                    <p class="section-description">
                        Based on keyword opportunities, content gaps, and competitor analysis, here are specific content ideas you should create. 
                        Each suggestion includes the target keywords and estimated value.
                    </p>
                    <div class="suggestions-grid">
                        ${data.content_suggestions.map((suggestion, idx) => `
                            <div class="suggestion-card ${suggestion.priority}">
                                <div class="suggestion-header">
                                    <h4>${suggestion.title}</h4>
                                    <span class="suggestion-type">${suggestion.type.replace('_', ' ')}</span>
                                </div>
                                <div class="suggestion-priority">
                                    <i class="fas fa-${suggestion.priority === 'high' ? 'exclamation-triangle' : 'info-circle'}"></i>
                                    Priority: <strong>${suggestion.priority.toUpperCase()}</strong>
                                </div>
                                <p class="suggestion-text">${suggestion.suggestion}</p>
                                <div class="suggestion-keywords">
                                    <strong>Target Keywords:</strong>
                                    ${suggestion.keywords.map(kw => `<span class="suggestion-kw">${kw}</span>`).join('')}
                                </div>
                                <div class="suggestion-value">
                                    <i class="fas fa-star"></i> Estimated Value: <strong>${suggestion.estimated_value}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Export Section -->
            <div class="keyword-section export-section">
                <h3><i class="fas fa-download"></i> Export Results</h3>
                <p class="section-description">
                    Download your analysis results in JSON format for further analysis or reporting.
                </p>
                <div class="export-buttons">
                    <button class="btn btn-secondary" onclick="exportKeywordData('keywords', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-code"></i> Export Keywords JSON
                    </button>
                    <button class="btn btn-secondary" onclick="exportKeywordData('topics', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-code"></i> Export Topics JSON
                    </button>
                    <button class="btn btn-secondary" onclick="exportKeywordData('gaps', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-code"></i> Export Gaps JSON
                    </button>
                    <button class="btn btn-secondary" onclick="exportKeywordData('all', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-archive"></i> Export All Data
                    </button>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show competitor data tab
function showCompetitorData(url, index) {
    // Hide all panels
    document.querySelectorAll('.competitor-data-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.competitor-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected panel
    const panel = document.getElementById(`competitor-panel-${index}`);
    if (panel) {
        panel.style.display = 'block';
    }
    
    // Add active class to selected tab
    const tab = event.target.closest('.competitor-tab');
    if (tab) {
        tab.classList.add('active');
    }
}

// Search keyword across competitors
async function searchKeyword(event) {
    // Prevent form submission and page refresh - CRITICAL
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Also prevent default if called without event
    const searchBtn = document.getElementById('keywordSearchBtn');
    const resultsDiv = document.getElementById('keywordSearchResults');
    const keywordInput = document.getElementById('searchKeyword');
    const competitorsInput = document.getElementById('searchCompetitorUrls');
    
    if (!searchBtn || !resultsDiv || !keywordInput || !competitorsInput) {
        console.error('Required elements not found for keyword search');
        if (event) {
            event.preventDefault();
        }
        return false;
    }
    
    const keyword = keywordInput.value.trim();
    const competitorsStr = competitorsInput.value.trim();
    
    if (!keyword) {
        alert('Please enter a keyword to search');
        if (event) {
            event.preventDefault();
        }
        return false;
    }
    
    if (!competitorsStr) {
        alert('Please enter at least one competitor URL');
        if (event) {
            event.preventDefault();
        }
        return false;
    }
    
    // Show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching for keyword across competitors...</div>';
    
    try {
        const response = await fetch('/api/keyword-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyword: keyword,
                competitors: competitorsStr
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Keyword search failed');
        }
        
        // Display results
        displayKeywordSearchResults(data);
        
    } catch (error) {
        console.error('Error in keyword search:', error);
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> 
                    <strong>Error:</strong> ${error.message || 'Failed to search keyword. Please try again.'}
                </div>
            `;
        }
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search Keyword';
        }
    }
    
    // Always return false to prevent form submission
    return false;
}

// Display keyword search results
function displayKeywordSearchResults(data) {
    const resultsDiv = document.getElementById('keywordSearchResults');
    if (!resultsDiv) return;
    
    const keyword = data.keyword || '';
    const variations = data.variations || [];
    const competitorData = data.competitor_data || {};
    const summary = data.summary || {};
    
    let html = `
        <div class="keyword-search-results">
            <div class="keyword-search-header">
                <h3><i class="fas fa-search"></i> Keyword Search Results: "${keyword}"</h3>
                <div class="search-summary">
                    <div class="summary-stat">
                        <i class="fas fa-file-alt"></i>
                        <strong>${data.total_pages || 0}</strong> Pages Found
                    </div>
                    <div class="summary-stat">
                        <i class="fas fa-hashtag"></i>
                        <strong>${data.total_occurrences || 0}</strong> Total Occurrences
                    </div>
                    <div class="summary-stat">
                        <i class="fas fa-users"></i>
                        <strong>${summary.competitors_with_keyword || 0}</strong> / ${summary.total_competitors || 0} Competitors
                    </div>
                    ${summary.most_used_variation ? `
                    <div class="summary-stat">
                        <i class="fas fa-star"></i>
                        <strong>Most Used:</strong> "${summary.most_used_variation}"
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${variations.length > 0 ? `
            <div class="keyword-section">
                <h4><i class="fas fa-list"></i> Keyword Variations Found</h4>
                <div class="variations-list">
                    ${variations.map(v => `<span class="variation-tag">${v}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="competitor-keyword-results">
                <h4><i class="fas fa-building"></i> Results by Competitor</h4>
    `;
    
    // Display results for each competitor
    for (const [competitorUrl, compData] of Object.entries(competitorData)) {
        if (compData.error) {
            html += `
                <div class="competitor-result-card error">
                    <div class="competitor-header">
                        <h5><i class="fas fa-exclamation-triangle"></i> ${competitorUrl}</h5>
                        <span class="error-badge">Error: ${compData.error}</span>
                    </div>
                </div>
            `;
            continue;
        }
        
        const pages = compData.pages || [];
        const totalOccurrences = compData.total_occurrences || 0;
        const pagesWithKeyword = compData.pages_with_keyword || 0;
        const variationsFound = compData.variations_found || [];
        
        html += `
            <div class="competitor-result-card">
                <div class="competitor-header">
                    <h5><i class="fas fa-link"></i> ${competitorUrl}</h5>
                    <div class="competitor-stats">
                        <span class="stat-badge"><i class="fas fa-file-alt"></i> ${pagesWithKeyword} Pages</span>
                        <span class="stat-badge"><i class="fas fa-hashtag"></i> ${totalOccurrences} Occurrences</span>
                        ${variationsFound.length > 0 ? `<span class="stat-badge"><i class="fas fa-list"></i> ${variationsFound.length} Variations</span>` : ''}
                    </div>
                </div>
        `;
        
        if (pages.length > 0) {
            html += `
                <div class="pages-list">
                    <h6><i class="fas fa-file"></i> Pages with "${keyword}" (${pages.length})</h6>
                    <div class="pages-grid">
            `;
            
            pages.forEach((page, idx) => {
                const pageVariations = Object.entries(page.variations || {})
                    .map(([varName, count]) => `<span class="var-badge">${varName} (${count})</span>`)
                    .join('');
                
                html += `
                    <div class="page-result-card">
                        <div class="page-header">
                            <span class="page-rank">#${idx + 1}</span>
                            <a href="${page.url}" target="_blank" class="page-link">
                                <i class="fas fa-external-link-alt"></i> ${page.title || page.url}
                            </a>
                        </div>
                        <div class="page-stats">
                            <span class="occurrence-count"><i class="fas fa-hashtag"></i> ${page.occurrences} occurrences</span>
                        </div>
                        ${pageVariations ? `
                        <div class="page-variations">
                            <strong>Variations found:</strong>
                            <div class="variations-inline">${pageVariations}</div>
                        </div>
                        ` : ''}
                        ${page.context && page.context.length > 0 ? `
                        <div class="page-context">
                            <strong>Context snippets:</strong>
                            <ul class="context-list">
                                ${page.context.slice(0, 3).map(ctx => `<li>"${ctx.substring(0, 150)}${ctx.length > 150 ? '...' : ''}"</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i> No pages found with "${keyword}" on this competitor site.
                </div>
            `;
        }
        
        html += `</div>`; // Close competitor-result-card
    }
    
    html += `
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}

// Export keyword data
function exportKeywordData(type, data) {
    let content, filename;
    
    if (type === 'keywords') {
        content = JSON.stringify({
            your_keywords: data.your_keywords,
            competitor_keywords: data.competitor_keywords,
            per_competitor_data: data.per_competitor_data
        }, null, 2);
        filename = 'keywords.json';
    } else if (type === 'topics') {
        content = JSON.stringify({
            topic_clusters: data.topic_clusters
        }, null, 2);
        filename = 'topic_clusters.json';
    } else if (type === 'gaps') {
        content = JSON.stringify({
            content_gaps: data.content_gaps
        }, null, 2);
        filename = 'content_gaps.json';
    } else if (type === 'all') {
        content = JSON.stringify(data, null, 2);
        filename = 'keyword_research_complete.json';
    }
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Analyze competitors
async function analyzeCompetitors(event) {
    event.preventDefault();
    
    const yourUrl = document.getElementById('yourUrl').value.trim();
    const competitorUrl = document.getElementById('competitorUrl').value.trim();
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultsDiv = document.getElementById('competitorResults');
    
    if (!yourUrl || !competitorUrl) {
        alert('Please enter both URLs');
        return;
    }
    
    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    resultsDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/analyze-competitors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url1: yourUrl,
                url2: competitorUrl
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
        }
        
        const data = await response.json();
        displayCompetitorResults(data);
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error analyzing competitors:', error);
        alert('Error: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Competitors';
    }
}

// Display competitor analysis results
function displayCompetitorResults(data) {
    const resultsDiv = document.getElementById('competitorResults');
    if (!resultsDiv) return;
    
    const yourSite = data.your_site || {};
    const competitor = data.competitor || {};
    const comparison = data.comparison || {};
    const winner = data.winner || {};
    const insights = data.insights || [];
    const recommendations = data.recommendations || [];
    const advantage = data.advantage_score || {};
    
    let html = `
        <div class="competitor-results">
            <div class="competitor-header">
                <h3><i class="fas fa-trophy"></i> Overall Winner: ${winner.overall === 'your_site' ? 'Your Site 🏆' : winner.overall === 'competitor' ? 'Competitor 🏆' : 'Tie 🤝'}</h3>
                <p class="winner-summary">${winner.summary || ''}</p>
                ${advantage.advantage_percentage !== undefined ? `
                    <div class="advantage-score">
                        <div class="advantage-circle">
                            <span class="advantage-value">${advantage.advantage_percentage}%</span>
                            <span class="advantage-label">${advantage.advantage_level || 'Competitive'}</span>
                        </div>
                        <p>Your Competitive Advantage Score</p>
                    </div>
                ` : ''}
            </div>
            
            ${advantage.winning_categories && advantage.winning_categories.length > 0 ? `
                <div class="winning-categories">
                    <h4><i class="fas fa-medal"></i> Categories You Win:</h4>
                    <div class="category-tags">
                        ${advantage.winning_categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${insights.length > 0 ? `
                <div class="insights-section">
                    <h4><i class="fas fa-lightbulb"></i> Key Insights</h4>
                    <ul class="insights-list">
                        ${insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="comparison-grid">
                <!-- Load Speed Comparison -->
                <div class="comparison-card">
                    <h4><i class="fas fa-tachometer-alt"></i> Load Speed</h4>
                    <div class="comparison-metrics">
                        <div class="metric-item ${comparison.load_speed?.winner === 'your_site' ? 'winner' : ''}">
                            <span class="metric-label">Your Site:</span>
                            <span class="metric-value">${yourSite.load_time || 'N/A'}s</span>
                        </div>
                        <div class="metric-item ${comparison.load_speed?.winner === 'competitor' ? 'winner' : ''}">
                            <span class="metric-label">Competitor:</span>
                            <span class="metric-value">${competitor.load_time || 'N/A'}s</span>
                        </div>
                    </div>
                    ${comparison.load_speed?.difference ? `
                        <div class="metric-difference">
                            ${comparison.load_speed.winner === 'your_site' ? '✅' : '⚠️'} 
                            ${Math.abs(comparison.load_speed.difference).toFixed(2)}s difference
                        </div>
                    ` : ''}
                </div>
                
                <!-- Errors Comparison -->
                <div class="comparison-card">
                    <h4><i class="fas fa-exclamation-triangle"></i> Errors</h4>
                    <div class="comparison-metrics">
                        <div class="metric-item ${comparison.errors?.winner === 'your_site' ? 'winner' : ''}">
                            <span class="metric-label">Your Site:</span>
                            <span class="metric-value ${yourSite.error_count > 0 ? 'error' : 'success'}">${yourSite.error_count || 0}</span>
                        </div>
                        <div class="metric-item ${comparison.errors?.winner === 'competitor' ? 'winner' : ''}">
                            <span class="metric-label">Competitor:</span>
                            <span class="metric-value ${competitor.error_count > 0 ? 'error' : 'success'}">${competitor.error_count || 0}</span>
                        </div>
                    </div>
                </div>
                
                <!-- SEO Score Comparison -->
                <div class="comparison-card">
                    <h4><i class="fas fa-star"></i> SEO Score</h4>
                    <div class="comparison-metrics">
                        <div class="metric-item ${comparison.seo_score?.winner === 'your_site' ? 'winner' : ''}">
                            <span class="metric-label">Your Site:</span>
                            <span class="metric-value">${yourSite.seo_score || 0}/100</span>
                        </div>
                        <div class="metric-item ${comparison.seo_score?.winner === 'competitor' ? 'winner' : ''}">
                            <span class="metric-label">Competitor:</span>
                            <span class="metric-value">${competitor.seo_score || 0}/100</span>
                        </div>
                    </div>
                    ${comparison.seo_score?.difference ? `
                        <div class="metric-difference">
                            ${comparison.seo_score.difference > 0 ? '✅' : '⚠️'} 
                            ${Math.abs(comparison.seo_score.difference)} point difference
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Detailed Scores Breakdown -->
            <div class="comparison-section">
                <h3><i class="fas fa-chart-bar"></i> Detailed Score Breakdown</h3>
                <div class="score-breakdown-grid">
                    <div class="breakdown-card">
                        <h5>SEO Score Components</h5>
                        <div class="breakdown-item">
                            <span>Your Site:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${yourSite.seo_score || 0}%; background: ${(yourSite.seo_score || 0) >= 80 ? '#28a745' : (yourSite.seo_score || 0) >= 60 ? '#ffc107' : '#dc3545'}"></div>
                                <span class="breakdown-value">${yourSite.seo_score || 0}/100</span>
                            </div>
                        </div>
                        <div class="breakdown-item">
                            <span>Competitor:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${competitor.seo_score || 0}%; background: ${(competitor.seo_score || 0) >= 80 ? '#28a745' : (competitor.seo_score || 0) >= 60 ? '#ffc107' : '#dc3545'}"></div>
                                <span class="breakdown-value">${competitor.seo_score || 0}/100</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="breakdown-card">
                        <h5>Performance Score</h5>
                        <div class="breakdown-item">
                            <span>Your Site:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${yourSite.performance_score || 0}%"></div>
                                <span class="breakdown-value">${yourSite.performance_score || 0}/100</span>
                            </div>
                        </div>
                        <div class="breakdown-item">
                            <span>Competitor:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${competitor.performance_score || 0}%"></div>
                                <span class="breakdown-value">${competitor.performance_score || 0}/100</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="breakdown-card">
                        <h5>Technical Score</h5>
                        <div class="breakdown-item">
                            <span>Your Site:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${yourSite.technical_score || 0}%"></div>
                                <span class="breakdown-value">${yourSite.technical_score || 0}/100</span>
                            </div>
                        </div>
                        <div class="breakdown-item">
                            <span>Competitor:</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${competitor.technical_score || 0}%"></div>
                                <span class="breakdown-value">${competitor.technical_score || 0}/100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- On-Page SEO Comparison -->
            <div class="comparison-section">
                <h3><i class="fas fa-code"></i> On-Page SEO Comparison</h3>
                <div class="on-page-grid">
                    <div class="on-page-item">
                        <h5>Title Tag</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p class="text-content">${yourSite.title || 'N/A'}</p>
                                <span class="badge ${(yourSite.title_length || 0) >= 30 && (yourSite.title_length || 0) <= 60 ? 'badge-success' : 'badge-warning'}">${yourSite.title_length || 0} chars</span>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p class="text-content">${competitor.title || 'N/A'}</p>
                                <span class="badge ${(competitor.title_length || 0) >= 30 && (competitor.title_length || 0) <= 60 ? 'badge-success' : 'badge-warning'}">${competitor.title_length || 0} chars</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="on-page-item">
                        <h5>Meta Description</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p class="text-content">${yourSite.meta_description || 'N/A'}</p>
                                <span class="badge ${(yourSite.meta_description_length || 0) >= 120 && (yourSite.meta_description_length || 0) <= 160 ? 'badge-success' : 'badge-warning'}">${yourSite.meta_description_length || 0} chars</span>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p class="text-content">${competitor.meta_description || 'N/A'}</p>
                                <span class="badge ${(competitor.meta_description_length || 0) >= 120 && (competitor.meta_description_length || 0) <= 160 ? 'badge-success' : 'badge-warning'}">${competitor.meta_description_length || 0} chars</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="on-page-item">
                        <h5>Headings Structure</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p>H1: ${yourSite.h1_count || 0} ${yourSite.h1_count === 1 ? '✅' : yourSite.h1_count === 0 ? '❌' : '⚠️'}</p>
                                <p>H2: ${yourSite.h2_count || 0}, H3: ${yourSite.h3_count || 0}</p>
                                <p>H4-H6: ${(yourSite.h4_count || 0) + (yourSite.h5_count || 0) + (yourSite.h6_count || 0)}</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p>H1: ${competitor.h1_count || 0} ${competitor.h1_count === 1 ? '✅' : competitor.h1_count === 0 ? '❌' : '⚠️'}</p>
                                <p>H2: ${competitor.h2_count || 0}, H3: ${competitor.h3_count || 0}</p>
                                <p>H4-H6: ${(competitor.h4_count || 0) + (competitor.h5_count || 0) + (competitor.h6_count || 0)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="on-page-item">
                        <h5>Content Analysis</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p><strong>Words:</strong> ${(yourSite.word_count || 0).toLocaleString()}</p>
                                <p><strong>Characters:</strong> ${(yourSite.character_count || 0).toLocaleString()}</p>
                                <p><strong>Paragraphs:</strong> ${yourSite.paragraph_count || 0}</p>
                                <p><strong>Readability:</strong> ${yourSite.readability_score || 0} (${yourSite.readability_grade || 'N/A'})</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p><strong>Words:</strong> ${(competitor.word_count || 0).toLocaleString()}</p>
                                <p><strong>Characters:</strong> ${(competitor.character_count || 0).toLocaleString()}</p>
                                <p><strong>Paragraphs:</strong> ${competitor.paragraph_count || 0}</p>
                                <p><strong>Readability:</strong> ${competitor.readability_score || 0} (${competitor.readability_grade || 'N/A'})</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="on-page-item">
                        <h5>Images & Media</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p>Total: ${yourSite.images_count || 0}</p>
                                <p>With Alt: ${yourSite.images_with_alt || 0}</p>
                                <p>Alt Coverage: ${yourSite.images_alt_coverage || 0}% ${(yourSite.images_alt_coverage || 0) === 100 ? '✅' : '⚠️'}</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p>Total: ${competitor.images_count || 0}</p>
                                <p>With Alt: ${competitor.images_with_alt || 0}</p>
                                <p>Alt Coverage: ${competitor.images_alt_coverage || 0}% ${(competitor.images_alt_coverage || 0) === 100 ? '✅' : '⚠️'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="on-page-item">
                        <h5>Technical SEO</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p>Canonical: ${yourSite.canonical_url ? '✅ Yes' : '❌ No'}</p>
                                <p>OG Tags: ${yourSite.og_tags_count || 0}</p>
                                <p>Twitter Tags: ${yourSite.twitter_tags_count || 0}</p>
                                <p>Schema: ${yourSite.schema_count || 0} types</p>
                                <p>Language: ${yourSite.language || 'Not set'}</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p>Canonical: ${competitor.canonical_url ? '✅ Yes' : '❌ No'}</p>
                                <p>OG Tags: ${competitor.og_tags_count || 0}</p>
                                <p>Twitter Tags: ${competitor.twitter_tags_count || 0}</p>
                                <p>Schema: ${competitor.schema_count || 0} types</p>
                                <p>Language: ${competitor.language || 'Not set'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Performance Details -->
            <div class="comparison-section">
                <h3><i class="fas fa-tachometer-alt"></i> Performance Details</h3>
                <div class="performance-details-grid">
                    <div class="performance-detail-item">
                        <h5>Page Size</h5>
                        <p>Your Site: <strong>${(yourSite.page_size / 1024).toFixed(2)} KB</strong></p>
                        <p>Competitor: <strong>${(competitor.page_size / 1024).toFixed(2)} KB</strong></p>
                        <p>HTML Size: ${(yourSite.html_size / 1024).toFixed(2)} KB vs ${(competitor.html_size / 1024).toFixed(2)} KB</p>
                    </div>
                    
                    <div class="performance-detail-item">
                        <h5>Resources</h5>
                        <p>Scripts: ${yourSite.scripts_count || 0} vs ${competitor.scripts_count || 0}</p>
                        <p>Stylesheets: ${yourSite.stylesheets_count || 0} vs ${competitor.stylesheets_count || 0}</p>
                        <p>Render-Blocking: ${yourSite.render_blocking_resources || 0} vs ${competitor.render_blocking_resources || 0}</p>
                    </div>
                    
                    <div class="performance-detail-item">
                        <h5>Optimizations</h5>
                        <p>Async Scripts: ${yourSite.scripts_with_async || 0} vs ${competitor.scripts_with_async || 0}</p>
                        <p>Defer Scripts: ${yourSite.scripts_with_defer || 0} vs ${competitor.scripts_with_defer || 0}</p>
                        <p>Preconnect: ${yourSite.preconnect_count || 0} vs ${competitor.preconnect_count || 0}</p>
                    </div>
                </div>
            </div>
            
            <!-- Mobile & Security -->
            <div class="comparison-section">
                <h3><i class="fas fa-mobile-alt"></i> Mobile & Security</h3>
                <div class="mobile-security-grid">
                    <div class="mobile-security-item">
                        <h5>Mobile-Friendliness</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p>Viewport: ${yourSite.has_viewport ? '✅' : '❌'}</p>
                                <p>Mobile Optimized: ${yourSite.has_mobile_optimized ? '✅' : '❌'}</p>
                                <p>Touch Icon: ${yourSite.has_touch_icon ? '✅' : '❌'}</p>
                                <p>Responsive Images: ${yourSite.images_with_srcset || 0}</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p>Viewport: ${competitor.has_viewport ? '✅' : '❌'}</p>
                                <p>Mobile Optimized: ${competitor.has_mobile_optimized ? '✅' : '❌'}</p>
                                <p>Touch Icon: ${competitor.has_touch_icon ? '✅' : '❌'}</p>
                                <p>Responsive Images: ${competitor.images_with_srcset || 0}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mobile-security-item">
                        <h5>Security Headers</h5>
                        <div class="side-by-side">
                            <div class="side-item">
                                <strong>Your Site:</strong>
                                <p>HTTPS: ${yourSite.security_headers?.https ? '✅' : '❌'}</p>
                                <p>Security Headers: ${yourSite.security_headers_count || 0}/7</p>
                                <p>HSTS: ${yourSite.security_headers?.strict_transport_security ? '✅' : '❌'}</p>
                                <p>CSP: ${yourSite.security_headers?.content_security_policy ? '✅' : '❌'}</p>
                            </div>
                            <div class="side-item">
                                <strong>Competitor:</strong>
                                <p>HTTPS: ${competitor.security_headers?.https ? '✅' : '❌'}</p>
                                <p>Security Headers: ${competitor.security_headers_count || 0}/7</p>
                                <p>HSTS: ${competitor.security_headers?.strict_transport_security ? '✅' : '❌'}</p>
                                <p>CSP: ${competitor.security_headers?.content_security_policy ? '✅' : '❌'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Keyword Comparison -->
            ${comparison.keywords ? `
                <div class="comparison-section">
                    <h3><i class="fas fa-key"></i> Keyword Analysis</h3>
                    
                    ${comparison.keywords.common_keywords && comparison.keywords.common_keywords.length > 0 ? `
                        <div class="keyword-group">
                            <h5>Common Keywords (${comparison.keywords.common_keywords.length})</h5>
                            <div class="keywords-list">
                                ${comparison.keywords.common_keywords.slice(0, 15).map(kw => `
                                    <span class="keyword-tag">
                                        ${kw.keyword} 
                                        <small>(You: ${kw.your_count}, Them: ${kw.competitor_count})</small>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${comparison.keywords.unique_to_your_site && comparison.keywords.unique_to_your_site.length > 0 ? `
                        <div class="keyword-group">
                            <h5>Unique to Your Site (${comparison.keywords.unique_to_your_site.length})</h5>
                            <div class="keywords-list">
                                ${comparison.keywords.unique_to_your_site.slice(0, 15).map(kw => `
                                    <span class="keyword-tag unique-yours">
                                        ${kw.keyword} <small>(${kw.count}x)</small>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${comparison.keywords.unique_to_competitor && comparison.keywords.unique_to_competitor.length > 0 ? `
                        <div class="keyword-group">
                            <h5>Unique to Competitor (${comparison.keywords.unique_to_competitor.length})</h5>
                            <div class="keywords-list">
                                ${comparison.keywords.unique_to_competitor.slice(0, 15).map(kw => `
                                    <span class="keyword-tag unique-competitor">
                                        ${kw.keyword} <small>(${kw.count}x)</small>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Backlink Indicators -->
            ${comparison.backlinks ? `
                <div class="comparison-section">
                    <h3><i class="fas fa-link"></i> Backlink & Social Indicators</h3>
                    <div class="backlink-detailed-grid">
                        <div class="backlink-detailed-item">
                            <h5>Your Site</h5>
                            <div class="backlink-metrics">
                                <p><strong>Backlink Potential Score:</strong> ${comparison.backlinks.your_site?.backlink_potential_score || 0}/100</p>
                                <p><strong>Social Platforms:</strong> ${comparison.backlinks.your_site?.social_count || 0}</p>
                                <p><strong>External Domains:</strong> ${comparison.backlinks.your_site?.external_domains_count || 0}</p>
                                <p><strong>Has Citations:</strong> ${comparison.backlinks.your_site?.has_citations ? '✅ Yes' : '❌ No'}</p>
                                ${comparison.backlinks.your_site?.social_platforms ? `
                                    <div class="social-platforms">
                                        ${Object.entries(comparison.backlinks.your_site.social_platforms).map(([platform, has]) => 
                                            `<span class="social-badge ${has ? 'active' : 'inactive'}">${platform}</span>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="backlink-detailed-item">
                            <h5>Competitor</h5>
                            <div class="backlink-metrics">
                                <p><strong>Backlink Potential Score:</strong> ${comparison.backlinks.competitor?.backlink_potential_score || 0}/100</p>
                                <p><strong>Social Platforms:</strong> ${comparison.backlinks.competitor?.social_count || 0}</p>
                                <p><strong>External Domains:</strong> ${comparison.backlinks.competitor?.external_domains_count || 0}</p>
                                <p><strong>Has Citations:</strong> ${comparison.backlinks.competitor?.has_citations ? '✅ Yes' : '❌ No'}</p>
                                ${comparison.backlinks.competitor?.social_platforms ? `
                                    <div class="social-platforms">
                                        ${Object.entries(comparison.backlinks.competitor.social_platforms).map(([platform, has]) => 
                                            `<span class="social-badge ${has ? 'active' : 'inactive'}">${platform}</span>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Link Analysis - Always Show (NEW FEATURE) -->
            <div class="comparison-section">
                <h3><i class="fas fa-sitemap"></i> Link Analysis</h3>
                <div class="link-analysis-grid">
                    ${yourSite.link_analysis ? `
                        <div class="link-analysis-item">
                            <h4>Your Site</h4>
                            <p><strong>Internal Links:</strong> ${yourSite.link_analysis.link_metrics?.internal_links_count || 0}</p>
                            <p><strong>External Links:</strong> ${yourSite.link_analysis.link_metrics?.external_links_count || 0}</p>
                            ${yourSite.link_analysis.anchor_analysis ? `
                                <p><strong>Keyword-Rich Anchors:</strong> ${yourSite.link_analysis.anchor_analysis.keyword_rich || 0} (${Math.round((yourSite.link_analysis.anchor_analysis.keyword_rich_ratio || 0) * 100)}%)</p>
                                <p><strong>Generic Anchors:</strong> ${yourSite.link_analysis.anchor_analysis.generic || 0}</p>
                            ` : ''}
                        </div>
                    ` : '<div class="link-analysis-item"><p>Link analysis data not available</p></div>'}
                    ${competitor.link_analysis ? `
                        <div class="link-analysis-item">
                            <h4>Competitor</h4>
                            <p><strong>Internal Links:</strong> ${competitor.link_analysis.link_metrics?.internal_links_count || 0}</p>
                            <p><strong>External Links:</strong> ${competitor.link_analysis.link_metrics?.external_links_count || 0}</p>
                            ${competitor.link_analysis.anchor_analysis ? `
                                <p><strong>Keyword-Rich Anchors:</strong> ${competitor.link_analysis.anchor_analysis.keyword_rich || 0} (${Math.round((competitor.link_analysis.anchor_analysis.keyword_rich_ratio || 0) * 100)}%)</p>
                                <p><strong>Generic Anchors:</strong> ${competitor.link_analysis.anchor_analysis.generic || 0}</p>
                            ` : ''}
                        </div>
                    ` : '<div class="link-analysis-item"><p>Link analysis data not available</p></div>'}
                </div>
            </div>
            
            <!-- Enhanced Features: Domain Analysis -->
            ${data.domain_analysis ? `
                <div class="comparison-section domain-analysis-section">
                    <h3><i class="fas fa-sitemap"></i> Domain-Level Analysis</h3>
                    <div class="domain-analysis-grid">
                        <div class="domain-item">
                            <h4>Your Site</h4>
                            <p><strong>Pages Analyzed:</strong> ${data.domain_analysis.your_site?.pages_analyzed || 0}</p>
                            <p><strong>Avg Word Count:</strong> ${Math.round(data.domain_analysis.your_site?.avg_word_count || 0)}</p>
                            <p><strong>Avg SEO Score:</strong> ${Math.round(data.domain_analysis.your_site?.avg_seo_score || 0)}/100</p>
                            <p><strong>Total Internal Links:</strong> ${data.domain_analysis.your_site?.total_internal_links || 0}</p>
                            <p><strong>Total External Links:</strong> ${data.domain_analysis.your_site?.total_external_links || 0}</p>
                        </div>
                        <div class="domain-item">
                            <h4>Competitor</h4>
                            <p><strong>Pages Analyzed:</strong> ${data.domain_analysis.competitor?.pages_analyzed || 0}</p>
                            <p><strong>Avg Word Count:</strong> ${Math.round(data.domain_analysis.competitor?.avg_word_count || 0)}</p>
                            <p><strong>Avg SEO Score:</strong> ${Math.round(data.domain_analysis.competitor?.avg_seo_score || 0)}/100</p>
                            <p><strong>Total Internal Links:</strong> ${data.domain_analysis.competitor?.total_internal_links || 0}</p>
                            <p><strong>Total External Links:</strong> ${data.domain_analysis.competitor?.total_external_links || 0}</p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Content Gaps -->
            ${data.content_gaps ? `
                <div class="comparison-section content-gaps-section">
                    <h3><i class="fas fa-gap"></i> Content Gap Analysis</h3>
                    <div class="content-gaps-grid">
                        <div class="gap-item">
                            <h4>Missing Topics (${data.content_gaps.missing_topics?.length || 0})</h4>
                            <p>Topics competitor covers that you don't:</p>
                            <div class="topic-tags">
                                ${(data.content_gaps.missing_topics || []).slice(0, 15).map(topic => 
                                    `<span class="topic-tag missing">${topic}</span>`
                                ).join('') || '<p>No missing topics found</p>'}
                            </div>
                        </div>
                        <div class="gap-item">
                            <h4>Your Unique Topics (${data.content_gaps.your_unique_topics?.length || 0})</h4>
                            <p>Topics you cover that competitor doesn't:</p>
                            <div class="topic-tags">
                                ${(data.content_gaps.your_unique_topics || []).slice(0, 15).map(topic => 
                                    `<span class="topic-tag unique">${topic}</span>`
                                ).join('') || '<p>No unique topics found</p>'}
                            </div>
                        </div>
                    </div>
                    ${data.content_gaps.opportunities && data.content_gaps.opportunities.length > 0 ? `
                        <div class="content-opportunities">
                            <h4><i class="fas fa-star"></i> Top Content Opportunities</h4>
                            <div class="opportunities-list">
                                ${data.content_gaps.opportunities.slice(0, 10).map(opp => `
                                    <div class="opportunity-item">
                                        <span class="opportunity-topic">${opp.topic}</span>
                                        <span class="opportunity-score">Score: ${Math.round(opp.opportunity_score)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Keyword Opportunities -->
            ${data.keyword_opportunities ? `
                <div class="comparison-section keyword-opportunities-section">
                    <h3><i class="fas fa-key"></i> Keyword Opportunities</h3>
                    <div class="keyword-opportunities-grid">
                        <div class="opportunity-stats">
                            <p><strong>Total Opportunities:</strong> ${data.keyword_opportunities.opportunity_count || 0}</p>
                            <p><strong>Common Keywords:</strong> ${data.keyword_opportunities.common_count || 0}</p>
                        </div>
                        ${data.keyword_opportunities.opportunities && data.keyword_opportunities.opportunities.length > 0 ? `
                            <div class="opportunities-list">
                                <h4>Top Keyword Opportunities</h4>
                                <div class="keyword-opportunities-list">
                                    ${data.keyword_opportunities.opportunities.slice(0, 20).map(kw => `
                                        <div class="keyword-opportunity-item">
                                            <span class="keyword-text">${kw.keyword}</span>
                                            <span class="keyword-metrics">
                                                <span class="badge">Count: ${kw.count}</span>
                                                <span class="badge">Score: ${Math.round(kw.opportunity_score)}</span>
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Internal Linking Comparison -->
            ${data.linking_comparison ? `
                <div class="comparison-section linking-comparison-section">
                    <h3><i class="fas fa-link"></i> Internal Linking Structure</h3>
                    <div class="linking-comparison-grid">
                        <div class="linking-item">
                            <h4>Your Site</h4>
                            <p><strong>Total Links:</strong> ${data.linking_comparison.your_site?.total_links || 0}</p>
                            <p><strong>Avg Links/Page:</strong> ${Math.round(data.linking_comparison.your_site?.avg_links_per_page || 0)}</p>
                            <p><strong>Max Links (Single Page):</strong> ${data.linking_comparison.your_site?.max_links_page || 0}</p>
                        </div>
                        <div class="linking-item">
                            <h4>Competitor</h4>
                            <p><strong>Total Links:</strong> ${data.linking_comparison.competitor?.total_links || 0}</p>
                            <p><strong>Avg Links/Page:</strong> ${Math.round(data.linking_comparison.competitor?.avg_links_per_page || 0)}</p>
                            <p><strong>Max Links (Single Page):</strong> ${data.linking_comparison.competitor?.max_links_page || 0}</p>
                        </div>
                    </div>
                    ${data.linking_comparison.comparison ? `
                        <div class="linking-diff">
                            <p><strong>Link Count Difference:</strong> ${data.linking_comparison.comparison.link_count_diff || 0}</p>
                            <p><strong>Avg Links Difference:</strong> ${Math.round(data.linking_comparison.comparison.avg_links_per_page_diff || 0)}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Content Freshness -->
            ${data.freshness_analysis ? `
                <div class="comparison-section freshness-section">
                    <h3><i class="fas fa-clock"></i> Content Freshness Analysis</h3>
                    <div class="freshness-grid">
                        <div class="freshness-item">
                            <h4>Your Site</h4>
                            <p><strong>Freshness Score:</strong> ${data.freshness_analysis.your_site?.freshness_score || 0}/100</p>
                            <p><strong>Update Indicators:</strong> ${data.freshness_analysis.your_site?.update_indicators || 0}</p>
                            <p><strong>Has Meta Date:</strong> ${data.freshness_analysis.your_site?.has_meta_date ? '✅' : '❌'}</p>
                            <p><strong>Freshness Keywords:</strong> ${data.freshness_analysis.your_site?.freshness_keywords || 0}</p>
                        </div>
                        <div class="freshness-item">
                            <h4>Competitor</h4>
                            <p><strong>Freshness Score:</strong> ${data.freshness_analysis.competitor?.freshness_score || 0}/100</p>
                            <p><strong>Update Indicators:</strong> ${data.freshness_analysis.competitor?.update_indicators || 0}</p>
                            <p><strong>Has Meta Date:</strong> ${data.freshness_analysis.competitor?.has_meta_date ? '✅' : '❌'}</p>
                            <p><strong>Freshness Keywords:</strong> ${data.freshness_analysis.competitor?.freshness_keywords || 0}</p>
                        </div>
                    </div>
                    ${data.freshness_analysis.comparison ? `
                        <div class="freshness-winner">
                            <p><strong>Fresher Content:</strong> ${data.freshness_analysis.comparison.fresher === 'your_site' ? '✅ Your Site' : '⚠️ Competitor'}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Social Signals -->
            ${data.social_signals ? `
                <div class="comparison-section social-signals-section">
                    <h3><i class="fas fa-share-alt"></i> Social Signals Comparison</h3>
                    <div class="social-signals-grid">
                        <div class="social-item">
                            <h4>Your Site</h4>
                            <p><strong>Social Score:</strong> ${data.social_signals.your_site?.social_score || 0}/100</p>
                            <p><strong>Platforms:</strong> ${data.social_signals.your_site?.platform_count || 0}</p>
                            <p><strong>OG Tags:</strong> ${data.social_signals.your_site?.og_tags || 0}</p>
                            <p><strong>Twitter Tags:</strong> ${data.social_signals.your_site?.twitter_tags || 0}</p>
                            ${data.social_signals.your_site?.social_platforms ? `
                                <div class="social-platforms-list">
                                    ${Object.entries(data.social_signals.your_site.social_platforms).map(([platform, has]) => 
                                        `<span class="social-badge ${has ? 'active' : 'inactive'}">${platform}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <div class="social-item">
                            <h4>Competitor</h4>
                            <p><strong>Social Score:</strong> ${data.social_signals.competitor?.social_score || 0}/100</p>
                            <p><strong>Platforms:</strong> ${data.social_signals.competitor?.platform_count || 0}</p>
                            <p><strong>OG Tags:</strong> ${data.social_signals.competitor?.og_tags || 0}</p>
                            <p><strong>Twitter Tags:</strong> ${data.social_signals.competitor?.twitter_tags || 0}</p>
                            ${data.social_signals.competitor?.social_platforms ? `
                                <div class="social-platforms-list">
                                    ${Object.entries(data.social_signals.competitor.social_platforms).map(([platform, has]) => 
                                        `<span class="social-badge ${has ? 'active' : 'inactive'}">${platform}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Competitive Advantage Matrix -->
            ${data.advantage_matrix ? `
                <div class="comparison-section advantage-matrix-section">
                    <h3><i class="fas fa-chart-line"></i> Competitive Advantage Matrix</h3>
                    <div class="advantage-matrix-grid">
                        ${data.advantage_matrix.your_advantages && data.advantage_matrix.your_advantages.length > 0 ? `
                            <div class="advantage-category">
                                <h4><i class="fas fa-check-circle"></i> Your Advantages</h4>
                                <div class="advantage-tags">
                                    ${data.advantage_matrix.your_advantages.map(adv => 
                                        `<span class="advantage-tag positive">${adv}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${data.advantage_matrix.competitor_advantages && data.advantage_matrix.competitor_advantages.length > 0 ? `
                            <div class="advantage-category">
                                <h4><i class="fas fa-exclamation-circle"></i> Competitor Advantages</h4>
                                <div class="advantage-tags">
                                    ${data.advantage_matrix.competitor_advantages.map(adv => 
                                        `<span class="advantage-tag negative">${adv}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${data.advantage_matrix.opportunities && data.advantage_matrix.opportunities.length > 0 ? `
                            <div class="advantage-category">
                                <h4><i class="fas fa-lightbulb"></i> Opportunities</h4>
                                <div class="opportunities-list">
                                    ${data.advantage_matrix.opportunities.map(opp => `
                                        <div class="opportunity-card ${opp.priority}">
                                            <span class="priority-badge ${opp.priority}">${opp.priority}</span>
                                            <strong>${opp.category}</strong>
                                            <p>${opp.description}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Enhanced Features: Prioritized Action Plan -->
            ${data.action_plan && data.action_plan.length > 0 ? `
                <div class="comparison-section action-plan-section">
                    <h3><i class="fas fa-tasks"></i> Prioritized Action Plan</h3>
                    <div class="action-plan-list">
                        ${data.action_plan.map((action, index) => `
                            <div class="action-item priority-${action.priority}">
                                <div class="action-header">
                                    <span class="action-number">${index + 1}</span>
                                    <span class="priority-badge ${action.priority}">${action.priority.toUpperCase()}</span>
                                    <strong>${action.category}</strong>
                                </div>
                                <div class="action-body">
                                    <p class="action-text"><strong>Action:</strong> ${action.action}</p>
                                    <p class="action-reason"><strong>Reason:</strong> ${action.reason}</p>
                                    <div class="action-meta">
                                        <span class="meta-badge">Impact: ${action.estimated_impact}</span>
                                        <span class="meta-badge">Effort: ${action.effort}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Accessibility - Always Show -->
            <div class="comparison-section">
                <h3><i class="fas fa-universal-access"></i> Accessibility Analysis</h3>
                <div class="accessibility-grid">
                    ${yourSite.accessibility ? `
                        <div class="accessibility-item">
                            <h4>Your Site</h4>
                            <div class="accessibility-score">
                                <div class="score-circle-large" style="background: ${getScoreColor(yourSite.accessibility.wcag_score || 0)}">
                                    <span class="score-large">${yourSite.accessibility.wcag_score || 0}</span>
                                </div>
                                <p>WCAG ${yourSite.accessibility.wcag_level || 'N/A'}</p>
                            </div>
                            <p><strong>Image Alt Coverage:</strong> ${yourSite.accessibility.image_analysis?.alt_coverage || 0}%</p>
                            <p><strong>Form Label Coverage:</strong> ${yourSite.accessibility.form_analysis?.label_coverage || 0}%</p>
                            <p><strong>Semantic HTML Score:</strong> ${yourSite.accessibility.semantic_analysis?.score || 0}/100</p>
                        </div>
                    ` : '<div class="accessibility-item"><p>Accessibility data not available</p></div>'}
                    ${competitor.accessibility ? `
                        <div class="accessibility-item">
                            <h4>Competitor</h4>
                            <div class="accessibility-score">
                                <div class="score-circle-large" style="background: ${getScoreColor(competitor.accessibility.wcag_score || 0)}">
                                    <span class="score-large">${competitor.accessibility.wcag_score || 0}</span>
                                </div>
                                <p>WCAG ${competitor.accessibility.wcag_level || 'N/A'}</p>
                            </div>
                            <p><strong>Image Alt Coverage:</strong> ${competitor.accessibility.image_analysis?.alt_coverage || 0}%</p>
                            <p><strong>Form Label Coverage:</strong> ${competitor.accessibility.form_analysis?.label_coverage || 0}%</p>
                            <p><strong>Semantic HTML Score:</strong> ${competitor.accessibility.semantic_analysis?.score || 0}/100</p>
                        </div>
                    ` : '<div class="accessibility-item"><p>Accessibility data not available</p></div>'}
                </div>
            </div>
            
            <!-- Export Buttons -->
            <div class="comparison-section" style="text-align: center; padding: 20px;">
                <h3><i class="fas fa-download"></i> Export Results</h3>
                <div class="export-buttons">
                    <button class="btn btn-secondary" onclick="exportAnalysis('csv', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-csv"></i> Export CSV
                    </button>
                    <button class="btn btn-secondary" onclick="exportAnalysis('json', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-code"></i> Export JSON
                    </button>
                    <button class="btn btn-secondary" onclick="exportAnalysis('txt', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-alt"></i> Export Report
                    </button>
                </div>
            </div>
            
            <!-- Google PageSpeed Insights -->
            ${yourSite.pagespeed_mobile || competitor.pagespeed_mobile ? `
                <div class="comparison-section">
                    <h3><i class="fas fa-tachometer-alt"></i> Google PageSpeed Insights</h3>
                    <div class="pagespeed-grid">
                        ${yourSite.pagespeed_mobile && !yourSite.pagespeed_mobile.has_error ? `
                            <div class="pagespeed-card">
                                <h4>Your Site - Mobile</h4>
                                <div class="pagespeed-scores">
                                    <div class="score-item">
                                        <span class="score-label">Performance</span>
                                        <div class="score-circle" style="background: ${getScoreColor(yourSite.pagespeed_mobile.scores.performance)}">
                                            ${yourSite.pagespeed_mobile.scores.performance}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">Accessibility</span>
                                        <div class="score-circle" style="background: ${getScoreColor(yourSite.pagespeed_mobile.scores.accessibility)}">
                                            ${yourSite.pagespeed_mobile.scores.accessibility}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">Best Practices</span>
                                        <div class="score-circle" style="background: ${getScoreColor(yourSite.pagespeed_mobile.scores.best_practices)}">
                                            ${yourSite.pagespeed_mobile.scores.best_practices}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">SEO</span>
                                        <div class="score-circle" style="background: ${getScoreColor(yourSite.pagespeed_mobile.scores.seo)}">
                                            ${yourSite.pagespeed_mobile.scores.seo}
                                        </div>
                                    </div>
                                </div>
                                ${yourSite.pagespeed_mobile.core_web_vitals ? `
                                    <div class="core-web-vitals">
                                        <h5>Core Web Vitals</h5>
                                        <p>LCP: ${yourSite.pagespeed_mobile.core_web_vitals.lcp.value}s (${yourSite.pagespeed_mobile.core_web_vitals.lcp.category})</p>
                                        <p>FID: ${yourSite.pagespeed_mobile.core_web_vitals.fid.value}s (${yourSite.pagespeed_mobile.core_web_vitals.fid.category})</p>
                                        <p>CLS: ${yourSite.pagespeed_mobile.core_web_vitals.cls.value} (${yourSite.pagespeed_mobile.core_web_vitals.cls.category})</p>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        ${competitor.pagespeed_mobile && !competitor.pagespeed_mobile.has_error ? `
                            <div class="pagespeed-card">
                                <h4>Competitor - Mobile</h4>
                                <div class="pagespeed-scores">
                                    <div class="score-item">
                                        <span class="score-label">Performance</span>
                                        <div class="score-circle" style="background: ${getScoreColor(competitor.pagespeed_mobile.scores.performance)}">
                                            ${competitor.pagespeed_mobile.scores.performance}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">Accessibility</span>
                                        <div class="score-circle" style="background: ${getScoreColor(competitor.pagespeed_mobile.scores.accessibility)}">
                                            ${competitor.pagespeed_mobile.scores.accessibility}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">Best Practices</span>
                                        <div class="score-circle" style="background: ${getScoreColor(competitor.pagespeed_mobile.scores.best_practices)}">
                                            ${competitor.pagespeed_mobile.scores.best_practices}
                                        </div>
                                    </div>
                                    <div class="score-item">
                                        <span class="score-label">SEO</span>
                                        <div class="score-circle" style="background: ${getScoreColor(competitor.pagespeed_mobile.scores.seo)}">
                                            ${competitor.pagespeed_mobile.scores.seo}
                                        </div>
                                    </div>
                                </div>
                                ${competitor.pagespeed_mobile.core_web_vitals ? `
                                    <div class="core-web-vitals">
                                        <h5>Core Web Vitals</h5>
                                        <p>LCP: ${competitor.pagespeed_mobile.core_web_vitals.lcp.value}s (${competitor.pagespeed_mobile.core_web_vitals.lcp.category})</p>
                                        <p>FID: ${competitor.pagespeed_mobile.core_web_vitals.fid.value}s (${competitor.pagespeed_mobile.core_web_vitals.fid.category})</p>
                                        <p>CLS: ${competitor.pagespeed_mobile.core_web_vitals.cls.value} (${competitor.pagespeed_mobile.core_web_vitals.cls.category})</p>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Visual Screenshots -->
            ${yourSite.desktop_screenshot && competitor.desktop_screenshot && 
              !yourSite.desktop_screenshot.has_error && !competitor.desktop_screenshot.has_error ? `
                <div class="comparison-section">
                    <h3><i class="fas fa-image"></i> Visual Comparison</h3>
                    <div class="screenshot-comparison">
                        <div class="screenshot-item">
                            <h4>Your Site</h4>
                            <img src="data:image/png;base64,${yourSite.desktop_screenshot.screenshot}" 
                                 alt="Your site screenshot" 
                                 class="screenshot-image"
                                 onclick="openScreenshotModal('data:image/png;base64,${yourSite.desktop_screenshot.screenshot}', 'Your Site')">
                        </div>
                        <div class="screenshot-item">
                            <h4>Competitor</h4>
                            <img src="data:image/png;base64,${competitor.desktop_screenshot.screenshot}" 
                                 alt="Competitor screenshot" 
                                 class="screenshot-image"
                                 onclick="openScreenshotModal('data:image/png;base64,${competitor.desktop_screenshot.screenshot}', 'Competitor')">
                        </div>
                    </div>
                    ${data.visual_comparison && !data.visual_comparison.has_error ? `
                        <p class="visual-similarity">
                            Visual Similarity: ${data.visual_comparison.similarity_percentage}%
                        </p>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Helper function for score colors
function getScoreColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 50) return '#ffc107';
    return '#dc3545';
}

// Export analysis
async function exportAnalysis(format, data) {
    try {
        const response = await fetch('/api/export-competitor-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: data,
                format: format
            })
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `competitor_analysis.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
    }
}

// Screenshot modal
function openScreenshotModal(imageSrc, title) {
    const modal = document.createElement('div');
    modal.className = 'screenshot-modal';
    modal.innerHTML = `
        <div class="screenshot-modal-content">
            <span class="screenshot-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>${title}</h3>
            <img src="${imageSrc}" alt="${title}" style="max-width: 100%; height: auto;">
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
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
    startBtn.innerHTML = `
        <div class="spider-crawl-3d-container">
            <div class="mock-website-3d">
                <div class="mock-header">
                    <div class="mock-logo"></div>
                    <div class="mock-nav">
                        <div class="mock-nav-item"></div>
                        <div class="mock-nav-item"></div>
                        <div class="mock-nav-item"></div>
                    </div>
                </div>
                <div class="mock-content">
                    <div class="mock-title-line"></div>
                    <div class="mock-text-line"></div>
                    <div class="mock-text-line short"></div>
                    <div class="mock-content-box"></div>
                    <div class="mock-content-box small"></div>
                </div>
                <div class="mock-footer"></div>
            </div>
            <div class="spider-3d">
                <i class="fas fa-spider"></i>
            </div>
            <div class="crawling-text-3d">
                <span class="crawling-word">Analyzing</span>
                <span class="crawling-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </span>
            </div>
            <div class="web-lines">
                <div class="web-line web-line-1"></div>
                <div class="web-line web-line-2"></div>
                <div class="web-line web-line-3"></div>
                <div class="web-line web-line-4"></div>
            </div>
        </div>
    `;
    
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
                clear_cache: document.getElementById('clear_cache').checked,
                // Analysis configuration
                enable_performance_analysis: document.getElementById('enable_performance_analysis').checked,
                store_html_content: document.getElementById('store_html_content').checked,
                enable_similarity_during_crawl: document.getElementById('enable_similarity_during_crawl').checked,
                max_similarity_comparisons: parseInt(document.getElementById('max_similarity_comparisons').value) || 100,
                crawl_speed: document.getElementById('crawl_speed').value || 'balanced'
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
            startBtn.innerHTML = `
                <div class="btn-start-content">
                    <i class="fas fa-rocket"></i>
                    <span class="btn-start-text">Start Crawling</span>
                    <i class="fas fa-arrow-right btn-start-arrow"></i>
                </div>
                <div class="btn-start-glow"></div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error starting crawl: ' + error.message);
        startBtn.disabled = false;
        startBtn.innerHTML = `
            <div class="btn-start-content">
                <i class="fas fa-rocket"></i>
                <span class="btn-start-text">Start Crawling</span>
                <i class="fas fa-arrow-right btn-start-arrow"></i>
            </div>
            <div class="btn-start-glow"></div>
        `;
    }
}

// Show progress card
function showProgressCard() {
    // Hide completion section when starting new crawl
    const completionSection = document.getElementById('progressCompletionSection');
    if (completionSection) {
        completionSection.style.display = 'none';
    }
    
    document.getElementById('progressCard').style.display = 'block';
    document.getElementById('resultsCard').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    
    // Top progress bar removed - no longer needed
    
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
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = progress + '%';
    
    // Top progress bar removed - no longer needed
    
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
        
        // Show discovered URLs if available
        if (data.discovered_urls !== undefined && data.discovered_urls > 0) {
            const discoveredInfo = document.getElementById('discoveredPagesInfo');
            const discoveredCount = document.getElementById('discoveredPagesCount');
            if (discoveredInfo && discoveredCount) {
                discoveredInfo.style.display = 'inline';
                discoveredCount.textContent = data.discovered_urls;
            }
        }
        
        // Show pages per second
        if (data.pages_per_second !== undefined) {
            const pagesPerSecondEl = document.getElementById('pagesPerSecond');
            if (pagesPerSecondEl) {
                pagesPerSecondEl.textContent = data.pages_per_second.toFixed(2);
            }
        }
        
        // Show average links per page
        if (data.avg_links_per_page !== undefined) {
            const avgLinksEl = document.getElementById('avgLinksPerPage');
            if (avgLinksEl) {
                avgLinksEl.textContent = data.avg_links_per_page.toFixed(1);
            }
        }
        
        // Show elapsed time
        if (data.elapsed_time !== undefined) {
            const elapsedTimeEl = document.getElementById('elapsedTime');
            if (elapsedTimeEl) {
                elapsedTimeEl.textContent = data.elapsed_time;
            }
        }
        
        // Show estimated time remaining
        if (data.estimated_time_remaining !== undefined) {
            const estimatedTimeEl = document.getElementById('estimatedTimeRemaining');
            if (estimatedTimeEl) {
                estimatedTimeEl.textContent = data.estimated_time_remaining;
            }
        }
        
        // Top progress bar stats removed - no longer needed
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
        
        // Top progress bar removed - no longer needed
    } else {
        errorContainer.style.display = 'none';
    }
    
    // Handle completion
    if (data.status === 'completed') {
        if (loadingIcon) loadingIcon.style.display = 'none';
        
        // Update progress to 100%
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        // Update progress message
        const progressMessageText = document.getElementById('progressMessageText');
        if (progressMessageText) {
            progressMessageText.textContent = 'Crawl Completed!';
        }
        
        // Show completion section with View Results button
        const completionSection = document.getElementById('progressCompletionSection');
        if (completionSection) {
            completionSection.style.display = 'block';
            // Link the button to results page
            const viewResultsBtnProgress = document.getElementById('viewResultsBtnProgress');
            if (viewResultsBtnProgress && data.job_id) {
                viewResultsBtnProgress.href = `/results/${data.job_id}`;
            }
        }
        
        // Reset button state
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = `
                <div class="btn-start-content">
                    <i class="fas fa-rocket"></i>
                    <span class="btn-start-text">Start Crawling</span>
                    <i class="fas fa-arrow-right btn-start-arrow"></i>
                </div>
                <div class="btn-start-glow"></div>
            `;
        }
        
        // Also show the results card below (for download buttons)
        setTimeout(() => {
            showResultsCard(data.job_id);
        }, 1000);
    }
    
    // Handle errors - also reset button
    if (data.status === 'error') {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = `
                <div class="btn-start-content">
                    <i class="fas fa-rocket"></i>
                    <span class="btn-start-text">Start Crawling</span>
                    <i class="fas fa-arrow-right btn-start-arrow"></i>
                </div>
                <div class="btn-start-glow"></div>
            `;
        }
    }
}

// Show results card
function showResultsCard(jobId) {
    // Keep progress card visible (don't hide it) so the View Results button stays visible
    // Just show the results card below for download options
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

