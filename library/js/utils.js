// utils.js - Shared Utility Functions

// HTML escaping utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Button loading state management
function setButtonLoading(button, loading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    
    if (loading) {
        if (btnText) btnText.classList.add('hidden');
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        button.disabled = true;
    } else {
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');
        button.disabled = false;
    }
}

// Loading state for containers
function showLoading(container) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

// Loading state for table bodies
function showLoadingTable(tbody) {
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="5">
                <div class="spinner"></div>
                <span>Loading...</span>
            </td>
        </tr>
    `;
}

// Empty state generators
function createEmptyState(iconSvg, title, message) {
    return `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${iconSvg}
            </svg>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

function createBooksEmptyState() {
    return createEmptyState(
        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        'No books found',
        'There are no books in the library yet.'
    );
}

function createBorrowedBooksEmptyState() {
    return createEmptyState(
        '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
        'No borrowed books',
        'You haven\'t borrowed any books yet. Browse the library to find books to borrow.'
    );
}

function createErrorState(title, message) {
    return createEmptyState(
        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        title,
        message
    );
}

// Date formatting utilities
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function calculateDaysOverdue(borrowedAt, returnPeriodDays = 14) {
    const borrowDate = new Date(borrowedAt);
    const dueDate = new Date(borrowDate.getTime() + (returnPeriodDays * 24 * 60 * 60 * 1000));
    const today = new Date();
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Form validation utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateRequired(value) {
    return value && value.trim().length > 0;
}

function validatePositiveNumber(value) {
    const num = parseInt(value);
    return !isNaN(num) && num > 0;
}

// Array utilities
function findById(array, id) {
    return array.find(item => item.id == id);
}

function removeById(array, id) {
    return array.filter(item => item.id != id);
}

function updateById(array, id, updates) {
    return array.map(item => 
        item.id == id ? { ...item, ...updates } : item
    );
}

// Book utilities
function getBookAvailabilityStatus(book) {
    const availableCopies = book.available_copies || (book.available ? 1 : 0);
    const totalCopies = book.total_copies || 1;
    const isAvailable = availableCopies > 0;
    
    return {
        availableCopies,
        totalCopies,
        borrowedCopies: totalCopies - availableCopies,
        isAvailable,
        statusText: isAvailable ? 'Available' : 'Not Available',
        statusClass: isAvailable ? 'available' : 'borrowed'
    };
}

// Modal utilities
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Search utilities
function filterByQuery(items, query, searchFields = ['title', 'author']) {
    if (!query) return items;
    
    const lowercaseQuery = query.toLowerCase().trim();
    return items.filter(item => 
        searchFields.some(field => 
            (item[field] || '').toLowerCase().includes(lowercaseQuery)
        )
    );
}

// Storage utilities
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// Error handling utilities
function getErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.detail) return error.detail;
    return 'An unexpected error occurred';
}

// Copy to clipboard utility
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

// Console logging utilities
function logSuccess(message, data = null) {
    console.log(`✅ ${message}`, data || '');
}

function logError(message, error = null) {
    console.error(`❌ ${message}`, error || '');
}

function logInfo(message, data = null) {
    console.info(`ℹ️ ${message}`, data || '');
}