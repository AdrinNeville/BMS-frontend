// Authentication JavaScript
const API_BASE_URL = 'http://localhost:8000';

// DOM Elements
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Initialize authentication page
document.addEventListener('DOMContentLoaded', function() {
    setupAuthTabs();
    setupAuthForms();
    checkExistingAuth();
});

// Setup tab switching
function setupAuthTabs() {
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
}

function switchAuthTab(tabName) {
    // Update tab buttons
    authTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update forms
    authForms.forEach(form => {
        if (form.id === `${tabName}Form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
}

// Setup form submissions
function setupAuthForms() {
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!validateEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (!password) {
        showError('Please enter your password');
        return;
    }
    
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnSpinner = submitButton.querySelector('.btn-spinner');
    
    try {
        // Set loading state
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        submitButton.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }
        
        // Store token and redirect
        localStorage.setItem('authToken', data.access_token);
        showSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please try again.');
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const name = formData.get('name').trim();
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Validation
    if (!name || name.length < 2) {
        showError('Please enter a valid name (at least 2 characters)');
        return;
    }
    
    if (!validateEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (!validatePassword(password)) {
        showError('Password must be at least 6 characters with letters and numbers');
        return;
    }
    
    const submitButton = registerForm.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnSpinner = submitButton.querySelector('.btn-spinner');
    
    try {
        // Set loading state
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        submitButton.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }
        
        showSuccess('Account created successfully! Please sign in.');
        
        // Switch to login tab and fill email
        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginEmail').focus();
        }, 1000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'Registration failed. Please try again.');
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Check if user is already authenticated
function checkExistingAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token is still valid
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = 'app.html';
            } else {
                localStorage.removeItem('authToken');
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
        });
    }
}

// Demo account functions
window.fillDemoAdmin = function() {
    document.getElementById('loginEmail').value = 'admin@library.com';
    document.getElementById('loginPassword').value = 'admin123';
    switchAuthTab('login');
};

window.fillDemoUser = function() {
    document.getElementById('loginEmail').value = 'user@library.com';
    document.getElementById('loginPassword').value = 'user123';
    switchAuthTab('login');
};

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 6 characters with at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
}

// Notification functions
function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${iconMap[type] || iconMap.info}</div>
            <div class="notification-message">${escapeHtml(message)}</div>
            <button class="notification-close" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 12px;
    `;
    
    notification.querySelector('.notification-icon').style.cssText = `
        font-weight: bold;
        font-size: 16px;
        flex-shrink: 0;
        margin-top: 1px;
    `;
    
    notification.querySelector('.notification-message').style.cssText = `
        flex: 1;
        line-height: 1.4;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
    `;
    
    // Add close functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

console.log('Authentication module loaded successfully');