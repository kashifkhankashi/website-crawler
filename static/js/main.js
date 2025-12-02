// Main JavaScript for the crawler interface

let socket;
let currentJobId = null;

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
    const outputDir = document.getElementById('output_dir').value;
    const startBtn = document.getElementById('startBtn');
    
    // Disable button
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    
    try {
        const response = await fetch('/api/start-crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                max_depth: parseInt(maxDepth),
                output_dir: outputDir,
                clear_cache: document.getElementById('clear_cache').checked
            })
        });
        
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
    document.getElementById('progressMessage').textContent = 'Initializing...';
}

// Update progress
function updateProgress(data) {
    if (data.job_id !== currentJobId) return;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressMessage = document.getElementById('progressMessage');
    const stats = document.getElementById('stats');
    const errorContainer = document.getElementById('errorContainer');
    
    // Update progress bar
    const progress = data.progress || 0;
    progressFill.style.width = progress + '%';
    progressText.textContent = progress + '%';
    
    // Update message
    if (data.message) {
        progressMessage.textContent = data.message;
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
    }
    
    // Handle errors
    if (data.status === 'error') {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = '<strong>Error:</strong> ' + data.message;
    } else {
        errorContainer.style.display = 'none';
    }
    
    // Handle completion
    if (data.status === 'completed') {
        setTimeout(() => {
            showResultsCard(data.job_id);
        }, 1000);
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
    const progressMessage = document.getElementById('progressMessage');
    if (progressMessage) {
        progressMessage.textContent = message;
        progressMessage.style.color = '#dc3545';
    }
    
    // Hide progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = 'Error';
    }
}

