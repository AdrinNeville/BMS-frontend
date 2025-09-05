// app.js - Main application entry point
import { getToken, clearToken, makeAPIRequest, showNotification, escapeHtml, debounce } from './utils.js';
import { initializeBooksModule, loadBooks } from './books.js';
import { initializeBorrowModule, loadBorrowedBooks } from './borrow.js';
import { initializeAdminModule, loadUsers } from './admin.js';
import { initializeReportsModule, loadReports } from './reports.js';

// Global application state
let currentUser = null;
let currentTab = 'books';
let isInitialized = false;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication
        if (!await checkAuthentication()) {
            return;
        }
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Initialize modules
        await initializeModules();
        
        // Load initial data
        await loadInitialData();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup offline detection
        setupOfflineDetection();
        
        isInitialized = true;
        
        showNotification('Library Management System loaded successfully', 'success', 3000);
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
}

// Authentication check
async function checkAuthentication() {
    const token = getToken();
    if (!token) {
        redirectToLogin();
        return false;
    }
    
    try {
        const user = await makeAPIRequest('/auth/me');
        if (user) {
            currentUser = user;
            updateUserUI(user);
            return true;
        } else {
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Authentication failed:', error);
        clearToken();
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    window.location.href = '../index.html';
}

// Update user interface
function updateUserUI(user) {
    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role;
    if (userInitials) userInitials.textContent = user.name.charAt(0).toUpperCase();
    
    // Show/hide admin elements
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        if (user.role === 'admin') {
            element.classList.remove('hidden');
            element.classList.add('show');
        } else {
            element.classList.add('hidden');
            element.classList.remove('show');
        }
    });
    
    // Update navigation based on role
    updateNavigationForRole(user.role);
}

function updateNavigationForRole(role) {
    const adminTabs = ['users', 'admin', 'reports'];
    
    adminTabs.forEach(tabName => {
        const navItem = document.querySelector(`[data-tab="${tabName}"]`);
        if (navItem) {
            if (role === 'admin') {
                navItem.style.display = 'flex';
            } else {
                navItem.style.display = 'none';
                
                // If user was on an admin tab, switch to books tab
                if (currentTab === tabName) {
                    switchTab('books');
                }
            }
        }
    });
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    // Visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Error handling
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

// Initialize all modules
async function initializeModules() {
    try {
        // Initialize core modules
        initializeBooksModule();
        initializeBorrowModule(currentUser);
        
        // Initialize admin modules if user is admin
        if (currentUser.role === 'admin') {
            initializeAdminModule(currentUser);
            initializeReportsModule(currentUser);
        }
        
        console.log('All modules initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize modules:', error);
        throw error;
    }
}

// Load initial data
async function loadInitialData() {
    const loadingPromises = [
        loadBooks(),
        loadBorrowedBooks()
    ];
    
    // Add admin data loading if user is admin
    if (currentUser.role === 'admin') {
        loadingPromises.push(
            loadUsers(),
            loadReports()
        );
    }
    
    try {
        await Promise.all(loadingPromises);
        console.log('Initial data loaded successfully');
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showNotification('Some data failed to load. Please refresh the page.', 'warning');
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Validate tab access
    if (!canAccessTab(tabName)) {
        showNotification('You do not have permission to access this section', 'error');
        return;
    }
    
    currentTab = tabName;
    
    // Update navigation
    navItems.forEach(item => {
        const itemTab = item.getAttribute('data-tab');
        if (itemTab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update tab content
    tabContents.forEach(content => {
        const contentId = content.id;
        const expectedId = getTabContentId(tabName);
        
        if (contentId === expectedId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load tab-specific data
    loadTabData(tabName);
    
    // Update URL without refresh
    updateUrlForTab(tabName);
    
    // Focus management for accessibility
    manageFocusForTab(tabName);
    
    console.log(`Switched to tab: ${tabName}`);
}

function canAccessTab(tabName) {
    const adminOnlyTabs = ['users', 'admin', 'reports'];
    
    if (adminOnlyTabs.includes(tabName)) {
        return currentUser && currentUser.role === 'admin';
    }
    
    return true;
}

function getTabContentId(tabName) {
    const tabMap = {
        'books': 'booksTab',
        'borrowed': 'borrowedBooksTab',
        'users': 'usersTabContent',
        'admin': 'adminTabContent',
        'reports': 'reportsTabContent'
    };
    return tabMap[tabName] || 'booksTab';
}

async function loadTabData(tabName) {
    try {
        switch (tabName) {
            case 'books':
                // Books data is loaded on initialization and auto-refreshed
                break;
            case 'borrowed':
                await loadBorrowedBooks();
                break;
            case 'users':
                if (currentUser.role === 'admin') {
                    await loadUsers();
                }
                break;
            case 'admin':
                if (currentUser.role === 'admin') {
                    // Admin data is loaded as needed
                }
                break;
            case 'reports':
                if (currentUser.role === 'admin') {
                    await loadReports();
                }
                break;
        }
    } catch (error) {
        console.error(`Failed to load data for tab ${tabName}:`, error);
        showNotification(`Failed to load ${tabName} data`, 'error');
    }
}

function updateUrlForTab(tabName) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.replaceState(null, '', url);
}

function manageFocusForTab(tabName) {
    // Find the first focusable element in the active tab
    const activeTabContent = document.querySelector('.tab-content.active');
    if (activeTabContent) {
        const firstFocusable = activeTabContent.querySelector(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        clearToken();
        showNotification('Logged out successfully', 'success', 2000);
        
        setTimeout(() => {
            redirectToLogin();
        }, 1000);
    }
}

// Auto-refresh setup
function setupAutoRefresh() {
    // Refresh every 5 minutes when page is visible
    setInterval(() => {
        if (document.visibilityState === 'visible' && isInitialized) {
            refreshCurrentTabData();
        }
    }, 300000); // 5 minutes
    
    // More frequent refresh for critical data (every minute)
    setInterval(() => {
        if (document.visibilityState === 'visible' && isInitialized) {
            refreshCriticalData();
        }
    }, 60000); // 1 minute
}

async function refreshCurrentTabData() {
    try {
        await loadTabData(currentTab);
    } catch (error) {
        console.error('Auto-refresh failed:', error);
    }
}

async function refreshCriticalData() {
    try {
        // Always refresh user's borrowed books
        await loadBorrowedBooks();
        
        // Refresh books if on books tab
        if (currentTab === 'books') {
            await loadBooks();
        }
    } catch (error) {
        console.error('Critical data refresh failed:', error);
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Skip if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        
        if (isCtrlOrCmd) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    switchTab('books');
                    break;
                case '2':
                    e.preventDefault();
                    switchTab('borrowed');
                    break;
                case '3':
                    e.preventDefault();
                    if (canAccessTab('users')) {
                        switchTab('users');
                    }
                    break;
                case '4':
                    e.preventDefault();
                    if (canAccessTab('admin')) {
                        switchTab('admin');
                    }
                    break;
                case '5':
                    e.preventDefault();
                    if (canAccessTab('reports')) {
                        switchTab('reports');
                    }
                    break;
                case 'k':
                    e.preventDefault();
                    focusSearch();
                    break;
                case 'r':
                    e.preventDefault();
                    refreshCurrentTabData();
                    showNotification('Data refreshed', 'success', 2000);
                    break;
            }
        }
        
        // Global shortcuts without modifier keys
        switch (e.key) {
            case 'Escape':
                closeAllModals();
                break;
            case 'F5':
                // Allow normal refresh
                break;
        }
    });
}

function focusSearch() {
    const searchInputs = [
        document.getElementById('searchBooks'),
        document.getElementById('manageBookSearch')
    ];
    
    const activeSearch = searchInputs.find(input => 
        input && !input.closest('.tab-content.hidden') && input.offsetParent !== null
    );
    
    if (activeSearch) {
        activeSearch.focus();
        activeSearch.select();
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
    document.body.style.overflow = 'auto';
}

// Offline detection
function setupOfflineDetection() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    if (!navigator.onLine) {
        handleOffline();
    }
}

function handleOnline() {
    showNotification('Connection restored', 'success', 3000);
    
    // Refresh data when coming back online
    if (isInitialized) {
        setTimeout(() => {
            refreshCurrentTabData();
        }, 1000);
    }
}

function handleOffline() {
    showNotification('You are offline. Some features may not work.', 'warning', 5000);
}

// Window event handlers
function handleBeforeUnload(e) {
    // Only show confirmation if user has unsaved changes
    // For now, we'll skip this as we don't track unsaved changes
    return undefined;
}

function handleWindowFocus() {
    // Refresh data when window gains focus
    if (isInitialized && document.visibilityState === 'visible') {
        refreshCriticalData();
    }
}

function handleWindowBlur() {
    // Optional: Pause auto-refresh when window loses focus
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        handleWindowFocus();
    } else {
        handleWindowBlur();
    }
}

// Error handlers
function handleGlobalError(event) {
    console.error('Global error:', event.error);
    
    // Don't show notifications for script loading errors
    if (event.filename && event.filename.includes('.js')) {
        return;
    }
    
    showNotification('An unexpected error occurred', 'error');
}

function handleUnhandledRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show notifications for network errors (they're handled elsewhere)
    if (event.reason && event.reason.message && event.reason.message.includes('fetch')) {
        return;
    }
    
    showNotification('An unexpected error occurred', 'error');
}

// Performance monitoring
function setupPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 100) {
                    console.warn(`Long task detected: ${entry.duration}ms`);
                }
            }
        });
        
        try {
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            // Long task API not supported
        }
    }
    
    // Monitor navigation timing
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                console.log(`Page load time: ${navigation.loadEventEnd - navigation.fetchStart}ms`);
            }
        }, 0);
    });
}

// Application state management
export function getCurrentUser() {
    return currentUser;
}

export function getCurrentTab() {
    return currentTab;
}

export function isUserAdmin() {
    return currentUser && currentUser.role === 'admin';
}

export function refreshApp() {
    return refreshCurrentTabData();
}

// Initialize URL-based tab on load
function initializeTabFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    
    if (tabFromUrl && canAccessTab(tabFromUrl)) {
        switchTab(tabFromUrl);
    } else {
        switchTab('books'); // Default tab
    }
}

// Theme management
function setupThemeManagement() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    function updateTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    
    // Initial theme
    updateTheme(prefersDark.matches);
    
    // Listen for changes
    prefersDark.addEventListener('change', (e) => {
        updateTheme(e.matches);
    });
}

// Accessibility enhancements
function setupAccessibilityEnhancements() {
    // Skip link functionality
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10001;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content landmark
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
    }
    
    // Announce tab changes to screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    document.body.appendChild(announcer);
    
    // Store announcer for tab changes
    window.accessibilityAnnouncer = announcer;
}

function announceTabChange(tabName) {
    const announcer = window.accessibilityAnnouncer;
    if (announcer) {
        const tabLabels = {
            books: 'Books section',
            borrowed: 'My borrowed books section',
            users: 'User management section',
            admin: 'Admin panel section',
            reports: 'Reports and analytics section'
        };
        
        announcer.textContent = `Navigated to ${tabLabels[tabName] || tabName}`;
    }
}

// Service Worker registration (for offline capabilities)
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration.scope);
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

// Analytics and tracking (placeholder)
function setupAnalytics() {
    // Placeholder for analytics setup
    // In a real application, you might initialize Google Analytics, Mixpanel, etc.
    
    function trackEvent(category, action, label = null, value = null) {
        console.log('Analytics event:', { category, action, label, value });
        
        // Example: Google Analytics
        // if (typeof gtag !== 'undefined') {
        //     gtag('event', action, {
        //         event_category: category,
        //         event_label: label,
        //         value: value
        //     });
        // }
    }
    
    function trackPageView(page) {
        console.log('Analytics page view:', page);
        
        // Example: Google Analytics
        // if (typeof gtag !== 'undefined') {
        //     gtag('config', 'GA_TRACKING_ID', {
        //         page_path: page
        //     });
        // }
    }
    
    // Track tab changes
    const originalSwitchTab = switchTab;
    switchTab = function(tabName) {
        originalSwitchTab(tabName);
        trackPageView(`/app/${tabName}`);
        trackEvent('Navigation', 'Tab Switch', tabName);
        announceTabChange(tabName);
    };
    
    // Export tracking functions for use by other modules
    window.trackEvent = trackEvent;
    window.trackPageView = trackPageView;
}

// Application health check
async function performHealthCheck() {
    try {
        // Check API connectivity
        await makeAPIRequest('/auth/me');
        
        // Check local storage
        const testKey = '__health_check__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Check if all required DOM elements exist
        const requiredElements = [
            'userName', 'userRole', 'userInitials', 'logoutBtn',
            'booksGrid', 'borrowedBooksList'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('Missing DOM elements:', missingElements);
        }
        
        return {
            api: true,
            localStorage: true,
            dom: missingElements.length === 0,
            missingElements
        };
        
    } catch (error) {
        console.error('Health check failed:', error);
        return {
            api: false,
            localStorage: false,
            dom: false,
            error: error.message
        };
    }
}

// Update the initialization function to include new features
async function initializeApp() {
    try {
        // Performance monitoring
        setupPerformanceMonitoring();
        
        // Check authentication
        if (!await checkAuthentication()) {
            return;
        }
        
        // Setup theme management
        setupThemeManagement();
        
        // Setup accessibility
        setupAccessibilityEnhancements();
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Initialize modules
        await initializeModules();
        
        // Load initial data
        await loadInitialData();
        
        // Initialize tab from URL
        initializeTabFromUrl();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup offline detection
        setupOfflineDetection();
        
        // Setup analytics
        setupAnalytics();
        
        // Setup service worker
        setupServiceWorker();
        
        // Perform health check
        const health = await performHealthCheck();
        console.log('Application health:', health);
        
        isInitialized = true;
        
        showNotification('Library Management System loaded successfully', 'success', 3000);
        console.log('Application initialized successfully');
        
        // Track successful initialization
        if (typeof trackEvent === 'function') {
            trackEvent('System', 'App Initialized', currentUser.role);
        }
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
        
        // Track initialization failure
        if (typeof trackEvent === 'function') {
            trackEvent('System', 'App Init Failed', error.message);
        }
    }
}

// Export main functions for testing and external use
export {
    initializeApp,
    switchTab,
    getCurrentUser,
    getCurrentTab,
    isUserAdmin,
    refreshApp,
    handleLogout,
    performHealthCheck
};

// Global exports for backward compatibility
window.switchTab = switchTab;
window.getCurrentUser = getCurrentUser;
window.getCurrentTab = getCurrentTab;
window.refreshApp = refreshApp;

console.log('Main application module loaded successfully');