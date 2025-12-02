// Authentication JavaScript

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();
        
        if (data.authenticated) {
            // User is authenticated, show main content
            showMainContent();
        } else {
            // User is not authenticated, show login modal
            showLoginModal();
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, show login modal
        showLoginModal();
    }
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    const mainContent = document.getElementById('mainContent');
    
    if (modal) {
        modal.style.display = 'flex';
    }
    if (mainContent) {
        mainContent.style.display = 'none';
    }
}

// Show main content
function showMainContent() {
    const modal = document.getElementById('loginModal');
    const mainContent = document.getElementById('mainContent');
    
    if (modal) {
        modal.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            // Hide previous errors
            if (loginError) {
                loginError.style.display = 'none';
                loginError.textContent = '';
            }
            
            // Disable submit button
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Login successful
                    showMainContent();
                } else {
                    // Login failed
                    if (loginError) {
                        loginError.textContent = data.error || 'Invalid username or password';
                        loginError.style.display = 'block';
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Login error:', error);
                if (loginError) {
                    loginError.textContent = 'An error occurred. Please try again.';
                    loginError.style.display = 'block';
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});

// Logout function (can be called from anywhere)
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showLoginModal();
            // Clear any form data
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.reset();
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}


