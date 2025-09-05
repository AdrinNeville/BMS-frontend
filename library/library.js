// Configuration
const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your FastAPI server URL

// Global state
let currentUser = null;
let currentTab = 'books';
let allBooks = [];
let borrowedBooks = [];
let selectedBookId = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const booksGrid = document.getElementById('booksGrid');
const borrowedBooksList = document.getElementById('borrowedBooksList');
const usersTableBody = document.getElementById('usersTableBody');
const allBorrowedList = document.getElementById('allBorrowedList');
const searchBooks = document.getElementById('searchBooks');
const addBookForm = document.getElementById('addBookForm');

// Modal elements
const bookModal = document.getElementById('bookModal');
const modalBookTitle = document.getElementById('modalBookTitle');
const modalBookAuthor = document.getElementById('modalBookAuthor');
const modalBookStatus = document.getElementById('modalBookStatus');
const borrowBookBtn = document.getElementById('borrowBookBtn');
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');

// User info elements
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupEventListeners();
});

// Authentication check
function checkAuthentication() {
    const token = getToken();
    if (!token) {
        redirectToLogin();
        return;
    }
    
    getCurrentUser().then(user => {
        if (user) {
            currentUser = user;
            updateUserUI(user);
            loadInitialData();
        } else {
            redirectToLogin();
        }
    }).catch(error => {
        console.error('Authentication failed:', error);
        redirectToLogin();
    });
}

function redirectToLogin() {
    window.location.href = '../index.html';
}

// Token management
function getToken() {
    return window.authToken || localStorage.getItem('authToken') || null;
}

function clearToken() {
    window.authToken = null;
    localStorage.removeItem('authToken');
}

// API Helper Functions
async function makeAPIRequest(endpoint, options = {}) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        });

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

// Get current user info
async function getCurrentUser() {
    try {
        return await makeAPIRequest('/auth/me');
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

// Update user UI
function updateUserUI(user) {
    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role;
    if (userInitials) userInitials.textContent = user.name.charAt(0).toUpperCase();
    
    // Show admin tabs if user is admin
    if (user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.add('show');
            el.classList.remove('hidden');
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
    
    // Search
    if (searchBooks) {
        searchBooks.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Modal
    if (closeModal) closeModal.addEventListener('click', closeBookModal);
    if (cancelModal) cancelModal.addEventListener('click', closeBookModal);
    if (bookModal) {
        bookModal.addEventListener('click', (e) => {
            if (e.target === bookModal) closeBookModal();
        });
    }
    
    // Borrow book
    if (borrowBookBtn) {
        borrowBookBtn.addEventListener('click', handleBorrowBook);
    }
    
    // Add book form
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBook);
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Tab switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update navigation
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Update content
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab` || content.id === `${tabName}TabContent`);
    });
    
    // Load tab data
    loadTabData(tabName);
}

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadBooks(),
            loadBorrowedBooks()
        ]);
        
        if (currentUser && currentUser.role === 'admin') {
            await Promise.all([
                loadUsers(),
                loadAllBorrowedBooks()
            ]);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showError('Failed to load initial data. Please refresh the page.');
    }
}

// Load tab-specific data
function loadTabData(tabName) {
    switch (tabName) {
        case 'books':
            if (allBooks.length === 0) loadBooks();
            break;
        case 'borrowed':
            loadBorrowedBooks();
            break;
        case 'users':
            if (currentUser && currentUser.role === 'admin') loadUsers();
            break;
        case 'admin':
            if (currentUser && currentUser.role === 'admin') loadAllBorrowedBooks();
            break;
    }
}

// Load books
async function loadBooks() {
    try {
        showLoading(booksGrid);
        const books = await makeAPIRequest('/books/');
        allBooks = Array.isArray(books) ? books : [];
        renderBooks(allBooks);
    } catch (error) {
        console.error('Failed to load books:', error);
        showError('Failed to load books. Please try again.');
        renderBooksError();
    }
}

// Render books
function renderBooks(books) {
    if (!booksGrid) return;
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <h3>No books found</h3>
                <p>There are no books in the library yet.</p>
            </div>
        `;
        return;
    }
    
    booksGrid.innerHTML = books.map(book => {
        // Handle both old and new book data formats
        const availableCopies = book.available_copies || (book.available ? 1 : 0);
        const totalCopies = book.total_copies || 1;
        const isAvailable = availableCopies > 0;
        
        return `
            <div class="book-card" onclick="openBookModal(${book.id})">
                <div class="book-cover">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                </div>
                <h3 class="book-title">${escapeHtml(book.title || '')}</h3>
                <p class="book-author">by ${escapeHtml(book.author || 'Unknown')}</p>
                <div class="book-status">
                    <span class="status-badge ${isAvailable ? 'available' : 'borrowed'}">
                        ${isAvailable ? 'Available' : 'Not Available'}
                    </span>
                    <span class="book-id">ID: ${book.id}</span>
                </div>
                ${totalCopies > 1 ? `<div class="book-copies">Copies: ${availableCopies}/${totalCopies}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Render books error
function renderBooksError() {
    if (!booksGrid) return;
    
    booksGrid.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load books</h3>
            <p>There was an error loading the books. Please refresh the page.</p>
        </div>
    `;
}

// Load borrowed books
async function loadBorrowedBooks() {
    try {
        showLoading(borrowedBooksList);
        const borrowed = await makeAPIRequest('/borrow/my-borrows');
        borrowedBooks = Array.isArray(borrowed) ? borrowed : [];
        renderBorrowedBooks(borrowedBooks);
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        showError('Failed to load borrowed books. Please try again.');
        renderBorrowedBooksError();
    }
}

// Render borrowed books
function renderBorrowedBooks(borrowed) {
    if (!borrowedBooksList) return;
    
    if (borrowed.length === 0) {
        borrowedBooksList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <h3>No borrowed books</h3>
                <p>You haven't borrowed any books yet. Browse the library to find books to borrow.</p>
            </div>
        `;
        return;
    }
    
    borrowedBooksList.innerHTML = borrowed.map(borrow => {
        // Get book info - try to get from the borrow record first
        const bookTitle = borrow.book?.title || `Book ID: ${borrow.book_id}`;
        const bookAuthor = borrow.book?.author || 'Unknown Author';
        
        const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
        const isReturned = !!borrow.returned_at;
        const returnDate = isReturned ? new Date(borrow.returned_at).toLocaleDateString() : null;
        
        return `
            <div class="borrowed-book-item">
                <div class="borrowed-book-header">
                    <div class="borrowed-book-info">
                        <h3>${escapeHtml(bookTitle)}</h3>
                        <p>by ${escapeHtml(bookAuthor)}</p>
                        <small>Borrow ID: ${borrow.id}</small>
                    </div>
                </div>
                <div class="borrowed-book-meta">
                    <span>Borrowed: ${borrowDate}</span>
                    ${isReturned ? `<span>Returned: ${returnDate}</span>` : '<span class="status-badge borrowed">Currently Borrowed</span>'}
                </div>
                ${!isReturned ? `
                    <div class="borrowed-book-actions">
                        <button class="btn btn-success" onclick="returnBook('${borrow.id}')">
                            <span class="btn-text">Return Book</span>
                            <div class="btn-spinner hidden">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Render borrowed books error
function renderBorrowedBooksError() {
    if (!borrowedBooksList) return;
    
    borrowedBooksList.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load borrowed books</h3>
            <p>There was an error loading your borrowed books. Please refresh the page.</p>
        </div>
    `;
}

// Load users (admin only)
async function loadUsers() {
    try {
        if (!usersTableBody) return;
        showLoadingTable(usersTableBody);
        const users = await makeAPIRequest('/users/');
        renderUsers(Array.isArray(users) ? users : []);
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users. Please try again.');
        renderUsersError();
    }
}

// Render users
function renderUsers(users) {
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #6b7280;">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.name || '')}</td>
            <td>${escapeHtml(user.email || '')}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'borrowed' : 'available'}">
                    ${user.role || 'member'}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Render users error
function renderUsersError() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: #ef4444;">
                Failed to load users. Please try again.
            </td>
        </tr>
    `;
}

// Load all borrowed books (admin only)
async function loadAllBorrowedBooks() {
    try {
        if (!allBorrowedList) return;
        showLoading(allBorrowedList);
        const allBorrowed = await makeAPIRequest('/borrow/all');
        renderAllBorrowedBooks(Array.isArray(allBorrowed) ? allBorrowed : []);
    } catch (error) {
        console.error('Failed to load all borrowed books:', error);
        showError('Failed to load borrowed books data. Please try again.');
        renderAllBorrowedError();
    }
}

// Render all borrowed books
function renderAllBorrowedBooks(borrowed) {
    if (!allBorrowedList) return;
    
    if (borrowed.length === 0) {
        allBorrowedList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <h3>No borrowed books</h3>
                <p>No books are currently borrowed from the library.</p>
            </div>
        `;
        return;
    }
    
    allBorrowedList.innerHTML = borrowed.map(borrow => {
        const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
        const isReturned = !!borrow.returned_at;
        const returnDate = isReturned ? new Date(borrow.returned_at).toLocaleDateString() : null;
        
        return `
            <div class="all-borrowed-item">
                <div class="all-borrowed-info">
                    <h4>Book ID: ${borrow.book_id}</h4>
                    <p>User ID: ${borrow.user_id}</p>
                </div>
                <div class="all-borrowed-meta">
                    <div>Borrowed: ${borrowDate}</div>
                    ${isReturned ? `<div>Returned: ${returnDate}</div>` : '<div class="status-badge borrowed">Active</div>'}
                </div>
            </div>
        `;
    }).join('');
}

// Render all borrowed books error
function renderAllBorrowedError() {
    if (!allBorrowedList) return;
    
    allBorrowedList.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load data</h3>
            <p>There was an error loading the borrowed books data. Please refresh the page.</p>
        </div>
    `;
}

// Open book modal
function openBookModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    selectedBookId = bookId;
    
    if (modalBookTitle) modalBookTitle.textContent = book.title || 'Unknown Title';
    if (modalBookAuthor) modalBookAuthor.textContent = `by ${book.author || 'Unknown Author'}`;
    
    // Handle both old and new book data formats
    const availableCopies = book.available_copies || (book.available ? 1 : 0);
    const isAvailable = availableCopies > 0;
    
    if (modalBookStatus) {
        modalBookStatus.textContent = isAvailable ? 'Available' : 'Not Available';
        modalBookStatus.className = `status-badge ${isAvailable ? 'available' : 'borrowed'}`;
    }
    
    // Update borrow button
    if (borrowBookBtn) {
        borrowBookBtn.disabled = !isAvailable;
        borrowBookBtn.innerHTML = `
            <span class="btn-text">${isAvailable ? 'Borrow Book' : 'Not Available'}</span>
            <div class="btn-spinner hidden">
                <div class="spinner"></div>
            </div>
        `;
    }
    
    if (bookModal) {
        bookModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Close book modal
function closeBookModal() {
    if (bookModal) {
        bookModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    selectedBookId = null;
}

// Handle borrow book
async function handleBorrowBook() {
    if (!selectedBookId) return;
    
    try {
        setButtonLoading(borrowBookBtn, true);
        
        await makeAPIRequest(`/borrow/${selectedBookId}`, {
            method: 'POST'
        });
        
        showSuccess('Book borrowed successfully!');
        closeBookModal();
        
        // Refresh data
        await loadBooks();
        await loadBorrowedBooks();
        
    } catch (error) {
        console.error('Failed to borrow book:', error);
        showError(error.message || 'Failed to borrow book. Please try again.');
    } finally {
        setButtonLoading(borrowBookBtn, false);
    }
}

// Return book
async function returnBook(borrowId) {
    const button = event.target.closest('button');
    
    try {
        setButtonLoading(button, true);
        
        await makeAPIRequest(`/borrow/${borrowId}/return`, {
            method: 'PATCH'
        });
        
        showSuccess('Book returned successfully!');
        
        // Refresh data
        await loadBooks();
        await loadBorrowedBooks();
        if (currentUser && currentUser.role === 'admin') {
            await loadAllBorrowedBooks();
        }
        
    } catch (error) {
        console.error('Failed to return book:', error);
        showError(error.message || 'Failed to return book. Please try again.');
    } finally {
        setButtonLoading(button, false);
    }
}

// Handle add book (admin only)
async function handleAddBook(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('bookTitle');
    const authorInput = document.getElementById('bookAuthor');
    
    if (!titleInput || !authorInput) {
        showError('Form fields not found.');
        return;
    }
    
    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    
    if (!title || !author) {
        showError('Please fill in all fields.');
        return;
    }
    
    try {
        setButtonLoading(submitBtn, true);
        
        await makeAPIRequest('/books/', {
            method: 'POST',
            body: JSON.stringify({ title, author, total_copies: 1 })
        });
        
        showSuccess('Book added successfully!');
        addBookForm.reset();
        
        // Refresh books
        await loadBooks();
        
    } catch (error) {
        console.error('Failed to add book:', error);
        showError(error.message || 'Failed to add book. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Handle search
function handleSearch() {
    if (!searchBooks) return;
    
    const query = searchBooks.value.toLowerCase().trim();
    
    if (!query) {
        renderBooks(allBooks);
        return;
    }
    
    const filteredBooks = allBooks.filter(book => 
        (book.title || '').toLowerCase().includes(query) || 
        (book.author || '').toLowerCase().includes(query)
    );
    
    renderBooks(filteredBooks);
}

// Handle logout
function handleLogout() {
    clearToken();
    redirectToLogin();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
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
                if (currentUser && currentUser.role === 'admin') {
                    e.preventDefault();
                    switchTab('users');
                }
                break;
            case '4':
                if (currentUser && currentUser.role === 'admin') {
                    e.preventDefault();
                    switchTab('admin');
                }
                break;
        }
    }
    
    if (e.key === 'Escape') {
        closeBookModal();
    }
}

// Utility Functions
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

function showLoading(container) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function showLoadingTable(tbody) {
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="4">
                <div class="spinner"></div>
                <span>Loading...</span>
            </td>
        </tr>
    `;
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const messageEl = notification.querySelector('.notification-message');
    const closeBtn = notification.querySelector('.notification-close');
    
    if (messageEl) messageEl.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    const timeoutId = setTimeout(() => {
        hideNotification();
    }, 5000);
    
    // Close button
    if (closeBtn) {
        closeBtn.onclick = () => {
            clearTimeout(timeoutId);
            hideNotification();
        };
    }
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
        notification.classList.add('hidden');
        notification.style.animation = '';
    }, 300);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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