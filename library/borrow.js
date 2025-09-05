// borrow.js - Borrow management functionality
import { makeAPIRequest, showNotification, escapeHtml, debounce } from './utils.js';

let borrowedBooks = [];
let currentUser = null;

// DOM Elements
const borrowedBooksList = document.getElementById('borrowedBooksList');
const currentBorrows = document.getElementById('currentBorrows');
const overdueBooks = document.getElementById('overdueBooks');

// Initialize borrow module
export function initializeBorrowModule(user) {
    currentUser = user;
    setupBorrowEventListeners();
    loadBorrowedBooks();
}

// Setup event listeners
function setupBorrowEventListeners() {
    // Auto-refresh borrowed books periodically
    setInterval(() => {
        if (document.visibilityState === 'visible' && currentUser) {
            loadBorrowedBooks();
        }
    }, 60000); // Every minute
    
    // Page visibility change handler
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentUser) {
            loadBorrowedBooks();
        }
    });
}

// Load user's borrowed books
export async function loadBorrowedBooks() {
    try {
        showBorrowedBooksLoading();
        const borrowed = await makeAPIRequest('/borrow/my-borrows');
        borrowedBooks = Array.isArray(borrowed) ? borrowed : [];
        renderBorrowedBooks(borrowedBooks);
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        showNotification('Failed to load borrowed books. Please try again.', 'error');
        renderBorrowedBooksError();
    }
}

// Render borrowed books list
function renderBorrowedBooks(borrowed) {
    if (!borrowedBooksList) return;
    
    if (borrowed.length === 0) {
        borrowedBooksList.innerHTML = createEmptyBorrowedState();
        return;
    }
    
    // Separate active and returned borrows
    const activeBorrows = borrowed.filter(borrow => !borrow.returned_at);
    const returnedBorrows = borrowed.filter(borrow => borrow.returned_at);
    
    let html = '';
    
    // Active borrows section
    if (activeBorrows.length > 0) {
        html += `
            <div class="borrowed-section">
                <h3 class="section-title">Currently Borrowed (${activeBorrows.length})</h3>
                <div class="borrowed-books-grid">
                    ${activeBorrows.map(borrow => createBorrowedBookCard(borrow, false)).join('')}
                </div>
            </div>
        `;
    }
    
    // Returned books section
    if (returnedBorrows.length > 0) {
        html += `
            <div class="borrowed-section">
                <h3 class="section-title">Previously Borrowed (${returnedBorrows.length})</h3>
                <div class="borrowed-books-grid">
                    ${returnedBorrows.map(borrow => createBorrowedBookCard(borrow, true)).join('')}
                </div>
            </div>
        `;
    }
    
    borrowedBooksList.innerHTML = html;
}

// Create borrowed book card HTML
function createBorrowedBookCard(borrow, isReturned) {
    const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
    const returnDate = isReturned ? new Date(borrow.returned_at).toLocaleDateString() : null;
    
    // Calculate if overdue (for active borrows)
    let isOverdue = false;
    let overdueDays = 0;
    
    if (!isReturned) {
        const borrowDateTime = new Date(borrow.borrowed_at);
        const dueDate = new Date(borrowDateTime.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
        const now = new Date();
        
        if (now > dueDate) {
            isOverdue = true;
            overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
        }
    }
    
    // Get book information
    const bookTitle = borrow.book?.title || `Book ID: ${borrow.book_id}`;
    const bookAuthor = borrow.book?.author || 'Unknown Author';
    
    return `
        <div class="borrowed-book-card ${isOverdue ? 'overdue' : ''} ${isReturned ? 'returned' : ''}">
            <div class="book-cover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                ${isOverdue ? '<div class="overdue-badge">OVERDUE</div>' : ''}
                ${isReturned ? '<div class="returned-badge">RETURNED</div>' : ''}
            </div>
            
            <div class="borrowed-book-info">
                <h4 class="book-title">${escapeHtml(bookTitle)}</h4>
                <p class="book-author">by ${escapeHtml(bookAuthor)}</p>
                <div class="borrow-details">
                    <span class="borrow-date">
                        <strong>Borrowed:</strong> ${borrowDate}
                    </span>
                    ${returnDate ? 
                        `<span class="return-date">
                            <strong>Returned:</strong> ${returnDate}
                        </span>` : 
                        `<span class="due-info ${isOverdue ? 'overdue' : ''}">
                            ${isOverdue ? 
                                `<strong>Overdue by:</strong> ${overdueDays} day${overdueDays > 1 ? 's' : ''}` :
                                `<strong>Due in:</strong> ${calculateDaysRemaining(borrow.borrowed_at)} days`
                            }
                        </span>`
                    }
                    <small class="borrow-id">Borrow ID: ${borrow.id}</small>
                </div>
                
                ${!isReturned ? `
                    <div class="borrowed-book-actions">
                        <button class="btn btn-success return-btn" onclick="returnBook('${borrow.id}', this)">
                            <span class="btn-text">Return Book</span>
                            <div class="btn-spinner hidden">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Calculate days remaining until due
function calculateDaysRemaining(borrowedAt) {
    const borrowDate = new Date(borrowedAt);
    const dueDate = new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
    const now = new Date();
    const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
}

// Create empty borrowed books state
function createEmptyBorrowedState() {
    return `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <h3>No borrowed books</h3>
            <p>You haven't borrowed any books yet. Browse the library to find books to borrow.</p>
            <button class="btn btn-primary" onclick="switchToTab('books')">
                Browse Books
            </button>
        </div>
    `;
}

// Show loading state
function showBorrowedBooksLoading() {
    if (!borrowedBooksList) return;
    
    borrowedBooksList.innerHTML = `
        <div class="loading-state">
            <div class="loading-borrowed-grid">
                ${Array.from({ length: 3 }, () => `
                    <div class="borrowed-book-card-skeleton">
                        <div class="book-cover-skeleton"></div>
                        <div class="book-info-skeleton">
                            <div class="skeleton-line title"></div>
                            <div class="skeleton-line author"></div>
                            <div class="skeleton-line details"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p>Loading your borrowed books...</p>
        </div>
    `;
}

// Show error state
function renderBorrowedBooksError() {
    if (!borrowedBooksList) return;
    
    borrowedBooksList.innerHTML = `
        <div class="error-state">
            <svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load borrowed books</h3>
            <p>There was an error loading your borrowed books. Please try again.</p>
            <button class="btn btn-primary" onclick="loadBorrowedBooks()">Retry</button>
        </div>
    `;
}

// Return a book
window.returnBook = async function(borrowId, buttonElement) {
    try {
        // Set loading state
        const btnText = buttonElement.querySelector('.btn-text');
        const btnSpinner = buttonElement.querySelector('.btn-spinner');
        
        if (btnText) btnText.classList.add('hidden');
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        buttonElement.disabled = true;
        
        await makeAPIRequest(`/borrow/${borrowId}/return`, {
            method: 'PATCH'
        });
        
        showNotification('Book returned successfully!', 'success');
        
        // Refresh data
        await loadBorrowedBooks();
        
        // Refresh books list if function exists
        if (typeof loadBooks === 'function') {
            loadBooks();
        }
        
        // Update reports if function exists
        if (typeof loadReports === 'function') {
            loadReports();
        }
        
    } catch (error) {
        console.error('Failed to return book:', error);
        showNotification(error.message || 'Failed to return book. Please try again.', 'error');
        
        // Reset button state on error
        const btnText = buttonElement.querySelector('.btn-text');
        const btnSpinner = buttonElement.querySelector('.btn-spinner');
        
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');
        buttonElement.disabled = false;
    }
};

// Admin functions for managing all borrows
export async function loadCurrentBorrows() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showCurrentBorrowsLoading();
        const borrows = await makeAPIRequest('/borrow/all');
        const activeBorrows = borrows.filter(borrow => !borrow.returned_at);
        renderCurrentBorrows(activeBorrows);
    } catch (error) {
        console.error('Failed to load current borrows:', error);
        renderCurrentBorrowsError();
    }
}

function renderCurrentBorrows(borrows) {
    if (!currentBorrows) return;
    
    if (borrows.length === 0) {
        currentBorrows.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <h3>No active borrows</h3>
                <p>No books are currently borrowed from the library.</p>
            </div>
        `;
        return;
    }
    
    currentBorrows.innerHTML = `
        <div class="current-borrows-list">
            ${borrows.map(borrow => createCurrentBorrowItem(borrow)).join('')}
        </div>
    `;
}

function createCurrentBorrowItem(borrow) {
    const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
    const dueDate = new Date(new Date(borrow.borrowed_at).getTime() + (14 * 24 * 60 * 60 * 1000));
    const isOverdue = new Date() > dueDate;
    const overdueDays = isOverdue ? Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24)) : 0;
    
    return `
        <div class="current-borrow-item ${isOverdue ? 'overdue' : ''}">
            <div class="borrow-info">
                <h4>${escapeHtml(borrow.book?.title || `Book ID: ${borrow.book_id}`)}</h4>
                <p>Borrowed by ${escapeHtml(borrow.user?.name || `User ID: ${borrow.user_id}`)}</p>
                <small>Borrow ID: ${borrow.id}</small>
            </div>
            <div class="borrow-meta">
                <span>Borrowed: ${borrowDate}</span>
                <span>Due: ${dueDate.toLocaleDateString()}</span>
                ${isOverdue ? 
                    `<span class="overdue-indicator">${overdueDays} days overdue</span>` : 
                    `<span class="due-soon">${Math.max(0, Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)))} days remaining</span>`
                }
            </div>
            <div class="borrow-actions">
                <button class="btn btn-secondary btn-sm" onclick="forceReturnBook('${borrow.id}', this)">
                    Force Return
                </button>
            </div>
        </div>
    `;
}

function showCurrentBorrowsLoading() {
    if (!currentBorrows) return;
    
    currentBorrows.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading current borrows...</p>
        </div>
    `;
}

function renderCurrentBorrowsError() {
    if (!currentBorrows) return;
    
    currentBorrows.innerHTML = `
        <div class="error-state">
            <p>Failed to load current borrows</p>
            <button class="btn btn-secondary" onclick="loadCurrentBorrows()">Retry</button>
        </div>
    `;
}

// Load overdue books (admin)
export async function loadOverdueBooks() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showOverdueBooksLoading();
        const overdueList = await makeAPIRequest('/borrow/overdue');
        renderOverdueBooks(overdueList);
    } catch (error) {
        console.error('Failed to load overdue books:', error);
        renderOverdueBooksError();
    }
}

function renderOverdueBooks(overdueList) {
    if (!overdueBooks) return;
    
    if (overdueList.length === 0) {
        overdueBooks.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                <h3>No overdue books</h3>
                <p>All books are returned on time. Great job!</p>
            </div>
        `;
        return;
    }
    
    overdueBooks.innerHTML = `
        <div class="overdue-books-list">
            ${overdueList.map(borrow => createOverdueBookItem(borrow)).join('')}
        </div>
    `;
}

function createOverdueBookItem(borrow) {
    return `
        <div class="overdue-book-item">
            <div class="overdue-info">
                <h4>${escapeHtml(borrow.book_title)}</h4>
                <p>by ${escapeHtml(borrow.book_author)}</p>
                <p>Borrowed by ${escapeHtml(borrow.user_name)} (${escapeHtml(borrow.user_email)})</p>
                <small>Borrow ID: ${borrow.borrow_id}</small>
            </div>
            <div class="overdue-meta">
                <span>Borrowed: ${new Date(borrow.borrowed_at).toLocaleDateString()}</span>
                <span class="overdue-days">${borrow.days_overdue} days overdue</span>
            </div>
            <div class="overdue-actions">
                <button class="btn btn-warning btn-sm" onclick="sendOverdueReminder('${borrow.borrow_id}', '${borrow.user_email}')">
                    Send Reminder
                </button>
                <button class="btn btn-danger btn-sm" onclick="forceReturnBook('${borrow.borrow_id}', this)">
                    Force Return
                </button>
            </div>
        </div>
    `;
}

function showOverdueBooksLoading() {
    if (!overdueBooks) return;
    
    overdueBooks.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading overdue books...</p>
        </div>
    `;
}

function renderOverdueBooksError() {
    if (!overdueBooks) return;
    
    overdueBooks.innerHTML = `
        <div class="error-state">
            <p>Failed to load overdue books</p>
            <button class="btn btn-secondary" onclick="loadOverdueBooks()">Retry</button>
        </div>
    `;
}

// Force return a book (admin only)
window.forceReturnBook = async function(borrowId, buttonElement) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Admin access required', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to force return this book?')) {
        return;
    }
    
    try {
        // Set loading state
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Returning...';
        buttonElement.disabled = true;
        
        await makeAPIRequest(`/borrow/admin/${borrowId}/force-return`, {
            method: 'PATCH'
        });
        
        showNotification('Book force returned successfully!', 'success');
        
        // Refresh data
        await Promise.all([
            loadCurrentBorrows(),
            loadOverdueBooks()
        ]);
        
        // Refresh other data if functions exist
        if (typeof loadBooks === 'function') {
            loadBooks();
        }
        
        if (typeof loadReports === 'function') {
            loadReports();
        }
        
    } catch (error) {
        console.error('Failed to force return book:', error);
        showNotification(error.message || 'Failed to force return book', 'error');
        
        // Reset button state on error
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
    }
};

// Send overdue reminder (placeholder function)
window.sendOverdueReminder = async function(borrowId, userEmail) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Admin access required', 'error');
        return;
    }
    
    try {
        // In a real application, this would send an email reminder
        // For now, we'll just show a success message
        showNotification(`Reminder sent to ${userEmail}`, 'success');
        
        // Log the reminder action
        console.log(`Overdue reminder sent for borrow ${borrowId} to ${userEmail}`);
        
    } catch (error) {
        console.error('Failed to send reminder:', error);
        showNotification('Failed to send reminder', 'error');
    }
};

// Get borrow statistics
export async function getBorrowStats() {
    try {
        const allBorrows = await makeAPIRequest('/borrow/all');
        const activeBorrows = allBorrows.filter(borrow => !borrow.returned_at);
        const overdueList = await makeAPIRequest('/borrow/overdue');
        
        return {
            totalBorrows: allBorrows.length,
            activeBorrows: activeBorrows.length,
            overdueCount: overdueList.length,
            returnedBooks: allBorrows.length - activeBorrows.length
        };
    } catch (error) {
        console.error('Failed to get borrow stats:', error);
        return {
            totalBorrows: 0,
            activeBorrows: 0,
            overdueCount: 0,
            returnedBooks: 0
        };
    }
}

// Get user's borrow history
export function getUserBorrowHistory() {
    return [...borrowedBooks];
}

// Get user's active borrows
export function getUserActiveBorrows() {
    return borrowedBooks.filter(borrow => !borrow.returned_at);
}

// Get user's overdue books
export function getUserOverdueBooks() {
    const now = new Date();
    return borrowedBooks.filter(borrow => {
        if (borrow.returned_at) return false;
        
        const borrowDate = new Date(borrow.borrowed_at);
        const dueDate = new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        return now > dueDate;
    });
}

// Check if user has overdue books
export function hasOverdueBooks() {
    return getUserOverdueBooks().length > 0;
}

// Calculate fine amount (if implemented)
export function calculateFineAmount(borrowId) {
    const borrow = borrowedBooks.find(b => b.id === borrowId);
    if (!borrow || borrow.returned_at) return 0;
    
    const borrowDate = new Date(borrow.borrowed_at);
    const dueDate = new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000));
    const now = new Date();
    
    if (now <= dueDate) return 0;
    
    const overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    const finePerDay = 1.00; // $1 per day fine
    
    return overdueDays * finePerDay;
}

// Get borrow duration in days
export function getBorrowDuration(borrowId) {
    const borrow = borrowedBooks.find(b => b.id === borrowId);
    if (!borrow) return 0;
    
    const borrowDate = new Date(borrow.borrowed_at);
    const endDate = borrow.returned_at ? new Date(borrow.returned_at) : new Date();
    
    return Math.ceil((endDate - borrowDate) / (1000 * 60 * 60 * 24));
}

// Export functions for global use
window.returnBook = window.returnBook;
window.forceReturnBook = window.forceReturnBook;
window.sendOverdueReminder = window.sendOverdueReminder;
window.loadBorrowedBooks = loadBorrowedBooks;
window.loadCurrentBorrows = loadCurrentBorrows;
window.loadOverdueBooks = loadOverdueBooks;

// Utility function to switch tabs (if needed)
window.switchToTab = function(tabName) {
    if (typeof switchTab === 'function') {
        switchTab(tabName);
    } else {
        // Fallback tab switching
        const navItem = document.querySelector(`[data-tab="${tabName}"]`);
        if (navItem) {
            navItem.click();
        }
    }
};

console.log('Borrow module loaded successfully');