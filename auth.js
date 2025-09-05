// auth.js - Authentication functionality
const API_BASE_URL = 'http://localhost:8000';

// Authentication state management
let isFormSwitchAnimating = false;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleButton = document.getElementById('toggleButton');
const toggleText = document.getElementById('toggleText');
const brandTitle = document.getElementById('brandTitle');
const brandSubtitle = document.getElementById('brandSubtitle');

// Password toggle elements
const loginPasswordToggle = document.getElementById('loginPasswordToggle');
const registerPasswordToggle = document.getElementById('registerPasswordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

// Initialize authentication module
document.addEventListener('DOMContentLoaded', function() {
    setupAuthEventListeners();
    setupPasswordToggles();
    setupPasswordStrength();
    checkExistingAuth();
});

// Check if user is already authenticated
function checkExistingAuth() {
    const token = getToken();
    if (token) {
        // Verify token is still valid
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                redirectToLibrary();
            } else {
                clearToken();
            }
        })
        .catch(error => {
            console.error('Token verification failed:', error);
            clearToken();
        });
    }
}

// Setup event listeners for authentication
function setupAuthEventListeners() {
    // Form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Form toggle
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleForms);
    }
    
    // Real-time validation
    setupRealTimeValidation();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleAuthKeyboard);
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitButton = document.getElementById('loginButton');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Clear previous errors
    clearFieldErrors();
    
    // Validate inputs
    if (!validateLoginForm(email, password)) {
        return;
    }
    
    try {
        setButtonLoading(submitButton, true);
        
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }
        
        // Store token
        storeToken(data.access_token);
        
        // Show success message
        showAuthSuccess('Login successful! Redirecting...');
        
        // Redirect to library
        setTimeout(() => {
            redirectToLibrary();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showAuthError(error.message || 'Login failed. Please check your credentials.');
        
        // Highlight error fields
        if (error.message.includes('credentials')) {
            highlightFieldError('loginEmail');
            highlightFieldError('loginPassword');
        }
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Handle registration form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');
    const submitButton = document.getElementById('registerButton');
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const agreeTerms = agreeTermsInput.checked;
    
    // Clear previous errors
    clearFieldErrors();
    
    // Validate inputs
    if (!validateRegisterForm(name, email, password, confirmPassword, agreeTerms)) {
        return;
    }
    
    try {
        setButtonLoading(submitButton, true);
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: 'member'
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }
        
        // Show success message
        showAuthSuccess('Registration successful! Please log in with your new account.');
        
        // Reset form and switch to login
        registerForm.reset();
        updatePasswordStrength('');
        
        setTimeout(() => {
            if (!isCurrentlyLoginForm()) {
                toggleForms();
            }
        }, 1500);
        
    } catch (error) {
        console.error('Registration error:', error);
        showAuthError(error.message || 'Registration failed. Please try again.');
        
        // Highlight specific error fields
        if (error.message.includes('email')) {
            highlightFieldError('registerEmail');
        }
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Form validation functions
function validateLoginForm(email, password) {
    let isValid = true;
    
    if (!email) {
        showFieldError('loginEmailError', 'Email is required');
        highlightFieldError('loginEmail');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('loginEmailError', 'Please enter a valid email address');
        highlightFieldError('loginEmail');
        isValid = false;
    }
    
    if (!password) {
        showFieldError('loginPasswordError', 'Password is required');
        highlightFieldError('loginPassword');
        isValid = false;
    }
    
    return isValid;
}

function validateRegisterForm(name, email, password, confirmPassword, agreeTerms) {
    let isValid = true;
    
    if (!name || name.length < 2) {
        showFieldError('registerNameError', 'Name must be at least 2 characters long');
        highlightFieldError('registerName');
        isValid = false;
    }
    
    if (!email) {
        showFieldError('registerEmailError', 'Email is required');
        highlightFieldError('registerEmail');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('registerEmailError', 'Please enter a valid email address');
        highlightFieldError('registerEmail');
        isValid = false;
    }
    
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        showFieldError('registerPasswordError', passwordValidation.message);
        highlightFieldError('registerPassword');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showFieldError('confirmPasswordError', 'Passwords do not match');
        highlightFieldError('confirmPassword');
        isValid = false;
    }
    
    if (!agreeTerms) {
        showAuthError('Please agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    return isValid;
}

// Real-time validation setup
function setupRealTimeValidation() {
    // Email validation
    const emailInputs = ['loginEmail', 'registerEmail'];
    emailInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', () => validateEmailField(input, inputId));
            input.addEventListener('input', () => clearFieldError(inputId));
        }
    });
    
    // Password validation
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrength(passwordInput.value);
            clearFieldError('registerPassword');
        });
    }
    
    // Confirm password validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            const password = document.getElementById('registerPassword').value;
            if (confirmPasswordInput.value && confirmPasswordInput.value !== password) {
                showFieldError('confirmPasswordError', 'Passwords do not match');
                highlightFieldError('confirmPassword');
            } else {
                clearFieldError('confirmPassword');
            }
        });
    }
    
    // Name validation
    const nameInput = document.getElementById('registerName');
    if (nameInput) {
        nameInput.addEventListener('blur', () => {
            if (nameInput.value.trim().length < 2) {
                showFieldError('registerNameError', 'Name must be at least 2 characters long');
                highlightFieldError('registerName');
            }
        });
        nameInput.addEventListener('input', () => clearFieldError('registerName'));
    }
}

function validateEmailField(input, inputId) {
    const email = input.value.trim();
    const errorId = inputId + 'Error';
    
    if (email && !isValidEmail(email)) {
        showFieldError(errorId, 'Please enter a valid email address');
        highlightFieldError(inputId);
    } else {
        clearFieldError(inputId);
    }
}

// Password strength checker
function setupPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }
}

function validatePasswordStrength(password) {
    if (!password) {
        return { isValid: false, message: 'Password is required', strength: 0 };
    }
    
    if (password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long', strength: 1 };
    }
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) strength++;
    else feedback.push('at least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength++;
    else feedback.push('lowercase letter');
    
    // Number check
    if (/\d/.test(password)) strength++;
    else feedback.push('number');
    
    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    else feedback.push('special character');
    
    if (strength >= 3) {
        return { isValid: true, message: 'Strong password', strength };
    } else {
        const missing = feedback.slice(0, 2).join(' and ');
        return { 
            isValid: strength >= 2, 
            message: `Add ${missing} for better security`, 
            strength 
        };
    }
}

function updatePasswordStrength(password) {
    const strengthContainer = document.getElementById('passwordStrength');
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthContainer || !strengthText) return;
    
    const result = validatePasswordStrength(password);
    const strength = result.strength;
    
    // Update strength bars
    strengthBars.forEach((bar, index) => {
        bar.className = 'strength-bar';
        if (index < strength) {
            if (strength <= 2) bar.classList.add('weak');
            else if (strength <= 3) bar.classList.add('medium');
            else bar.classList.add('strong');
        }
    });
    
    // Update strength text
    if (!password) {
        strengthText.textContent = '';
        strengthContainer.style.opacity = '0';
    } else {
        strengthText.textContent = result.message;
        strengthContainer.style.opacity = '1';
        
        strengthText.className = 'strength-text';
        if (strength <= 2) strengthText.classList.add('weak');
        else if (strength <= 3) strengthText.classList.add('medium');
        else strengthText.classList.add('strong');
    }
}

// Password toggle functionality
function setupPasswordToggles() {
    const toggles = [
        { toggle: loginPasswordToggle, input: 'loginPassword' },
        { toggle: registerPasswordToggle, input: 'registerPassword' },
        { toggle: confirmPasswordToggle, input: 'confirmPassword' }
    ];
    
    toggles.forEach(({ toggle, input }) => {
        if (toggle) {
            toggle.addEventListener('click', () => togglePasswordVisibility(input, toggle));
        }
    });
}

function togglePasswordVisibility(inputId, toggleButton) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput || !toggleButton) return;
    
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    // Update icon
    const icon = toggleButton.querySelector('.eye-icon');
    if (icon) {
        if (isPassword) {
            // Show "eye-off" icon
            icon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                <path d="M1 1l22 22"/>
            `;
        } else {
            // Show "eye" icon
            icon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    }
}

// Form switching
function toggleForms() {
    if (isFormSwitchAnimating) return;
    
    isFormSwitchAnimating = true;
    const isCurrentlyLogin = isCurrentlyLoginForm();
    
    // Clear any existing errors
    clearFieldErrors();
    
    if (isCurrentlyLogin) {
        // Switch to register
        switchToRegister();
    } else {
        // Switch to login
        switchToLogin();
    }
    
    setTimeout(() => {
        isFormSwitchAnimating = false;
    }, 500);
}

function isCurrentlyLoginForm() {
    return loginForm && loginForm.classList.contains('active');
}

function switchToLogin() {
    if (brandTitle) brandTitle.textContent = 'Welcome Back';
    if (brandSubtitle) brandSubtitle.textContent = 'Sign in to your library account';
    
    if (loginForm) loginForm.classList.add('active');
    if (registerForm) registerForm.classList.remove('active');
    
    if (toggleText) toggleText.textContent = "Don't have an account?";
    if (toggleButton) toggleButton.textContent = 'Sign up';
    
    // Clear forms
    if (registerForm) registerForm.reset();
    updatePasswordStrength('');
}

function switchToRegister() {
    if (brandTitle) brandTitle.textContent = 'Create Account';
    if (brandSubtitle) brandSubtitle.textContent = 'Join our library community';
    
    if (registerForm) registerForm.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    
    if (toggleText) toggleText.textContent = 'Already have an account?';
    if (toggleButton) toggleButton.textContent = 'Sign in';
    
    // Clear forms
    if (loginForm) loginForm.reset();
}

// Error handling
function showFieldError(errorElementId, message) {
    const errorElement = document.getElementById(errorElementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearFieldError(inputId) {
    const errorElement = document.getElementById(inputId + 'Error');
    const inputElement = document.getElementById(inputId);
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function clearFieldErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
    
    const inputElements = document.querySelectorAll('.auth-input');
    inputElements.forEach(element => {
        element.classList.remove('error');
    });
}

function highlightFieldError(inputId) {
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
        inputElement.classList.add('error');
    }
}

// Success and error notifications
function showAuthSuccess(message) {
    showAuthNotification(message, 'success');
}

function showAuthError(message) {
    showAuthNotification(message, 'error');
}

function showAuthNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.auth-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${type === 'success' ? '✓' : '✕'}
            </div>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add styles dynamically
    if (!document.getElementById('auth-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'auth-notification-styles';
        styles.textContent = `
            .auth-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideInRight 0.3s ease;
                max-width: 400px;
                font-family: 'Inter', sans-serif;
            }
            
            .auth-notification.success {
                background-color: #10b981;
                color: white;
            }
            
            .auth-notification.error {
                background-color: #ef4444;
                color: white;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .notification-icon {
                font-weight: bold;
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .notification-message {
                font-size: 14px;
                line-height: 1.4;
            }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .auth-input.error {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 1px #ef4444 !important;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Button loading state
function setButtonLoading(button, loading) {
    if (!button) return;
    
    const btnText = button.querySelector('.button-text');
    const loadingSpinner = button.querySelector('.loading-spinner');
    
    if (loading) {
        if (btnText) btnText.style.display = 'none';
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        button.disabled = true;
        button.style.cursor = 'not-allowed';
    } else {
        if (btnText) btnText.style.display = 'block';
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        button.disabled = false;
        button.style.cursor = 'pointer';
    }
}

// Token management
function storeToken(token) {
    localStorage.setItem('authToken', token);
    window.authToken = token;
}

function getToken() {
    return window.authToken || localStorage.getItem('authToken');
}

function clearToken() {
    localStorage.removeItem('authToken');
    window.authToken = null;
}

// Navigation
function redirectToLibrary() {
    window.location.href = 'library/library.html';
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Keyboard shortcuts
function handleAuthKeyboard(e) {
    // Enter key in forms
    if (e.key === 'Enter') {
        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            e.preventDefault();
            const submitButton = activeForm.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                submitButton.click();
            }
        }
    }
    
    // Tab switching with Ctrl+Tab
    if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        toggleForms();
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validatePasswordStrength,
        isValidEmail,
        validateLoginForm,
        validateRegisterForm
    };
}

console.log('Authentication module loaded successfully');