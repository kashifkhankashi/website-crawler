// Authentication JavaScript

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthStatus();
    
    // Set up login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Check if user is authenticated
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/check-auth', {
            method: 'GET',
            credentials: 'include' // Important for session cookies
        });
        
        const data = await response.json();
        
        if (data.authenticated) {
            // User is authenticated, show main content
            showMainContent();
        } else {
            // User is not authenticated, show login modal
            showLoginModal();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // On error, show login modal to be safe
        showLoginModal();
    }
}

// Show login modal
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const mainContent = document.getElementById('mainContent');
    const competitorCard = document.getElementById('competitorCard');
    const topNavbar = document.getElementById('topNavbar');
    
    if (loginModal) {
        loginModal.style.display = 'flex';
    }
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    if (competitorCard) {
        competitorCard.style.display = 'none';
    }
    if (topNavbar) {
        topNavbar.style.display = 'none';
    }
}

// Hide login modal and show main content
function showMainContent() {
    const loginModal = document.getElementById('loginModal');
    const mainContent = document.getElementById('mainContent');
    const topNavbar = document.getElementById('topNavbar');
    const historyCard = document.getElementById('historyCard');
    const startNewCrawlCard = document.getElementById('startNewCrawlCard');
    
    if (loginModal) {
        loginModal.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    if (topNavbar) {
        topNavbar.style.display = 'block';
    }
    if (historyCard) {
        historyCard.style.display = 'none';
    }
    if (startNewCrawlCard) {
        startNewCrawlCard.style.display = 'block';
    }
    
    // Update active nav item
    if (typeof updateActiveNavItem === 'function') {
        updateActiveNavItem('nav-start-crawl');
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    
    // Get form values
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Clear previous errors
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
    
    // Validate inputs
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }
    
    // Disable submit button and show loading state
    if (submitButton) {
        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        
        try {
            // Send login request
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for session cookies
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Login successful
                showMainContent();
                
                // Clear form
                usernameInput.value = '';
                passwordInput.value = '';
            } else {
                // Login failed
                showLoginError(data.error || 'Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            showLoginError('Login failed. Please try again.');
        } finally {
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        }
    }
}

// Show login error message
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show login modal
            showLoginModal();
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Still show login modal even if logout request fails
        showLoginModal();
    }
}

// Export functions for use in other scripts
window.checkAuthStatus = checkAuthStatus;
window.handleLogout = handleLogout;
window.showLoginModal = showLoginModal;
window.showMainContent = showMainContent;
