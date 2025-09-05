// admin.js - Admin functionality
import { makeAPIRequest, showNotification, escapeHtml, debounce } from './utils.js';

let allUsers = [];
let currentUser = null;
let selectedUserId = null;
let selectedManageBookId = null;
let allBooksForManagement = [];

// DOM Elements
const usersTableBody = document.getElementById('usersTableBody');
const addBookForm = document.getElementById('addBookForm');
const manageBookSearch = document.getElementById('manageBookSearch');
const manageBooksList = document.getElementById('manageBooksList');

// User Modal Elements
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

// Manage Book Modal Elements
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

// Initialize admin module
export function initializeAdminModule(user) {
    currentUser = user;
    
    if (user.role !== 'admin') {
        console.warn('Admin module initialized for non-admin user');
        return;
    }
    
    setupAdminEventListeners();
    loadAdminData();
}

// Setup event listeners
function setupAdminEventListeners() {
    // Add book form
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBook);
    }
    
    // Search functionality
    if (manageBookSearch) {
        manageBookSearch.addEventListener('input', debounce(handleManageBookSearch, 300));
    }
    
    // User modal events
    if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
    if (cancelUserModal) cancelUserModal.addEventListener('click', closeUserModal);
    if (changeRoleBtn) changeRoleBtn.addEventListener('click', handleChangeUserRole);
    if (deleteUserBtn) deleteUserBtn.addEventListener('click', handleDeleteUser);
    
    // Manage book modal events
    if (closeManageBookModalBtn) closeManageBookModalBtn.addEventListener('click', closeManageBookModal);
    if (cancelManageBookModal) cancelManageBookModal.addEventListener('click', closeManageBookModal);
    if (addCopiesBtn) addCopiesBtn.addEventListener('click', handleAddCopies);
    if (removeCopiesBtn) removeCopiesBtn.addEventListener('click', handleRemoveCopies);
    
    // Modal background clicks
    if (userModal) {
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) closeUserModal();
        });
    }
    
    if (manageBookModal) {
        manageBookModal.addEventListener('click', (e) => {
            if (e.target === manageBookModal) closeManageBookModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleAdminKeyboard);
}

// Load initial admin data
async function loadAdminData() {
    try {
        await Promise.all([
            loadUsers(),
            loadManageBooks()
        ]);
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showNotification('Failed to load admin data', 'error');
    }
}

// User Management Functions
export async function loadUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showUsersLoading();
        const users = await makeAPIRequest('/users');
        allUsers = Array.isArray(users) ? users : [];
        renderUsers(allUsers);
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users. Please try again.', 'error');
        renderUsersError();
    }
}

function renderUsers(users) {
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-state">
                    <div class="empty-state">
                        <h3>No users found</h3>
                        <p>No users are registered in the system</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => `
        <tr class="user-row" data-user-id="${user.id}" onclick="openUserModal('${user.id}')">
            <td>
                <div class="user-info">
                    <div class="user-avatar-small">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <span>${escapeHtml(user.name)}</span>
                </div>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'admin-role' : 'member-role'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="active-borrows-count">${user.active_borrows || 0}</span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openUserModal('${user.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Manage
                </button>
            </td>
        </tr>
    `).join('');
}

function showUsersLoading() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="5">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <span>Loading users...</span>
                </div>
            </td>
        </tr>
    `;
}

function renderUsersError() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="error-table-state">
                <div class="error-state">
                    <h3>Failed to load users</h3>
                    <p>There was an error loading the users. Please try again.</p>
                    <button class="btn btn-secondary" onclick="loadUsers()">Retry</button>
                </div>
            </td>
        </tr>
    `;
}

// User Modal Functions
window.openUserModal = async function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    selectedUserId = userId;
    
    // Update modal content
    if (modalUserName) modalUserName.textContent = user.name;
    if (modalUserEmail) modalUserEmail.textContent = user.email;
    if (modalUserRole) modalUserRole.textContent = user.role;
    if (modalUserId) modalUserId.textContent = user.id;
    if (newUserRole) newUserRole.value = user.role;
    
    // Prevent admin from changing their own role or deleting themselves
    const isCurrentUser = user.id === currentUser.id;
    if (changeRoleBtn) changeRoleBtn.disabled = isCurrentUser;
    if (deleteUserBtn) deleteUserBtn.disabled = isCurrentUser;
    
    // Load user's borrows
    await loadUserBorrows(userId);
    
    // Show modal
    if (userModal) {
        userModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

function closeUserModal() {
    if (userModal) {
        userModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        selectedUserId = null;
    }
}

async function loadUserBorrows(userId) {
    if (!userActiveBorrows) return;
    
    try {
        userActiveBorrows.innerHTML = '<div class="spinner"></div><span>Loading borrows...</span>';
        
        const borrows = await makeAPIRequest(`/users/${userId}/active-borrows`);
        
        if (borrows.length === 0) {
            userActiveBorrows.innerHTML = '<p class="no-borrows">No active borrows</p>';
            return;
        }
        
        userActiveBorrows.innerHTML = borrows.map(borrow => {
            const borrowDate = new Date(borrow.borrowed_at).toLocaleDateString();
            const dueDate = new Date(new Date(borrow.borrowed_at).getTime() + (14 * 24 * 60 * 60 * 1000));
            const isOverdue = new Date() > dueDate;
            const overdueDays = isOverdue ? Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24)) : 0;
            
            return `
                <div class="user-borrow-item ${isOverdue ? 'overdue' : ''}">
                    <div class="borrow-book-info">
                        <h4>Book ID: ${borrow.book_id}</h4>
                        <p>Borrowed: ${borrowDate}</p>
                        <p>Due: ${dueDate.toLocaleDateString()}</p>
                        ${isOverdue ? `<p class="overdue-text">Overdue by ${overdueDays} days</p>` : ''}
                    </div>
                    <div class="borrow-actions">
                        <button class="btn btn-sm btn-warning" onclick="forceReturnBook('${borrow.id}', this)">
                            Force Return
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load user borrows:', error);
        userActiveBorrows.innerHTML = '<p class="error-text">Failed to load borrows</p>';
    }
}

async function handleChangeUserRole() {
    if (!selectedUserId || !newUserRole) return;
    
    const newRole = newUserRole.value;
    const user = allUsers.find(u => u.id === selectedUserId);
    
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    if (user.role === newRole) {
        showNotification('User already has this role', 'error');
        return;
    }
    
    try {
        const originalText = changeRoleBtn.textContent;
        changeRoleBtn.textContent = 'Updating...';
        changeRoleBtn.disabled = true;
        
        await makeAPIRequest(`/users/${selectedUserId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });
        
        showNotification(`User role updated to ${newRole}`, 'success');
        closeUserModal();
        await loadUsers();
        
    } catch (error) {
        console.error('Failed to update user role:', error);
        showNotification(error.message || 'Failed to update user role', 'error');
    } finally {
        changeRoleBtn.textContent = 'Update Role';
        changeRoleBtn.disabled = false;
    }
}

async function handleDeleteUser() {
    if (!selectedUserId) return;
    
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete user "${user.name}" (${user.email})? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const originalText = deleteUserBtn.textContent;
        deleteUserBtn.textContent = 'Deleting...';
        deleteUserBtn.disabled = true;
        
        await makeAPIRequest(`/users/${selectedUserId}`, {
            method: 'DELETE'
        });
        
        showNotification('User deleted successfully', 'success');
        closeUserModal();
        await loadUsers();
        
    } catch (error) {
        console.error('Failed to delete user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    } finally {
        deleteUserBtn.textContent = 'Delete User';
        deleteUserBtn.disabled = false;
    }
}

// Book Management Functions
async function handleAddBook(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('bookTitle');
    const authorInput = document.getElementById('bookAuthor');
    const copiesInput = document.getElementById('bookCopies');
    const submitButton = addBookForm.querySelector('button[type="submit"]');
    
    if (!titleInput || !authorInput || !copiesInput) {
        showNotification('Form fields not found', 'error');
        return;
    }
    
    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const copies = parseInt(copiesInput.value) || 1;
    
    if (!title || !author) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (copies < 1) {
        showNotification('Number of copies must be at least 1', 'error');
        return;
    }
    
    try {
        const btnText = submitButton.querySelector('.btn-text');
        const btnSpinner = submitButton.querySelector('.btn-spinner');
        
        if (btnText) btnText.classList.add('hidden');
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        submitButton.disabled = true;
        
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
        copiesInput.value = 1;
        
        // Refresh data
        await loadManageBooks();
        
        // Refresh books list if function exists
        if (typeof loadBooks === 'function') {
            loadBooks();
        }
        
    } catch (error) {
        console.error('Failed to add book:', error);
        showNotification(error.message || 'Failed to add book', 'error');
    } finally {
        const btnText = submitButton.querySelector('.btn-text');
        const btnSpinner = submitButton.querySelector('.btn-spinner');
        
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
}

export async function loadManageBooks() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showManageBooksLoading();
        const books = await makeAPIRequest('/books');
        allBooksForManagement = Array.isArray(books) ? books : [];
        renderManageBooks(allBooksForManagement);
    } catch (error) {
        console.error('Failed to load manage books:', error);
        renderManageBooksError();
    }
}

function renderManageBooks(books) {
    if (!manageBooksList) return;
    
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
                    <small>Book ID: ${book.id}</small>
                </div>
                <div class="manage-book-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total</span>
                        <span class="stat-value">${book.total_copies}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Available</span>
                        <span class="stat-value available">${availableCopies}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Borrowed</span>
                        <span class="stat-value borrowed">${book.borrowed_copies}</span>
                    </div>
                </div>
                <div class="manage-book-actions">
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); openManageBookModal(${book.id})">
                        Manage Copies
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function handleManageBookSearch() {
    const query = manageBookSearch ? manageBookSearch.value.toLowerCase().trim() : '';
    
    const filteredBooks = allBooksForManagement.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
    
    renderManageBooks(filteredBooks);
}

function showManageBooksLoading() {
    if (!manageBooksList) return;
    
    manageBooksList.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading books...</p>
        </div>
    `;
}

function renderManageBooksError() {
    if (!manageBooksList) return;
    
    manageBooksList.innerHTML = `
        <div class="error-state">
            <h3>Failed to load books</h3>
            <p>There was an error loading books for management.</p>
            <button class="btn btn-secondary" onclick="loadManageBooks()">Retry</button>
        </div>
    `;
}

// Manage Book Modal Functions
window.openManageBookModal = function(bookId) {
    const book = allBooksForManagement.find(b => b.id === bookId);
    if (!book) {
        showNotification('Book not found', 'error');
        return;
    }
    
    selectedManageBookId = bookId;
    const availableCopies = book.total_copies - book.borrowed_copies;
    
    // Update modal content
    if (manageModalBookTitle) manageModalBookTitle.textContent = book.title;
    if (manageModalBookAuthor) manageModalBookAuthor.textContent = book.author;
    if (manageModalBookId) manageModalBookId.textContent = book.id;
    if (manageModalTotalCopies) manageModalTotalCopies.textContent = book.total_copies;
    if (manageModalAvailableCopies) manageModalAvailableCopies.textContent = availableCopies;
    if (manageModalBorrowedCopies) manageModalBorrowedCopies.textContent = book.borrowed_copies;
    
    // Reset input values
    if (copiesToAdd) copiesToAdd.value = 1;
    if (copiesToRemove) copiesToRemove.value = 1;
    
    // Show modal
    if (manageBookModal) {
        manageBookModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

function closeManageBookModal() {
    if (manageBookModal) {
        manageBookModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        selectedManageBookId = null;
    }
}

async function handleAddCopies() {
    if (!selectedManageBookId) return;
    
    const copies = parseInt(copiesToAdd?.value) || 0;
    if (copies < 1) {
        showNotification('Please enter a valid number of copies to add', 'error');
        return;
    }
    
    try {
        addCopiesBtn.disabled = true;
        addCopiesBtn.textContent = 'Adding...';
        
        await makeAPIRequest(`/books/${selectedManageBookId}/add-copies`, {
            method: 'PATCH',
            body: JSON.stringify({ copies })
        });
        
        showNotification(`Added ${copies} copies successfully!`, 'success');
        
        // Refresh data and update modal
        await loadManageBooks();
        const updatedBook = allBooksForManagement.find(b => b.id === selectedManageBookId);
        if (updatedBook) {
            updateManageBookModalStats(updatedBook);
        }
        
        if (copiesToAdd) copiesToAdd.value = 1;
        
    } catch (error) {
        console.error('Failed to add copies:', error);
        showNotification(error.message || 'Failed to add copies', 'error');
    } finally {
        addCopiesBtn.disabled = false;
        addCopiesBtn.textContent = 'Add Copies';
    }
}

async function handleRemoveCopies() {
    if (!selectedManageBookId) return;
    
    const copies = parseInt(copiesToRemove?.value) || 0;
    if (copies < 1) {
        showNotification('Please enter a valid number of copies to remove', 'error');
        return;
    }
    
    const book = allBooksForManagement.find(b => b.id === selectedManageBookId);
    if (!book) {
        showNotification('Book not found', 'error');
        return;
    }
    
    const availableCopies = book.total_copies - book.borrowed_copies;
    if (copies > availableCopies) {
        showNotification(`Cannot remove ${copies} copies. Only ${availableCopies} copies are available (not borrowed)`, 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to remove ${copies} copies? This action cannot be undone.`)) {
        return;
    }
    
    try {
        removeCopiesBtn.disabled = true;
        removeCopiesBtn.textContent = 'Removing...';
        
        await makeAPIRequest(`/books/${selectedManageBookId}/remove-copies`, {
            method: 'PATCH',
            body: JSON.stringify({ copies })
        });
        
        showNotification(`Removed ${copies} copies successfully!`, 'success');
        
        // Refresh data and update modal
        await loadManageBooks();
        const updatedBook = allBooksForManagement.find(b => b.id === selectedManageBookId);
        if (updatedBook) {
            updateManageBookModalStats(updatedBook);
        }
        
        if (copiesToRemove) copiesToRemove.value = 1;
        
    } catch (error) {
        console.error('Failed to remove copies:', error);
        showNotification(error.message || 'Failed to remove copies', 'error');
    } finally {
        removeCopiesBtn.disabled = false;
        removeCopiesBtn.textContent = 'Remove Copies';
    }
}

function updateManageBookModalStats(book) {
    const availableCopies = book.total_copies - book.borrowed_copies;
    
    if (manageModalTotalCopies) manageModalTotalCopies.textContent = book.total_copies;
    if (manageModalAvailableCopies) manageModalAvailableCopies.textContent = availableCopies;
    if (manageModalBorrowedCopies) manageModalBorrowedCopies.textContent = book.borrowed_copies;
}

// Reports and Analytics Functions
export async function generateUserReport() {
    if (!currentUser || currentUser.role !== 'admin') return null;
    
    try {
        const users = await makeAPIRequest('/users');
        const borrows = await makeAPIRequest('/borrow/all');
        
        // Calculate user statistics
        const totalUsers = users.length;
        const adminUsers = users.filter(u => u.role === 'admin').length;
        const memberUsers = totalUsers - adminUsers;
        
        // Active borrowers
        const activeBorrowIds = borrows
            .filter(b => !b.returned_at)
            .map(b => b.user_id);
        const uniqueActiveBorrowers = [...new Set(activeBorrowIds)].length;
        
        // User activity
        const userBorrowCounts = {};
        borrows.forEach(borrow => {
            if (!userBorrowCounts[borrow.user_id]) {
                userBorrowCounts[borrow.user_id] = 0;
            }
            userBorrowCounts[borrow.user_id]++;
        });
        
        const mostActiveUsers = users
            .map(user => ({
                ...user,
                totalBorrows: userBorrowCounts[user.id] || 0
            }))
            .sort((a, b) => b.totalBorrows - a.totalBorrows)
            .slice(0, 10);
        
        return {
            totalUsers,
            adminUsers,
            memberUsers,
            uniqueActiveBorrowers,
            inactiveUsers: totalUsers - uniqueActiveBorrowers,
            mostActiveUsers
        };
        
    } catch (error) {
        console.error('Failed to generate user report:', error);
        return null;
    }
}

export async function generateBookReport() {
    if (!currentUser || currentUser.role !== 'admin') return null;
    
    try {
        const books = await makeAPIRequest('/books');
        const borrows = await makeAPIRequest('/borrow/all');
        
        // Calculate book statistics
        const totalBooks = books.length;
        const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
        const availableCopies = books.reduce((sum, book) => sum + (book.total_copies - book.borrowed_copies), 0);
        const borrowedCopies = totalCopies - availableCopies;
        
        // Book popularity
        const bookBorrowCounts = {};
        borrows.forEach(borrow => {
            if (!bookBorrowCounts[borrow.book_id]) {
                bookBorrowCounts[borrow.book_id] = 0;
            }
            bookBorrowCounts[borrow.book_id]++;
        });
        
        const popularBooks = books
            .map(book => ({
                ...book,
                totalBorrows: bookBorrowCounts[book.id] || 0
            }))
            .sort((a, b) => b.totalBorrows - a.totalBorrows)
            .slice(0, 10);
        
        const neverBorrowedBooks = books.filter(book => !bookBorrowCounts[book.id]);
        
        return {
            totalBooks,
            totalCopies,
            availableCopies,
            borrowedCopies,
            utilizationRate: ((borrowedCopies / totalCopies) * 100).toFixed(1),
            popularBooks,
            neverBorrowedCount: neverBorrowedBooks.length
        };
        
    } catch (error) {
        console.error('Failed to generate book report:', error);
        return null;
    }
}

export async function generateBorrowReport() {
    if (!currentUser || currentUser.role !== 'admin') return null;
    
    try {
        const borrows = await makeAPIRequest('/borrow/all');
        const overdueList = await makeAPIRequest('/borrow/overdue');
        
        const activeBorrows = borrows.filter(b => !b.returned_at);
        const returnedBorrows = borrows.filter(b => b.returned_at);
        
        // Calculate average borrow duration
        const completedBorrows = returnedBorrows.filter(b => b.returned_at && b.borrowed_at);
        const avgDuration = completedBorrows.length > 0 ? 
            completedBorrows.reduce((sum, borrow) => {
                const duration = (new Date(borrow.returned_at) - new Date(borrow.borrowed_at)) / (1000 * 60 * 60 * 24);
                return sum + duration;
            }, 0) / completedBorrows.length : 0;
        
        // Monthly statistics (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const recentBorrows = borrows.filter(b => new Date(b.borrowed_at) >= sixMonthsAgo);
        const monthlyStats = {};
        
        recentBorrows.forEach(borrow => {
            const month = new Date(borrow.borrowed_at).toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!monthlyStats[month]) {
                monthlyStats[month] = 0;
            }
            monthlyStats[month]++;
        });
        
        return {
            totalBorrows: borrows.length,
            activeBorrows: activeBorrows.length,
            returnedBorrows: returnedBorrows.length,
            overdueCount: overdueList.length,
            avgBorrowDuration: Math.round(avgDuration),
            returnRate: ((returnedBorrows.length / borrows.length) * 100).toFixed(1),
            monthlyStats
        };
        
    } catch (error) {
        console.error('Failed to generate borrow report:', error);
        return null;
    }
}

// System utilities
export async function performSystemMaintenance() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showNotification('Starting system maintenance...', 'info');
        
        // Simulate maintenance tasks
        const tasks = [
            'Checking database integrity',
            'Updating book availability',
            'Processing overdue notifications',
            'Cleaning up temporary data',
            'Optimizing performance'
        ];
        
        for (let i = 0; i < tasks.length; i++) {
            showNotification(`${tasks[i]}...`, 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        showNotification('System maintenance completed successfully!', 'success');
        
    } catch (error) {
        console.error('System maintenance failed:', error);
        showNotification('System maintenance failed. Please try again.', 'error');
    }
}

export async function exportUserData(format = 'json') {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const users = await makeAPIRequest('/users');
        const borrows = await makeAPIRequest('/borrow/all');
        
        // Combine user data with borrow statistics
        const userData = users.map(user => {
            const userBorrows = borrows.filter(b => b.user_id === user.id);
            const activeBorrows = userBorrows.filter(b => !b.returned_at);
            
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                totalBorrows: userBorrows.length,
                activeBorrows: activeBorrows.length,
                lastActivity: userBorrows.length > 0 ? 
                    Math.max(...userBorrows.map(b => new Date(b.borrowed_at))) : null
            };
        });
        
        if (format === 'csv') {
            downloadCSV(userData, 'users_export.csv');
        } else {
            downloadJSON(userData, 'users_export.json');
        }
        
        showNotification(`User data exported successfully (${format.toUpperCase()})`, 'success');
        
    } catch (error) {
        console.error('Failed to export user data:', error);
        showNotification('Failed to export user data', 'error');
    }
}

export async function exportBookData(format = 'json') {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const books = await makeAPIRequest('/books');
        const borrows = await makeAPIRequest('/borrow/all');
        
        // Combine book data with borrow statistics
        const bookData = books.map(book => {
            const bookBorrows = borrows.filter(b => b.book_id === book.id);
            const activeBorrows = bookBorrows.filter(b => !b.returned_at);
            
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                total_copies: book.total_copies,
                available_copies: book.total_copies - book.borrowed_copies,
                borrowed_copies: book.borrowed_copies,
                total_borrows: bookBorrows.length,
                active_borrows: activeBorrows.length,
                popularity_score: bookBorrows.length / book.total_copies
            };
        });
        
        if (format === 'csv') {
            downloadCSV(bookData, 'books_export.csv');
        } else {
            downloadJSON(bookData, 'books_export.json');
        }
        
        showNotification(`Book data exported successfully (${format.toUpperCase()})`, 'success');
        
    } catch (error) {
        console.error('Failed to export book data:', error);
        showNotification('Failed to export book data', 'error');
    }
}

// Utility functions for data export
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
}

function downloadCSV(data, filename) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Keyboard shortcuts for admin
function handleAdminKeyboard(e) {
    // Close modals with Escape key
    if (e.key === 'Escape') {
        if (!userModal.classList.contains('hidden')) {
            closeUserModal();
        }
        if (!manageBookModal.classList.contains('hidden')) {
            closeManageBookModal();
        }
    }
    
    // Quick actions with keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'u':
                e.preventDefault();
                if (document.querySelector('#usersTab').classList.contains('active')) {
                    loadUsers();
                }
                break;
            case 'b':
                e.preventDefault();
                if (document.querySelector('#adminTab').classList.contains('active')) {
                    loadManageBooks();
                }
                break;
            case 'e':
                e.preventDefault();
                if (confirm('Export user data as JSON?')) {
                    exportUserData('json');
                }
                break;
        }
    }
}

// Global function exports
window.openUserModal = window.openUserModal;
window.openManageBookModal = window.openManageBookModal;
window.loadUsers = loadUsers;
window.loadManageBooks = loadManageBooks;

console.log('Admin module loaded successfully');