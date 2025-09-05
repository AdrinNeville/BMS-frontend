// utils.js - Utility functions and helpers
const API_BASE_URL = 'http://localhost:8000';

// API Helper Functions
export async function makeAPIRequest(endpoint, options = {}) {
    try {
        const token = getToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {})
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        // Handle authentication errors
        if (response.status === 401) {
            clearToken();
            redirectToLogin();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Token Management
export function getToken() {
    return window.authToken || localStorage.getItem('authToken');
}

export function setToken(token) {
    window.authToken = token;
    localStorage.setItem('authToken', token);
}

export function clearToken() {
    window.authToken = null;
    localStorage.removeItem('authToken');
}

export function redirectToLogin() {
    window.location.href = '../index.html';
}

// Notification System
let notificationContainer = null;

export function showNotification(message, type = 'success', duration = 5000) {
    createNotificationContainer();
    
    const notification = createNotificationElement(message, type);
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove
    const timeoutId = setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    // Add click to dismiss
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeNotification(notification);
        });
    }
}

function createNotificationContainer() {
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notifications-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(notificationContainer);
    }
}

function createNotificationElement(message, type) {
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
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        max-width: 400px;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
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
    
    notification.querySelector('.notification-close').addEventListener('mouseenter', (e) => {
        e.target.style.opacity = '1';
    });
    
    notification.querySelector('.notification-close').addEventListener('mouseleave', (e) => {
        e.target.style.opacity = '0.7';
    });
    
    return notification;
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

function removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Text Utilities
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text.toString();
    return div.innerHTML;
}

export function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatName(name) {
    if (!name) return '';
    return name.split(' ')
        .map(word => capitalizeFirstLetter(word.toLowerCase()))
        .join(' ');
}

// Date Utilities
export function formatDate(date, options = {}) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    return dateObj.toLocaleDateString('default', { ...defaultOptions, ...options });
}

export function formatDateTime(date, options = {}) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return dateObj.toLocaleDateString('default', { ...defaultOptions, ...options });
}

export function getRelativeTime(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInMs = now - dateObj;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(dateObj);
    }
}

export function isOverdue(borrowDate, returnDate = null, dueDays = 14) {
    if (returnDate) return false;
    
    const borrowDateObj = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
    const dueDate = new Date(borrowDateObj.getTime() + (dueDays * 24 * 60 * 60 * 1000));
    
    return new Date() > dueDate;
}

export function getDaysOverdue(borrowDate, returnDate = null, dueDays = 14) {
    if (returnDate) return 0;
    
    const borrowDateObj = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
    const dueDate = new Date(borrowDateObj.getTime() + (dueDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    
    if (now <= dueDate) return 0;
    
    return Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
}

export function getDaysRemaining(borrowDate, dueDays = 14) {
    const borrowDateObj = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
    const dueDate = new Date(borrowDateObj.getTime() + (dueDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    
    const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
}

// Function Utilities
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Array Utilities
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

export function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
}

export function unique(array, key = null) {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) {
            return false;
        }
        seen.add(val);
        return true;
    });
}

export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Object Utilities
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

export function isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

export function pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}

export function omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
}

// Validation Utilities
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPassword(password) {
    // At least 6 characters with at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
}

export function isValidName(name) {
    // At least 2 characters, only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']{2,}$/;
    return nameRegex.test(name?.trim());
}

// Storage Utilities
export function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

export function setInStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error writing to localStorage:', error);
        return false;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

export function clearStorage() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
}

// URL Utilities
export function getQueryParams(url = window.location.search) {
    const params = new URLSearchParams(url);
    const result = {};
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
}

export function updateQueryParam(key, value) {
    const url = new URL(window.location);
    if (value === null || value === undefined) {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }
    window.history.replaceState(null, '', url);
}

// DOM Utilities
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

export function addEventListeners(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
        element.addEventListener(event, handler);
    });
}

export function removeEventListeners(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
        element.removeEventListener(event, handler);
    });
}

export function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// File Utilities
export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Math Utilities
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max, decimals = 2) {
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(decimals));
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function percentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

// Error Handling Utilities
export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export function handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error instanceof AppError) {
        message = error.message;
    } else if (error.message) {
        message = error.message;
    }
    
    showNotification(message, 'error');
    
    // In production, you might want to send errors to a logging service
    // logErrorToService(error, context);
}

export function withErrorHandling(fn, context = '') {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, context);
            throw error;
        }
    };
}

// Performance Utilities
export function measurePerformance(name, fn) {
    return async (...args) => {
        const start = performance.now();
        const result = await fn(...args);
        const end = performance.now();
        
        console.log(`${name} took ${(end - start).toFixed(2)} milliseconds`);
        
        return result;
    };
}

export function createPerformanceMonitor() {
    const marks = new Map();
    
    return {
        mark(name) {
            marks.set(name, performance.now());
        },
        
        measure(name, startMark) {
            const start = marks.get(startMark);
            if (!start) {
                console.warn(`Start mark '${startMark}' not found`);
                return;
            }
            
            const duration = performance.now() - start;
            console.log(`${name}: ${duration.toFixed(2)}ms`);
            
            return duration;
        },
        
        clear() {
            marks.clear();
        }
    };
}

// Feature Detection
export function supportsLocalStorage() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

export function supportsWebWorkers() {
    return typeof Worker !== 'undefined';
}

export function supportsFetch() {
    return typeof fetch !== 'undefined';
}

export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isTablet() {
    return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
}

export function isDesktop() {
    return !isMobile() && !isTablet();
}

// Console Utilities (for development)
export function logGroup(title, ...items) {
    console.group(title);
    items.forEach(item => console.log(item));
    console.groupEnd();
}

export function logTable(data) {
    if (Array.isArray(data) && data.length > 0) {
        console.table(data);
    } else {
        console.log(data);
    }
}

export function logWithStyle(message, styles = 'color: #3b82f6; font-weight: bold;') {
    console.log(`%c${message}`, styles);
}

// Development helpers
export function isDevelopment() {
    return process?.env?.NODE_ENV === 'development' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
}

export function debugLog(...args) {
    if (isDevelopment()) {
        console.log('[DEBUG]', ...args);
    }
}

export function debugGroup(title, fn) {
    if (isDevelopment()) {
        console.group(`[DEBUG] ${title}`);
        fn();
        console.groupEnd();
    }
}

// Initialize utility features
function initializeUtils() {
    // Add global error handler
    window.addEventListener('error', (event) => {
        handleError(event.error, 'Global Error Handler');
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason, 'Unhandled Promise Rejection');
        event.preventDefault();
    });
    
    // Log successful initialization
    debugLog('Utils module initialized successfully');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUtils);
} else {
    initializeUtils();
}

console.log('Utils module loaded successfully');