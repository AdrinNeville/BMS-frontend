// admin.js - Admin Dashboard Module

// DOM Elements
const manageBooksList = document.getElementById('manageBooksList');
const manageBookSearch = document.getElementById('manageBookSearch');
const currentBorrows = document.getElementById('currentBorrows');
const overdueBooks = document.getElementById('overdueBooks');

// Book management modal elements
const manageBookModal = document.getElementById('manageBookModal');
const manageModalBookTitle = document.getElementById('manageModalBookTitle');
const manageModalBookAuthor = document.getElementById('manageModalBookAuthor');
const manageModalBookId = document.getElementById('manageModalBookId');
const manageModalTotalCopies = document.getElementById('manageModalTotalCopies');
const manageModalAvailableCopies = document.getElementById('manageModalAvailableCopies');
const manageModalBorrowedCopies = document.getElementById('manageModalBorrowedCopies');

// Setup event listeners for admin functionality
function setupAdminEventListeners() {
    // Manage book search
    if (manageBookSearch) {
        manageBookSearch.addEventListener('input', debounce(handleManageBookSearch, 300));
    }

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
        showError('Failed to load admin data. Please try again.');
    }
}

// Load books for management
async function loadManageBooks() {
    if (!manageBooksList) return;

    try {
        showLoading(manageBooksList);
        const books = await getBooksFromAPI();
        renderManageBooks(Array.isArray(books) ? books : []);
    } catch (error) {
        console.error('Failed to load books for management:', error);
        manageBooksList.innerHTML = createErrorState(
            'Failed to load books',
            'Please try again.'
        );
    }
}

// Render books for management
function renderManageBooks(books) {
    if (!manageBooksList) return;

    if (books.length === 0) {
        manageBooksList.innerHTML = createEmptyState(
            '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
            'No books found',
            'Add some books to manage them.'
        );
        return;
    }

    manageBooksList.innerHTML = books.map(book => {
        const { availableCopies, totalCopies, borrowedCopies } = getBookAvailabilityStatus(book);
        
        return `
            <div class="manage-book-item">
                <div class="manage-book-info">
                    <h4>${escapeHtml(book.title || '')}</h4>
                    <p>by ${escapeHtml(book.author || 'Unknown')}</p>
                    <small>ID: ${book.id} | Copies: ${availableCopies}/${totalCopies}</small>
                </div>
                <div class="manage-book-actions">
                    <button class="btn btn-secondary" onclick="openManageBookModal(${book.id})">
                        Manage Copies
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load current borrows
async function loadCurrentBorrows() {
    if (!currentBorrows) return;

    try {
        showLoading(currentBorrows);
        const borrows = await getAllBorrowsFromAPI();
        const activeBorrows = borrows.filter(b => !b.returned_at);
        renderCurrentBorrows(activeBorrows);
    } catch (error) {
        console.error('Failed to load current borrows:', error);
        currentBorrows.innerHTML = createErrorState(
            'Failed to load current borrows',
            'Please try again.'
        );
    }
}

// Render current borrows
function renderCurrentBorrows(borrows) {
    if (!currentBorrows) return;

    if (borrows.length === 0) {
        currentBorrows.innerHTML = createEmptyState(
            '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
            'No current borrows',
            'There are no active borrows at the moment.'
        );
        return;
    }
    currentBorrows.innerHTML = borrows.map(borrow => {
        const bookTitle = borrow.book?.title || `Book ID: ${borrow.book_id}`;
        const borrowDate = formatDate(borrow.borrowed_at);
        return `
            <div class="borrow-item">
                <h4>${escapeHtml(bookTitle)}</h4>
                <p>Borrowed on: ${borrowDate}</p>
                <small>Borrow ID: ${borrow.id}</small>
            </div>
        `;
    }).join('');
}