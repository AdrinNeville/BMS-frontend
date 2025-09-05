// books.js - Books management functionality
import { makeAPIRequest, showNotification, escapeHtml, debounce } from './utils.js';

let allBooks = [];
let filteredBooks = [];
let selectedBookId = null;

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const searchBooks = document.getElementById('searchBooks');
const availabilityFilter = document.getElementById('availabilityFilter');

// Modal elements
const bookModal = document.getElementById('bookModal');
const modalBookTitle = document.getElementById('modalBookTitle');
const modalBookAuthor = document.getElementById('modalBookAuthor');
const modalBookStatus = document.getElementById('modalBookStatus');
const modalCopiesInfo = document.getElementById('modalCopiesInfo');
const borrowBookBtn = document.getElementById('borrowBookBtn');
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');

// Initialize books module
export function initializeBooksModule() {
    setupBooksEventListeners();
    loadBooks();
}

// Setup event listeners
function setupBooksEventListeners() {
    // Search functionality
    if (searchBooks) {
        searchBooks.addEventListener('input', debounce(handleBooksSearch, 300));
    }
    
    // Filter functionality
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', handleAvailabilityFilter);
    }
    
    // Modal events
    if (closeModal) closeModal.addEventListener('click', closeBookModal);
    if (cancelModal) cancelModal.addEventListener('click', closeBookModal);
    if (borrowBookBtn) borrowBookBtn.addEventListener('click', handleBorrowBook);
    
    // Modal background click
    if (bookModal) {
        bookModal.addEventListener('click', (e) => {
            if (e.target === bookModal) closeBookModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleBooksKeyboard);
}

// Load books from API
export async function loadBooks() {
    try {
        showBooksLoading();
        const books = await makeAPIRequest('/books');
        allBooks = Array.isArray(books) ? books : [];
        filteredBooks = [...allBooks];
        renderBooks(filteredBooks);
    } catch (error) {
        console.error('Failed to load books:', error);
        showNotification('Failed to load books. Please try again.', 'error');
        renderBooksError();
    }
}

// Render books grid
function renderBooks(books) {
    if (!booksGrid) return;
    
    if (books.length === 0) {
        booksGrid.innerHTML = createEmptyBooksState();
        return;
    }
    
    booksGrid.innerHTML = books.map(book => createBookCard(book)).join('');
}

// Create individual book card HTML
function createBookCard(book) {
    const availableCopies = book.total_copies - book.borrowed_copies;
    const statusClass = availableCopies > 0 ? 'available' : 'borrowed';
    const statusText = availableCopies > 0 ? 'Available' : 'Not Available';
    
    return `
        <div class="book-card" onclick="openBookModal(${book.id})" data-book-id="${book.id}">
            <div class="book-cover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                ${availableCopies === 0 ? '<div class="unavailable-overlay">Not Available</div>' : ''}
            </div>
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">by ${escapeHtml(book.author)}</p>
                <div class="book-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="book-id">#${book.id}</span>
                </div>
                <div class="book-copies-info">
                    <span class="copies-text">Available: ${availableCopies}/${book.total_copies}</span>
                </div>
            </div>
        </div>
    `;
}

// Create empty state HTML
function createEmptyBooksState() {
    const searchQuery = searchBooks ? searchBooks.value.trim() : '';
    const filterValue = availabilityFilter ? availabilityFilter.value : 'all';
    
    let message, description;
    
    if (searchQuery) {
        message = 'No books found';
        description = `No books match "${searchQuery}". Try adjusting your search terms.`;
    } else if (filterValue !== 'all') {
        message = 'No books found';
        description = `No ${filterValue} books found. Try changing the filter.`;
    } else {
        message = 'No books available';
        description = 'There are no books in the library yet.';
    }
    
    return `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <h3>${message}</h3>
            <p>${description}</p>
            ${searchQuery || filterValue !== 'all' ? 
                '<button class="btn btn-secondary" onclick="clearBooksFilters()">Clear Filters</button>' : 
                ''
            }
        </div>
    `;
}

// Show loading state
function showBooksLoading() {
    if (!booksGrid) return;
    
    booksGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-books-grid">
                ${Array.from({ length: 6 }, () => `
                    <div class="book-card-skeleton">
                        <div class="book-cover-skeleton"></div>
                        <div class="book-info-skeleton">
                            <div class="skeleton-line title"></div>
                            <div class="skeleton-line author"></div>
                            <div class="skeleton-line status"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p>Loading books...</p>
        </div>
    `;
}

// Show error state
function renderBooksError() {
    if (!booksGrid) return;
    
    booksGrid.innerHTML = `
        <div class="error-state">
            <svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load books</h3>
            <p>There was an error loading the books. Please try again.</p>
            <button class="btn btn-primary" onclick="loadBooks()">Retry</button>
        </div>
    `;
}

// Search and filter functions
function handleBooksSearch() {
    const query = searchBooks ? searchBooks.value.toLowerCase().trim() : '';
    filterAndRenderBooks(query);
}

function handleAvailabilityFilter() {
    const query = searchBooks ? searchBooks.value.toLowerCase().trim() : '';
    filterAndRenderBooks(query);
}

function filterAndRenderBooks(searchQuery = '') {
    const availabilityValue = availabilityFilter ? availabilityFilter.value : 'all';
    
    filteredBooks = allBooks.filter(book => {
        // Search filter
        const matchesSearch = !searchQuery || 
            book.title.toLowerCase().includes(searchQuery) || 
            book.author.toLowerCase().includes(searchQuery);
        
        // Availability filter
        let matchesAvailability = true;
        const availableCopies = book.total_copies - book.borrowed_copies;
        
        if (availabilityValue === 'available') {
            matchesAvailability = availableCopies > 0;
        } else if (availabilityValue === 'borrowed') {
            matchesAvailability = availableCopies === 0;
        }
        
        return matchesSearch && matchesAvailability;
    });
    
    renderBooks(filteredBooks);
    updateBooksStats();
}

// Clear all filters
window.clearBooksFilters = function() {
    if (searchBooks) searchBooks.value = '';
    if (availabilityFilter) availabilityFilter.value = 'all';
    filterAndRenderBooks();
};

// Update books statistics
function updateBooksStats() {
    const totalBooks = allBooks.length;
    const availableBooks = allBooks.filter(book => 
        (book.total_copies - book.borrowed_copies) > 0
    ).length;
    const borrowedBooks = totalBooks - availableBooks;
    
    // Update stats display if elements exist
    const statsElements = {
        totalBooks: document.getElementById('totalBooksCount'),
        availableBooks: document.getElementById('availableBooksCount'),
        borrowedBooks: document.getElementById('borrowedBooksCount')
    };
    
    Object.entries(statsElements).forEach(([key, element]) => {
        if (element) {
            const value = key === 'totalBooks' ? totalBooks :
                         key === 'availableBooks' ? availableBooks : borrowedBooks;
            element.textContent = value;
        }
    });
}

// Book modal functions
window.openBookModal = function(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        showNotification('Book not found', 'error');
        return;
    }
    
    selectedBookId = bookId;
    const availableCopies = book.total_copies - book.borrowed_copies;
    const isAvailable = availableCopies > 0;
    
    // Update modal content
    if (modalBookTitle) modalBookTitle.textContent = book.title;
    if (modalBookAuthor) modalBookAuthor.textContent = `by ${book.author}`;
    if (modalCopiesInfo) modalCopiesInfo.textContent = `Available: ${availableCopies}/${book.total_copies}`;
    
    // Update status badge
    if (modalBookStatus) {
        modalBookStatus.className = `status-badge ${isAvailable ? 'available' : 'borrowed'}`;
        modalBookStatus.textContent = isAvailable ? 'Available' : 'Not Available';
    }
    
    // Update borrow button
    updateBorrowButton(isAvailable);
    
    // Show modal
    if (bookModal) {
        bookModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        const firstFocusableElement = bookModal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusableElement) {
            firstFocusableElement.focus();
        }
    }
};

function updateBorrowButton(isAvailable) {
    if (!borrowBookBtn) return;
    
    const btnText = borrowBookBtn.querySelector('.btn-text');
    const btnSpinner = borrowBookBtn.querySelector('.btn-spinner');
    
    if (btnText) {
        btnText.textContent = isAvailable ? 'Borrow Book' : 'Not Available';
    }
    
    borrowBookBtn.disabled = !isAvailable;
    borrowBookBtn.className = `btn ${isAvailable ? 'btn-primary' : 'btn-disabled'}`;
    
    // Hide spinner if visible
    if (btnSpinner) {
        btnSpinner.classList.add('hidden');
    }
}

function closeBookModal() {
    if (bookModal) {
        bookModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        selectedBookId = null;
        
        // Return focus to the book card that opened the modal
        const bookCard = document.querySelector(`[data-book-id="${selectedBookId}"]`);
        if (bookCard) {
            bookCard.focus();
        }
    }
}

// Handle book borrowing
async function handleBorrowBook() {
    if (!selectedBookId) {
        showNotification('No book selected', 'error');
        return;
    }
    
    const btnText = borrowBookBtn.querySelector('.btn-text');
    const btnSpinner = borrowBookBtn.querySelector('.btn-spinner');
    
    try {
        // Set loading state
        if (btnText) btnText.classList.add('hidden');
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        borrowBookBtn.disabled = true;
        
        await makeAPIRequest(`/borrow/${selectedBookId}`, {
            method: 'POST'
        });
        
        showNotification('Book borrowed successfully!', 'success');
        closeBookModal();
        
        // Refresh books data
        await loadBooks();
        
        // Trigger refresh of borrowed books if function exists
        if (typeof loadBorrowedBooks === 'function') {
            loadBorrowedBooks();
        }
        
        // Update reports if function exists
        if (typeof loadReports === 'function') {
            loadReports();
        }
        
    } catch (error) {
        console.error('Failed to borrow book:', error);
        showNotification(error.message || 'Failed to borrow book. Please try again.', 'error');
    } finally {
        // Reset button state
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');
        borrowBookBtn.disabled = false;
    }
}

// Keyboard navigation
function handleBooksKeyboard(e) {
    // Close modal with Escape key
    if (e.key === 'Escape' && !bookModal.classList.contains('hidden')) {
        closeBookModal();
        return;
    }
    
    // Focus search with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchBooks && document.querySelector('#booksTab').classList.contains('active')) {
            searchBooks.focus();
        }
        return;
    }
    
    // Navigate books with arrow keys (when grid is focused)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        handleBooksGridNavigation(e);
    }
}

function handleBooksGridNavigation(e) {
    const bookCards = Array.from(document.querySelectorAll('.book-card'));
    if (bookCards.length === 0) return;
    
    const currentFocus = document.activeElement;
    const currentIndex = bookCards.indexOf(currentFocus);
    
    if (currentIndex === -1) return;
    
    let newIndex;
    const cardsPerRow = Math.floor(booksGrid.offsetWidth / 280); // Approximate card width
    
    switch (e.key) {
        case 'ArrowLeft':
            newIndex = Math.max(0, currentIndex - 1);
            break;
        case 'ArrowRight':
            newIndex = Math.min(bookCards.length - 1, currentIndex + 1);
            break;
        case 'ArrowUp':
            newIndex = Math.max(0, currentIndex - cardsPerRow);
            break;
        case 'ArrowDown':
            newIndex = Math.min(bookCards.length - 1, currentIndex + cardsPerRow);
            break;
        default:
            return;
    }
    
    if (newIndex !== currentIndex) {
        e.preventDefault();
        bookCards[newIndex].focus();
    }
}

// Book management functions (for admin)
export async function addBookCopies(bookId, copies) {
    try {
        await makeAPIRequest(`/books/${bookId}/add-copies`, {
            method: 'PATCH',
            body: JSON.stringify({ copies })
        });
        
        showNotification(`Added ${copies} copies successfully!`, 'success');
        await loadBooks();
        
    } catch (error) {
        console.error('Failed to add copies:', error);
        showNotification(error.message || 'Failed to add copies', 'error');
        throw error;
    }
}

export async function removeBookCopies(bookId, copies) {
    try {
        await makeAPIRequest(`/books/${bookId}/remove-copies`, {
            method: 'PATCH',
            body: JSON.stringify({ copies })
        });
        
        showNotification(`Removed ${copies} copies successfully!`, 'success');
        await loadBooks();
        
    } catch (error) {
        console.error('Failed to remove copies:', error);
        showNotification(error.message || 'Failed to remove copies', 'error');
        throw error;
    }
}

// Get book by ID
export function getBookById(bookId) {
    return allBooks.find(book => book.id === bookId);
}

// Get all books
export function getAllBooks() {
    return [...allBooks];
}

// Get filtered books
export function getFilteredBooks() {
    return [...filteredBooks];
}

// Refresh books data
export async function refreshBooks() {
    await loadBooks();
}

// Book search utilities
export function searchBooks(query) {
    return allBooks.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
    );
}

// Sort books
export function sortBooks(books, sortBy = 'title', order = 'asc') {
    const sorted = [...books].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
            case 'title':
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
            case 'author':
                aVal = a.author.toLowerCase();
                bVal = b.author.toLowerCase();
                break;
            case 'available':
                aVal = a.total_copies - a.borrowed_copies;
                bVal = b.total_copies - b.borrowed_copies;
                break;
            case 'total':
                aVal = a.total_copies;
                bVal = b.total_copies;
                break;
            default:
                aVal = a.id;
                bVal = b.id;
        }
        
        if (typeof aVal === 'string') {
            return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });
    
    return sorted;
}

// Export functions for global use
window.openBookModal = window.openBookModal;
window.clearBooksFilters = window.clearBooksFilters;
window.loadBooks = loadBooks;

console.log('Books module loaded successfully');