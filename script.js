// Configuration
const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your FastAPI server URL

// Global state
let currentUser = null;
let currentTab = 'books';
let allBooks = [];
let borrowedBooks = [];
let allUsers = [];
let selectedBookId = null;
let selectedUserId = null;
let selectedManageBookId = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const booksGrid = document.getElementById('booksGrid');
const borrowedBooksList = document.getElementById('borrowedBooksList');
const usersTableBody = document.getElementById('usersTableBody');
const searchBooks = document.getElementById('searchBooks');
const availabilityFilter = document.getElementById('availabilityFilter');
const addBookForm = document.getElementById('addBookForm');
const manageBookSearch = document.getElementById('manageBookSearch');
const manageBooksList = document.getElementById('manageBooksList');
const currentBorrows = document.getElementById('currentBorrows');
const overdueBooks = document.getElementById('overdueBooks');

// Modal elements
const bookModal = document.getElementById('bookModal');
const modalBookTitle = document.getElementById('modalBookTitle');
const modalBookAuthor = document.getElementById('modalBookAuthor');
const modalBookStatus = document.getElementById('modalBookStatus');
const modalCopiesInfo = document.getElementById('modalCopiesInfo');
const borrowBookBtn = document.getElementById('borrowBookBtn');
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');

// User modal elements
const userModal = document.getElementById('userModal');
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserRole = document.getElementById('modalUserRole');
const modalUserId = document.getElementById('modalUserId');
const newUserRole = document.getElementById('newUserRole');
const changeRoleBtn = document.getElementById('changeRoleBtn');
const deleteUserBtn = document.getElementById('deleteUserBtn');
const userActiveBorrows = document.getElementById('userActiveBorrows');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const cancelUserModal = document.getElementById('cancelUserModal');

// Manage book modal elements
const manageBookModal = document.getElementById('manageBookModal');
const manageModalBookTitle = document.getElementById('manageModalBookTitle');
const manageModalBookAuthor = document.getElementById('manageModalBookAuthor');
const manageModalBookId = document.getElementById('manageModalBookId');
const manageModalTotalCopies = document.getElementById('manageModalTotalCopies');
const manageModalAvailableCopies = document.getElementById('manageModalAvailableCopies');
const manageModalBorrowedCopies = document.getElementById('manageModalBorrowedCopies');
const copiesToAdd = document.getElementById('copiesToAdd');
const copiesToRemove = document.getElementById('copiesToRemove');
const addCopiesBtn = document.getElementById('addCopiesBtn');
const removeCopiesBtn = document.getElementById('removeCopiesBtn');
const closeManageBookModalBtn = document.getElementById('closeManageBookModal');
const cancelManageBookModal = document.getElementById('cancelManageBookModal');

// Report elements
const totalBooks = document.getElementById('totalBooks');
const totalUsers = document.getElementById('totalUsers');
const activeBorrows = document.getElementById('activeBorrows');
const overdueCount = document.getElementById('overdueCount');
const popularBooks = document.getElementById('popularBooks');

// User info elements
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const logoutBtn = document.getElementById('logoutBtn');

function closeUserModal() {
    userModal.classList.add('hidden');
    selectedUserId = null;
}

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

async function makeAPIRequest(endpoint, options = {}) {
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

        if (response.status === 401) {
            clearToken();
            redirectToLogin();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'An error occurred');
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
    userName.textContent = user.name;
    userRole.textContent = user.role;
    userInitials.textContent = user.name.charAt(0).toUpperCase();
    
    // Show admin tabs if user is admin
    if (user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.add('show');
            el.classList.remove('hidden');
        });
    }
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
                loadReports(),
                loadCurrentBorrows(),
                loadOverdueBooks()
            ]);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showNotification('Failed to load data', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', logout);

    // Search and filters
    searchBooks.addEventListener('input', debounce(filterBooks, 300));
    availabilityFilter.addEventListener('change', filterBooks);
    manageBookSearch.addEventListener('input', debounce(filterManageBooks, 300));

    // Modals
    closeModal.addEventListener('click', closeBookModal);
    cancelModal.addEventListener('click', closeBookModal);
    closeUserModalBtn.addEventListener('click', closeUserModal);
    cancelUserModal.addEventListener('click', closeUserModal);
    closeManageBookModalBtn.addEventListener('click', closeManageBookModal);
    cancelManageBookModal.addEventListener('click', closeManageBookModal);

    // Modal actions
    borrowBookBtn.addEventListener('click', borrowBook);
    changeRoleBtn.addEventListener('click', changeUserRole);
    deleteUserBtn.addEventListener('click', deleteUser);
    addCopiesBtn.addEventListener('click', addBookCopies);
    removeCopiesBtn.addEventListener('click', removeBookCopies);

    // Forms
    addBookForm.addEventListener('submit', addBook);

    // Click outside modal to close
    bookModal.addEventListener('click', (e) => {
        if (e.target === bookModal) closeBookModal();
    });
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) closeUserModal();
    });
    manageBookModal.addEventListener('click', (e) => {
        if (e.target === manageBookModal) closeManageBookModal();
    });
}

// Navigation functions
function switchTab(tabName) {
    // Update nav items
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });

    // Update tab content
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    const activeTab = document.getElementById(getTabContentId(tabName));
    if (activeTab) {
        activeTab.classList.add('active');
    }

    currentTab = tabName;

    // Load data for specific tabs
    if (tabName === 'borrowed') {
        loadBorrowedBooks();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'reports') {
        loadReports();
    } else if (tabName === 'admin') {
        loadCurrentBorrows();
        loadOverdueBooks();
        loadManageBooks();
    }
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

// Logout function
function logout() {
    clearToken();
    redirectToLogin();
}

// Book functions
async function loadBooks() {
    try {
        allBooks = await makeAPIRequest('/books');
        renderBooks(allBooks);
    } catch (error) {
        console.error('Failed to load books:', error);
        showNotification('Failed to load books', 'error');
    }
}

function renderBooks(books) {
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <h3>No books found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    booksGrid.innerHTML = books.map(book => {
        const availableCopies = book.total_copies - book.borrowed_copies;
        const statusClass = availableCopies > 0 ? 'available' : 'borrowed';
        const statusText = availableCopies > 0 ? 'Available' : 'Not Available';
        
        return `
            <div class="book-card" onclick="openBookModal(${book.id})">
                <div class="book-cover">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                </div>
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">by ${escapeHtml(book.author)}</p>
                <div class="book-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="book-id">#${book.id}</span>
                </div>
                <div class="book-copies-info">
                    <span>Available: ${availableCopies}/${book.total_copies}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterBooks() {
    const searchTerm = searchBooks.value.toLowerCase();
    const availabilityValue = availabilityFilter.value;
    
    let filteredBooks = allBooks.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm) || 
                             book.author.toLowerCase().includes(searchTerm);
        
        let matchesAvailability = true;
        if (availabilityValue === 'available') {
            matchesAvailability = (book.total_copies - book.borrowed_copies) > 0;
        } else if (availabilityValue === 'borrowed') {
            matchesAvailability = (book.total_copies - book.borrowed_copies) === 0;
        }
        
        return matchesSearch && matchesAvailability;
    });
    
    renderBooks(filteredBooks);
}

// Book modal functions
function openBookModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    selectedBookId = bookId;
    modalBookTitle.textContent = book.title;
    modalBookAuthor.textContent = `by ${book.author}`;
    
    const availableCopies = book.total_copies - book.borrowed_copies;
    modalCopiesInfo.textContent = `Available: ${availableCopies}/${book.total_copies}`;
    
    const statusClass = availableCopies > 0 ? 'available' : 'borrowed';
    const statusText = availableCopies > 0 ? 'Available' : 'Not Available';
    modalBookStatus.className = `status-badge ${statusClass}`;
    modalBookStatus.textContent = statusText;
    
    // Update borrow button
    const borrowBtnText = borrowBookBtn.querySelector('.btn-text');
    if (availableCopies > 0) {
        borrowBtnText.textContent = 'Borrow Book';
        borrowBookBtn.disabled = false;
    } else {
        borrowBtnText.textContent = 'Not Available';
        borrowBookBtn.disabled = true;
    }
    
    bookModal.classList.remove('hidden');
}

function closeBookModal() {
    bookModal.classList.add('hidden');
    selectedBookId = null;
}

async function borrowBook() {
    if (!selectedBookId) return;
    
    const btnText = borrowBookBtn.querySelector('.btn-text');
    const btnSpinner = borrowBookBtn.querySelector('.btn-spinner');
    
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    borrowBookBtn.disabled = true;
    
    try {
        await makeAPIRequest(`/borrow/${selectedBookId}`, {
            method: 'POST'
        });
        
        showNotification('Book borrowed successfully!', 'success');
        closeBookModal();
        
        // Refresh data
        await loadBooks();
        await loadBorrowedBooks();
        
        if (currentUser.role === 'admin') {
            await loadCurrentBorrows();
            await loadReports();
        }
    } catch (error) {
        console.error('Failed to borrow book:', error);
        showNotification(error.message || 'Failed to borrow book', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        borrowBookBtn.disabled = false;
    }
}

// Borrowed books functions
async function loadBorrowedBooks() {
    try {
        borrowedBooks = await makeAPIRequest('/borrow/my-borrows');
        renderBorrowedBooks(borrowedBooks);
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        showNotification('Failed to load borrowed books', 'error');
    }
}

function renderBorrowedBooks(books) {
    if (books.length === 0) {
        borrowedBooksList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <h3>No borrowed books</h3>
                <p>You haven't borrowed any books yet</p>
            </div>
        `;
        return;
    }

    borrowedBooksList.innerHTML = books.map(borrow => {
        const borrowDate = new Date(borrow.borrow_date).toLocaleDateString();
        const dueDate = new Date(borrow.due_date).toLocaleDateString();
        const isOverdue = new Date() > new Date(borrow.due_date);
        const overdueDays = isOverdue ? 
            Math.ceil((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24)) : 0;
        
        return `
            <div class="borrowed-book-item ${isOverdue ? 'overdue' : ''}">
                <div class="borrowed-book-header">
                    <div class="borrowed-book-info">
                        <h3>${escapeHtml(borrow.book.title)}</h3>
                        <p>by ${escapeHtml(borrow.book.author)}</p>
                    </div>
                    <div class="borrowed-book-actions">
                        <button class="btn btn-primary" onclick="returnBook(${borrow.id})">Return Book</button>
                    </div>
                </div>
                <div class="borrowed-book-meta">
                    <span><strong>Borrowed:</strong> ${borrowDate}</span>
                    <span><strong>Due:</strong> ${dueDate}</span>
                    ${isOverdue ? `<span class="overdue-days"><strong>Overdue by ${overdueDays} days</strong></span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function returnBook(borrowId) {
    try {
        await makeAPIRequest(`/borrow/${borrowId}/return`, {
            method: 'POST'
        });
        
        showNotification('Book returned successfully!', 'success');
        
        // Refresh data
        await loadBorrowedBooks();
        await loadBooks();
        
        if (currentUser.role === 'admin') {
            await loadCurrentBorrows();
            await loadReports();
        }
    } catch (error) {
        console.error('Failed to return book:', error);
        showNotification(error.message || 'Failed to return book', 'error');
    }
}

// User management functions
async function loadUsers() {
    if (currentUser.role !== 'admin') return;
    
    try {
        allUsers = await makeAPIRequest('/users');
        renderUsers(allUsers);
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users', 'error');
    }
}

function renderUsers(users) {
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <h3>No users found</h3>
                    <p>No users are registered in the system</p>
                </td>
            </tr>
        `;
        return;
    }

    usersTableBody.innerHTML = users.map(user => `
        <tr onclick="openUserModal(${user.id})" style="cursor: pointer;">
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="status-badge ${user.role === 'admin' ? 'borrowed' : 'available'}">${user.role}</span></td>
            <td>${user.active_borrows || 0}</td>
            <td>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); openUserModal(${user.id})">
                    Manage
                </button>
            </td>
        </tr>
    `).join('');
}

// User modal functions
function openUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    selectedUserId = userId;
    modalUserName.textContent = user.name;
    modalUserEmail.textContent = user.email;
    modalUserRole.textContent = user.role;
    modalUserId.textContent = user.id;
    newUserRole.value = user.role;
    
    // Load user's active borrows
    loadUserBorrows(userId);
    
    userModal.classList.remove('hidden');
}

async function loadUserBorrows(userId) {
    try {
        const borrows = await makeAPIRequest(`users/${userId}/borrows`);
        
        if (borrows.length === 0) {
            userActiveBorrows.innerHTML = '<p>No active borrows</p>';
            return;
        }
        
        userActiveBorrows.innerHTML = borrows.map(borrow => {
            const borrowDate = new Date(borrow.borrow_date).toLocaleDateString();
            const dueDate = new Date(borrow.due_date).toLocaleDateString();
            const isOverdue = new Date() > new Date(borrow.due_date);
            
            return `
                <div class="borrow-item ${isOverdue ? 'overdue' : ''}">
                    <div class="borrow-info">
                        <h4>${escapeHtml(borrow.book.title)}</h4>
                        <p>by ${escapeHtml(borrow.book.author)}</p>
                    </div>
                    <div class="borrow-meta">
                        <span>Borrowed: ${borrowDate}</span>
                        <span>Due: ${dueDate}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load user borrows:', error);
        userActiveBorrows.innerHTML = '<p>Failed to load borrows</p>';
    }
}

async function changeUserRole() {
    if (!selectedUserId) return;
    
    const newRole = newUserRole.value;
    
    try {
        await makeAPIRequest(`/users/${selectedUserId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        
        showNotification('User role updated successfully!', 'success');
        closeUserModal();
        await loadUsers();
    } catch (error) {
        console.error('Failed to update user role:', error);
        showNotification(error.message || 'Failed to update user role', 'error');
    }
}

async function deleteUser() {
    if (!selectedUserId) return;
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        await makeAPIRequest(`/users/${selectedUserId}`, {
            method: 'DELETE'
        });
        
        showNotification('User deleted successfully!', 'success');
        closeUserModal();
        await loadUsers();
    } catch (error) {
        console.error('Failed to delete user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    }
}

// Admin functions
async function addBook(e) {
    e.preventDefault();
    
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const copies = parseInt(document.getElementById('bookCopies').value);
    
    const btnText = addBookForm.querySelector('.btn-text');
    const btnSpinner = addBookForm.querySelector('.btn-spinner');
    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
    
    try {
        await makeAPIRequest('/books', {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                author: author,
                total_copies: copies
            })
        });
        
        showNotification('Book added successfully!', 'success');
        addBookForm.reset();
        document.getElementById('bookCopies').value = 1;
        
        // Refresh data
        await loadBooks();
        await loadManageBooks();
        
        if (currentTab === 'reports') {
            await loadReports();
        }
    } catch (error) {
        console.error('Failed to add book:', error);
        showNotification(error.message || 'Failed to add book', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

async function loadManageBooks() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const books = await makeAPIRequest('/books');
        allBooks = books;
        renderManageBooks(books);
    } catch (error) {
        console.error('Failed to load manage books:', error);
        showNotification('Failed to load books for management', 'error');
    }
}

function renderManageBooks(books) {
    if (books.length === 0) {
        manageBooksList.innerHTML = `
            <div class="empty-state">
                <h3>No books found</h3>
                <p>Add some books to manage them</p>
            </div>
        `;
        return;
    }

    manageBooksList.innerHTML = books.map(book => {
        const availableCopies = book.total_copies - book.borrowed_copies;
        
        return `
            <div class="manage-book-item" onclick="openManageBookModal(${book.id})">
                <div class="manage-book-info">
                    <h4>${escapeHtml(book.title)}</h4>
                    <p>by ${escapeHtml(book.author)}</p>
                </div>
                <div class="manage-book-stats">
                    <span>Total: ${book.total_copies}</span><br>
                    <span>Available: ${availableCopies}</span><br>
                    <span>Borrowed: ${book.borrowed_copies}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterManageBooks() {
    const searchTerm = manageBookSearch.value.toLowerCase();
    
    const filteredBooks = allBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) || 
        book.author.toLowerCase().includes(searchTerm)
    );
    
    renderManageBooks(filteredBooks);
}

// Manage book modal functions
function openManageBookModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    selectedManageBookId = bookId;
    manageModalBookTitle.textContent = book.title;
    manageModalBookAuthor.textContent = book.author;
    manageModalBookId.textContent = book.id;
    manageModalTotalCopies.textContent = book.total_copies;
    manageModalAvailableCopies.textContent = book.total_copies - book.borrowed_copies;
    manageModalBorrowedCopies.textContent = book.borrowed_copies;
    
    copiesToAdd.value = 1;
    copiesToRemove.value = 1;
    
    manageBookModal.classList.remove('hidden');
}

function closeManageBookModal() {
    manageBookModal.classList.add('hidden');
    selectedManageBookId = null;
}

async function addBookCopies() {
    if (!selectedManageBookId) return;
    
    const copies = parseInt(copiesToAdd.value);
    if (!copies || copies < 1) {
        showNotification('Please enter a valid number of copies', 'error');
        return;
    }
    
    try {
        await makeAPIRequest(`/books/${selectedManageBookId}/copies`, {
            method: 'POST',
            body: JSON.stringify({ copies: copies })
        });
        
        showNotification('Copies added successfully!', 'success');
        
        // Refresh data
        await loadBooks();
        await loadManageBooks();
        
        // Update modal
        const book = allBooks.find(b => b.id === selectedManageBookId);
        if (book) {
            manageModalTotalCopies.textContent = book.total_copies;
            manageModalAvailableCopies.textContent = book.total_copies - book.borrowed_copies;
        }
        
        copiesToAdd.value = 1;
    } catch (error) {
        console.error('Failed to add copies:', error);
        showNotification(error.message || 'Failed to add copies', 'error');
    }
}

async function removeBookCopies() {
    if (!selectedManageBookId) return;
    
    const copies = parseInt(copiesToRemove.value);
    if (!copies || copies < 1) {
        showNotification('Please enter a valid number of copies', 'error');
        return;
    }
    
    const book = allBooks.find(b => b.id === selectedManageBookId);
    if (book && copies > (book.total_copies - book.borrowed_copies)) {
        showNotification('Cannot remove more copies than available', 'error');
        return;
    }
    
    try {
        await makeAPIRequest(`/books/${selectedManageBookId}/copies`, {
            method: 'DELETE',
            body: JSON.stringify({ copies: copies })
        });
        
        showNotification('Copies removed successfully!', 'success');
        
        // Refresh data
        await loadBooks();
        await loadManageBooks();
        
        // Update modal
        const updatedBook = allBooks.find(b => b.id === selectedManageBookId);
        if (updatedBook) {
            manageModalTotalCopies.textContent = updatedBook.total_copies;
            manageModalAvailableCopies.textContent = updatedBook.total_copies - updatedBook.borrowed_copies;
        }
        
        copiesToRemove.value = 1;
    } catch (error) {
        console.error('Failed to remove copies:', error);
        showNotification(error.message || 'Failed to remove copies', 'error');
    }
}

// Current borrows and overdue functions
async function loadCurrentBorrows() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const borrows = await makeAPIRequest('/borrow/all');
        renderCurrentBorrows(borrows);
    } catch (error) {
        console.error('Failed to load current borrows:', error);
        currentBorrows.innerHTML = '<p>Failed to load current borrows</p>';
    }
}

function renderCurrentBorrows(borrows) {
    if (borrows.length === 0) {
        currentBorrows.innerHTML = `
            <div class="empty-state">
                <h3>No active borrows</h3>
                <p>No books are currently borrowed</p>
            </div>
        `;
        return;
    }

    currentBorrows.innerHTML = borrows.map(borrow => {
        const borrowDate = new Date(borrow.borrow_date).toLocaleDateString();
        const dueDate = new Date(borrow.due_date).toLocaleDateString();
        
        return `
            <div class="borrow-item">
                <div class="borrow-info">
                    <h4>${escapeHtml(borrow.book.title)}</h4>
                    <p>Borrowed by ${escapeHtml(borrow.user.name)}</p>
                </div>
                <div class="borrow-meta">
                    <span>Borrowed: ${borrowDate}</span>
                    <span>Due: ${dueDate}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function loadOverdueBooks() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const overdueList = await makeAPIRequest('/borrow/overdue');
        renderOverdueBooks(overdueList);
    } catch (error) {
        console.error('Failed to load overdue books:', error);
        overdueBooks.innerHTML = '<p>Failed to load overdue books</p>';
    }
}

function renderOverdueBooks(overdueList) {
    if (overdueList.length === 0) {
        overdueBooks.innerHTML = `
            <div class="empty-state">
                <h3>No overdue books</h3>
                <p>All books are returned on time</p>
            </div>
        `;
        return;
    }

    overdueBooks.innerHTML = overdueList.map(borrow => {
        const borrowDate = new Date(borrow.borrow_date).toLocaleDateString();
        const dueDate = new Date(borrow.due_date).toLocaleDateString();
        const overdueDays = Math.ceil((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="overdue-item">
                <div class="overdue-info">
                    <h4>${escapeHtml(borrow.book.title)}</h4>
                    <p>Borrowed by ${escapeHtml(borrow.user.name)}</p>
                </div>
                <div class="overdue-meta">
                    <span>Due: ${dueDate}</span>
                    <span class="overdue-days">${overdueDays} days overdue</span>
                </div>
            </div>
        `;
    }).join('');
}

// Reports functions
async function loadReports() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const reports = await makeAPIRequest('/borrow/stats/${book_id}');
        renderReports(reports);
    } catch (error) {
        console.error('Failed to load reports:', error);
        showNotification('Failed to load reports', 'error');
    }
}

function renderReports(reports) {
    // Update stats cards
    totalBooks.textContent = reports.total_books || '-';
    totalUsers.textContent = reports.total_users || '-';
    activeBorrows.textContent = reports.active_borrows || '-';
    overdueCount.textContent = reports.overdue_count || '-';
    
    // Render popular books
    renderPopularBooks(reports.popular_books || []);
}

function renderPopularBooks(books) {
    if (books.length === 0) {
        popularBooks.innerHTML = `
            <div class="empty-state">
                <h3>No data available</h3>
                <p>Not enough borrowing activity to show popular books</p>
            </div>
        `;
        return;
    }

    popularBooks.innerHTML = books.map((book, index) => `
        <div class="popular-book-item" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6;">
            <div>
                <h4 style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                    ${index + 1}. ${escapeHtml(book.title)}
                </h4>
                <p style="font-size: 12px; color: #6b7280;">by ${escapeHtml(book.author)}</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #6b7280;">
                <span>${book.borrow_count} borrows</span>
            </div>
        </div>
    `).join('');
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
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

// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon"></div>
            <div class="notification-message">${escapeHtml(message)}</div>
            <button class="notification-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Add close event listener
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Error handling for fetch requests
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (event.reason && event.reason.message) {
        showNotification(event.reason.message, 'error');
    } else {
        showNotification('An unexpected error occurred', 'error');
    }
});

// Handle network errors
window.addEventListener('online', function() {
    showNotification('Connection restored', 'success');
    // Optionally reload data
    if (currentUser) {
        loadInitialData();
    }
});

window.addEventListener('offline', function() {
    showNotification('Connection lost. Some features may not work.', 'error');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        if (!bookModal.classList.contains('hidden')) {
            closeBookModal();
        }
        if (!userModal.classList.contains('hidden')) {
            closeUserModal();
        }
        if (!manageBookModal.classList.contains('hidden')) {
            closeManageBookModal();
        }
    }
    
    // Ctrl/Cmd + K focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (currentTab === 'books') {
            searchBooks.focus();
        } else if (currentTab === 'admin') {
            manageBookSearch.focus();
        }
    }
});

// Initialize service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            }, function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Auto-refresh data periodically (every 5 minutes)
setInterval(() => {
    if (currentUser && document.visibilityState === 'visible') {
        // Only refresh current tab data to avoid unnecessary requests
        if (currentTab === 'books') {
            loadBooks();
        } else if (currentTab === 'borrowed') {
            loadBorrowedBooks();
        } else if (currentTab === 'users' && currentUser.role === 'admin') {
            loadUsers();
        } else if (currentTab === 'reports' && currentUser.role === 'admin') {
            loadReports();
        } else if (currentTab === 'admin' && currentUser.role === 'admin') {
            loadCurrentBorrows();
            loadOverdueBooks();
        }
    }
}, 300000); // 5 minutes

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentUser) {
        // Refresh data when page becomes visible
        setTimeout(() => {
            if (currentTab === 'books') {
                loadBooks();
            } else if (currentTab === 'borrowed') {
                loadBorrowedBooks();
            }
        }, 1000);
    }
});

// Performance monitoring
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
            console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
    }
});

observer.observe({ entryTypes: ['measure'] });

// Mark script as loaded
console.log('Library Management System loaded successfully');

// Export functions for testing (if in development environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        debounce,
        showNotification,
        makeAPIRequest
    };
}
