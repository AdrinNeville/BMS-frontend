const API_BASE_URL = "https://bms-8ey2.onrender.com"
// console.log("API:", API_BASE_URL);


// Global state
let currentUser = null;
let currentTab = 'books';
let allBooks = [];
let borrowedBooks = [];
let selectedBookId = null;
let allUsers = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const booksGrid = document.getElementById('booksGrid');
const borrowedBooksList = document.getElementById('borrowedBooksList');
const usersTableBody = document.getElementById('usersTableBody');
const searchBooks = document.getElementById('searchBooks');
const addBookForm = document.getElementById('addBookForm');

// Modal elements
const bookModal = document.getElementById('bookModal');
const modalBookTitle = document.getElementById('modalBookTitle');
const modalBookAuthor = document.getElementById('modalBookAuthor');
const modalBookStatus = document.getElementById('modalBookStatus');
const modalCopiesInfo = document.getElementById('modalCopiesInfo');
const borrowBookBtn = document.getElementById('borrowBookBtn');
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');

// User info elements
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const logoutBtn = document.getElementById('logoutBtn');

// User Modal elements
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserRole = document.getElementById('modalUserRole');
const modalUserId = document.getElementById('modalUserId');

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
        item.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Tab clicked:', item.dataset.tab);
            switchTab(item.dataset.tab);
        });
    });
    
    // Search functionality
    if (searchBooks) {
        searchBooks.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Availability filter
    const availabilityFilter = document.getElementById('availabilityFilter');
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', handleAvailabilityFilter);
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

    // Admin section event listeners
    setupAdminEventListeners();
}

// Setup admin-specific event listeners
function setupAdminEventListeners() {
    // Manage book search
    const manageBookSearch = document.getElementById('manageBookSearch');
    if (manageBookSearch) {
        manageBookSearch.addEventListener('input', debounce(handleManageBookSearch, 300));
    }

    // User modals
    const closeUserModalBtn = document.getElementById('closeUserModalBtn');
    const cancelUserModal = document.getElementById('cancelUserModal');
    const changeRoleBtn = document.getElementById('changeRoleBtn');
    const deleteUserBtn = document.getElementById('deleteUserBtn');

    if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
    if (cancelUserModal) cancelUserModal.addEventListener('click', closeUserModal);

    // Book management modals
    const closeManageBookModal = document.getElementById('closeManageBookModal');
    const cancelManageBookModal = document.getElementById('cancelManageBookModal');
    const addCopiesBtn = document.getElementById('addCopiesBtn');
    const removeCopiesBtn = document.getElementById('removeCopiesBtn');

    if (closeManageBookModal) closeManageBookModal.addEventListener('click', closeManageBookModal);
    if (cancelManageBookModal) cancelManageBookModal.addEventListener('click', closeManageBookModal);
    if (addCopiesBtn) addCopiesBtn.addEventListener('click', handleAddCopies);
    if (removeCopiesBtn) removeCopiesBtn.addEventListener('click', handleRemoveCopies);
}

// Tab switching - FIXED
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    currentTab = tabName;
    
    // Update navigation
    navItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update content - FIXED the tab mapping
    tabContents.forEach(content => {
        // Map tab names to their corresponding content IDs
        let targetId;
        switch (tabName) {
            case 'books':
                targetId = 'booksTab';
                break;
            case 'borrowed':
                targetId = 'borrowedBooksTab'; // Fixed mapping
                break;
            case 'users':
                targetId = 'usersTabContent';
                break;
            case 'admin':
                targetId = 'adminTabContent';
                break;
            default:
                targetId = tabName + 'Tab';
        }
        
        if (content.id === targetId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
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
                loadAdminData()
            ]);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showError('Failed to load initial data. Please refresh the page.');
    }
}

// Load tab-specific data
function loadTabData(tabName) {
    console.log('Loading data for tab:', tabName);
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
            if (currentUser && currentUser.role === 'admin') loadAdminData();
            break;
    }
}

// Load books
async function loadBooks() {
    try {
        if (booksGrid) showLoading(booksGrid);
        const books = await makeAPIRequest('/books/');
        allBooks = Array.isArray(books) ? books : [];
        renderBooks(allBooks);
    } catch (error) {
        console.error('Failed to load books:', error);
        showError('Failed to load books. Please try again.');
        if (booksGrid) renderBooksError();
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

// Load borrowed books - ENHANCED
async function loadBorrowedBooks() {
    try {
        if (borrowedBooksList) showLoading(borrowedBooksList);
        const borrowed = await makeAPIRequest('/borrow/my-borrows');
        borrowedBooks = Array.isArray(borrowed) ? borrowed : [];
        console.log('Loaded borrowed books:', borrowedBooks);
        
        // If we have borrowed books, enhance them with book details
        if (borrowedBooks.length > 0) {
            await enhanceBorrowedBooksWithDetails();
        }
        
        renderBorrowedBooks(borrowedBooks);
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        showError('Failed to load borrowed books. Please try again.');
        if (borrowedBooksList) renderBorrowedBooksError();
    }
}

// Enhance borrowed books with full book details
async function enhanceBorrowedBooksWithDetails() {
    for (let borrow of borrowedBooks) {
        if (borrow.book_id && !borrow.book) {
            try {
                const bookDetails = await makeAPIRequest(`/books/${borrow.book_id}`);
                borrow.book = bookDetails;
            } catch (error) {
                console.warn(`Failed to fetch details for book ${borrow.book_id}:`, error);
                // Set fallback book info
                borrow.book = {
                    title: `Book ID: ${borrow.book_id}`,
                    author: 'Unknown Author'
                };
            }
        }
    }
}

// Render borrowed books - ENHANCED
function renderBorrowedBooks(borrowed) {
    if (!borrowedBooksList) return;
    
    console.log('Rendering borrowed books:', borrowed);
    
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
        // Get book info
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
                    ${isReturned ? 
                        `<span>Returned: ${returnDate}</span>` : 
                        '<span class="status-badge borrowed">Currently Borrowed</span>'
                    }
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
        allUsers=Array.isArray(users) ? users : [];
        renderUsers(allUsers);
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users. Please try again.');
        if (usersTableBody) renderUsersError();
    }
}

// Render users
function renderUsers(users) {
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
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
                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="openUserModal('${user.id}')">
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
            <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                Failed to load users. Please try again.
            </td>
        </tr>
    `;
}

// Load admin data
async function loadAdminData() {
    try {
        await Promise.all([
            loadManageBooks(),
            loadCurrentBorrows(),
            loadOverdueBooks()
        ]);
    } catch (error) {
        console.error('Failed to load admin data:', error);
    }
}

// Load books for management
async function loadManageBooks() {
    const manageBooksList = document.getElementById('manageBooksList');
    if (!manageBooksList) return;

    try {
        showLoading(manageBooksList);
        const books = await makeAPIRequest('/books/');
        renderManageBooks(Array.isArray(books) ? books : []);
    } catch (error) {
        console.error('Failed to load books for management:', error);
        manageBooksList.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load books</h3>
                <p>Please try again.</p>
            </div>
        `;
    }
}

// Render books for management
function renderManageBooks(books) {
    const manageBooksList = document.getElementById('manageBooksList');
    if (!manageBooksList) return;

    if (books.length === 0) {
        manageBooksList.innerHTML = `
            <div class="empty-state">
                <h3>No books found</h3>
                <p>Add some books to manage them.</p>
            </div>
        `;
        return;
    }

    manageBooksList.innerHTML = books.map(book => `
        <div class="manage-book-item">
            <div class="manage-book-info">
                <h4>${escapeHtml(book.title || '')}</h4>
                <p>by ${escapeHtml(book.author || 'Unknown')}</p>
                <small>ID: ${book.id} | Copies: ${book.available_copies}/${book.total_copies}</small>
            </div>
            <div class="manage-book-actions">
                <button class="btn btn-secondary" onclick="openManageBookModal(${book.id})">
                    Manage Copies
                </button>
            </div>
        </div>
    `).join('');
}

// Load current borrows
async function loadCurrentBorrows() {
    const currentBorrows = document.getElementById('currentBorrows');
    if (!currentBorrows) return;

    try {
        showLoading(currentBorrows);
        const borrows = await makeAPIRequest('/borrow/all');
        const activeBorrows = borrows.filter(b => !b.returned_at);
        renderCurrentBorrows(activeBorrows);
    } catch (error) {
        console.error('Failed to load current borrows:', error);
        currentBorrows.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load current borrows</h3>
                <p>Please try again.</p>
            </div>
        `;
    }
}

// Render current borrows
function renderCurrentBorrows(borrows) {
    const currentBorrows = document.getElementById('currentBorrows');
    if (!currentBorrows) return;

    if (borrows.length === 0) {
        currentBorrows.innerHTML = `
            <div class="empty-state">
                <h3>No active borrows</h3>
                <p>No books are currently borrowed.</p>
            </div>
        `;
        return;
    }

    currentBorrows.innerHTML = borrows.map(borrow => {
        const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
        return `
            <div class="current-borrow-item">
                <div class="borrow-info">
                    <strong>Book ID:</strong> ${borrow.book_id} | 
                    <strong>User ID:</strong> ${borrow.user_id}
                </div>
                <div class="borrow-meta">
                    <span>Borrowed: ${borrowDate}</span>
                    <button class="btn btn-success" onclick="forceReturnBook('${borrow.id}')">
                        Force Return
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load overdue books
async function loadOverdueBooks() {
    const overdueBooks = document.getElementById('overdueBooks');
    if (!overdueBooks) return;

    try {
        showLoading(overdueBooks);
        const overdue = await makeAPIRequest('/borrow/overdue');
        renderOverdueBooks(Array.isArray(overdue) ? overdue : []);
    } catch (error) {
        console.error('Failed to load overdue books:', error);
        overdueBooks.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load overdue books</h3>
                <p>Please try again.</p>
            </div>
        `;
    }
}

// Render overdue books
function renderOverdueBooks(overdue) {
    const overdueBooks = document.getElementById('overdueBooks');
    if (!overdueBooks) return;

    if (overdue.length === 0) {
        overdueBooks.innerHTML = `
            <div class="empty-state">
                <h3>No overdue books</h3>
                <p>All books are returned on time!</p>
            </div>
        `;
        return;
    }

    overdueBooks.innerHTML = overdue.map(item => `
        <div class="overdue-book-item">
            <div class="overdue-info">
                <h4>${escapeHtml(item.book_title || '')}</h4>
                <p>by ${escapeHtml(item.book_author || 'Unknown')}</p>
                <p><strong>User:</strong> ${escapeHtml(item.user_name || '')} (${escapeHtml(item.user_email || '')})</p>
            </div>
            <div class="overdue-meta">
                <span class="days-overdue">${item.days_overdue} days overdue</span>
                <button class="btn btn-danger" onclick="forceReturnBook('${item.borrow_id}')">
                    Force Return
                </button>
            </div>
        </div>
    `).join('');
}

// Open book modal
function openBookModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    selectedBookId = bookId;
    
    if (modalBookTitle) modalBookTitle.textContent = book.title || 'Unknown Title';
    if (modalBookAuthor) modalBookAuthor.textContent = `by ${book.author || 'Unknown Author'}`;
    
    const availableCopies = book.available_copies || (book.available ? 1 : 0);
    const totalCopies = book.total_copies || 1;
    const isAvailable = availableCopies > 0;
    
    if (modalCopiesInfo) {
        modalCopiesInfo.textContent = `Available: ${availableCopies}/${totalCopies}`;
    }
    
    if (modalBookStatus) {
        modalBookStatus.textContent = isAvailable ? 'Available' : 'Not Available';
        modalBookStatus.className = `status-badge ${isAvailable ? 'available' : 'borrowed'}`;
    }
    
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
            await loadCurrentBorrows();
            await loadOverdueBooks();
        }
        
    } catch (error) {
        console.error('Failed to return book:', error);
        showError(error.message || 'Failed to return book. Please try again.');
    } finally {
        setButtonLoading(button, false);
    }
}

// Force return book (admin only)
async function forceReturnBook(borrowId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showError('Admin access required');
        return;
    }

    const button = event.target.closest('button');
    
    try {
        setButtonLoading(button, true);
        
        await makeAPIRequest(`/borrow/admin/${borrowId}/force-return`, {
            method: 'PATCH'
        });
        
        showSuccess('Book returned successfully by admin!');
        
        // Refresh admin data
        await loadBooks();
        await loadCurrentBorrows();
        await loadOverdueBooks();
        
    } catch (error) {
        console.error('Failed to force return book:', error);
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
    const copiesInput = document.getElementById('bookCopies');
    
    if (!titleInput || !authorInput) {
        showError('Form fields not found.');
        return;
    }
    
    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const copies = copiesInput ? parseInt(copiesInput.value) || 1 : 1;
    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    
    if (!title || !author) {
        showError('Please fill in all required fields.');
        return;
    }
    
    try {
        setButtonLoading(submitBtn, true);
        
        await makeAPIRequest('/books/', {
            method: 'POST',
            body: JSON.stringify({ title, author, total_copies: copies })
        });
        
        showSuccess('Book added successfully!');
        addBookForm.reset();
        
        // Refresh books
        await loadBooks();
        if (currentUser && currentUser.role === 'admin') {
            await loadManageBooks();
        }
        
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

// Handle availability filter
function handleAvailabilityFilter() {
    const availabilityFilter = document.getElementById('availabilityFilter');
    if (!availabilityFilter) return;
    
    const filterValue = availabilityFilter.value;
    let filteredBooks;
    
    switch (filterValue) {
        case 'available':
            filteredBooks = allBooks.filter(book => 
                (book.available_copies || 0) > 0
            );
            break;
        case 'borrowed':
            filteredBooks = allBooks.filter(book => 
                (book.available_copies || 0) === 0
            );
            break;
        default:
            filteredBooks = allBooks;
    }
    
    renderBooks(filteredBooks);
}

// Handle manage book search
function handleManageBookSearch() {
    const manageBookSearch = document.getElementById('manageBookSearch');
    if (!manageBookSearch) return;
    
    const query = manageBookSearch.value.toLowerCase().trim();
    
    if (!query) {
        loadManageBooks();
        return;
    }
    
    const filteredBooks = allBooks.filter(book => 
        (book.title || '').toLowerCase().includes(query) || 
        (book.author || '').toLowerCase().includes(query)
    );
    
    renderManageBooks(filteredBooks);
}

// User modal functions
function openUserModal(userId) {
    const userModal = document.getElementById('userModal');
    if (!userModal) return;

    // 1. Show modal
    userModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // 2. Find user data
    const user = allUsers.find(u => u.id === userId || u._id === userId);
    if (!user) {
        console.error('User not found:', userId);
        return;
    }

    // 3. Populate modal content
    document.getElementById('modalUserName').textContent = user.name || 'N/A';
    document.getElementById('modalUserEmail').textContent = user.email || 'N/A';
    document.getElementById('modalUserRole').textContent = user.role || 'member';
    document.getElementById('modalUserId').textContent = user.id || user._id || 'N/A';

    // 4. Set current role in dropdown
    const roleSelect = document.getElementById('newUserRole');
    roleSelect.value = user.role || 'member';

    // 5. Bind role change button
    document.getElementById('changeRoleBtn').onclick = () => {
    const userId = document.getElementById("modalUserId").textContent;
    const newRole = document.getElementById("newUserRole").value;
    handleChangeUserRole(userId, newRole);
};


    // 6. Bind delete button
    document.getElementById('deleteUserBtn').onclick = () => {
        handleDeleteUser(user.id || user._id);
    };

    // 7. Bind close buttons
    document.getElementById('cancelUserModal').onclick = closeUserModal;
    document.getElementById('closeUserModalBtn').onclick = closeUserModal;

    console.log('Opened user modal for:', userId);
}

async function handleChangeUserRole(userId, newRole) {
    console.log(`Changing role for user ${userId} to ${newRole}`);

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/role?new_role=${newRole}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            }
        });

        let data;
        if (!response.ok) {
            // Try parsing as JSON error first
            try {
                const err = await response.json();
                throw new Error(err.detail || "Failed to update role");
            } catch {
                // Fallback to raw text if not JSON
                const text = await response.text();
                throw new Error(text || "Failed to update role");
            }
        } else {
            data = await response.json();
        }

        // ✅ Update local cache and re-render users table
        if (typeof allUsers !== "undefined") {
            allUsers = allUsers.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            );
            renderUsers(allUsers);
        }

        // ✅ User + dev feedback
        alert(data.message || "Role updated successfully");
        console.log("Role updated successfully:", data);

    } catch (error) {
        console.error("Error changing user role:", error);
        alert(`Error: ${error.message}`);
    }
}

async function handleDeleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {
        console.log(`Deleting user ${userId}`);

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to delete user");
        }

        const data = await response.json();

        // Remove from local allUsers
        allUsers = allUsers.filter(user => (user.id || user._id) !== userId);


        // Re-render the users table
        renderUsers(allUsers);

        alert(data.message || "User deleted successfully");
        console.log("User deleted successfully:", data);
    } catch (error) {
        console.error("Error deleting user:", error);
        alert(`Error: ${error.message}`);
    }
}

function closeUserModal() {
    const userModal = document.getElementById('userModal');
    if (userModal) {
        userModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Book management modal functions
function openManageBookModal(bookId) {
    const manageBookModal = document.getElementById('manageBookModal');
    const book = allBooks.find(b => b.id === bookId);
    
    if (!book || !manageBookModal) return;
    
    // Populate modal with book data
    document.getElementById('manageModalBookTitle').textContent = book.title || 'Unknown';
    document.getElementById('manageModalBookAuthor').textContent = book.author || 'Unknown';
    document.getElementById('manageModalBookId').textContent = book.id;
    document.getElementById('manageModalTotalCopies').textContent = book.total_copies || 1;
    document.getElementById('manageModalAvailableCopies').textContent = book.available_copies || 0;
    document.getElementById('manageModalBorrowedCopies').textContent = book.borrowed_copies || 0;
    
    // Store book ID for actions
    manageBookModal.dataset.bookId = bookId;
    
    manageBookModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeManageBookModal() {
    const manageBookModal = document.getElementById('manageBookModal');
    if (manageBookModal) {
        manageBookModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

async function handleAddCopies() {
    const manageBookModal = document.getElementById('manageBookModal');
    const copiesToAddInput = document.getElementById('copiesToAdd');
    const addCopiesBtn = document.getElementById('addCopiesBtn');
    
    if (!manageBookModal || !copiesToAddInput) return;
    
    const bookId = manageBookModal.dataset.bookId;
    const copiesToAdd = parseInt(copiesToAddInput.value) || 1;
    
    if (copiesToAdd <= 0) {
        showError('Number of copies must be positive');
        return;
    }
    
    try {
        setButtonLoading(addCopiesBtn, true);
        
        await makeAPIRequest(`/books/${bookId}/add-copies?copies=${copiesToAdd}`, {
            method: 'PATCH'
        });
        
        showSuccess(`Added ${copiesToAdd} copies successfully!`);
        copiesToAddInput.value = '1';
        
        // Refresh data and close modal
        await loadBooks();
        await loadManageBooks();
        closeManageBookModal();
        
    } catch (error) {
        console.error('Failed to add copies:', error);
        showError(error.message || 'Failed to add copies. Please try again.');
    } finally {
        setButtonLoading(addCopiesBtn, false);
    }
}

async function handleRemoveCopies() {
    const manageBookModal = document.getElementById('manageBookModal');
    const copiesToRemoveInput = document.getElementById('copiesToRemove');
    const removeCopiesBtn = document.getElementById('removeCopiesBtn');
    
    if (!manageBookModal || !copiesToRemoveInput) return;
    
    const bookId = manageBookModal.dataset.bookId;
    const copiesToRemove = parseInt(copiesToRemoveInput.value) || 1;
    
    if (copiesToRemove <= 0) {
        showError('Number of copies must be positive');
        return;
    }
    
    try {
        setButtonLoading(removeCopiesBtn, true);
        
        await makeAPIRequest(`/books/${bookId}/remove-copies?copies=${copiesToRemove}`, {
            method: 'PATCH'
        });
        
        showSuccess(`Removed ${copiesToRemove} copies successfully!`);
        copiesToRemoveInput.value = '1';
        
        // Refresh data and close modal
        await loadBooks();
        await loadManageBooks();
        closeManageBookModal();
        
    } catch (error) {
        console.error('Failed to remove copies:', error);
        showError(error.message || 'Failed to remove copies. Please try again.');
    } finally {
        setButtonLoading(removeCopiesBtn, false);
    }
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
        closeUserModal();
        closeManageBookModal();
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
            <td colspan="5">
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
    if (!notification) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
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