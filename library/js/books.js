// books.js - Book Management Module

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const searchBooks = document.getElementById('searchBooks');
const availabilityFilter = document.getElementById('availabilityFilter');
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

// Global state for selected book
let selectedBookId = null;

// Setup event listeners for books functionality
function setupBooksEventListeners() {
    // Search functionality
    if (searchBooks) {
        searchBooks.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Availability filter
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
}

// Load books from API
async function loadBooks() {
    try {
        if (booksGrid) showLoading(booksGrid);
        const books = await getBooksFromAPI();
        allBooks = Array.isArray(books) ? books : [];
        renderBooks(allBooks);
    } catch (error) {
        console.error('Failed to load books:', error);
        showError('Failed to load books. Please try again.');
        if (booksGrid) renderBooksError();
    }
}

// Render books grid
function renderBooks(books) {
    if (!booksGrid) return;
    
    if (books.length === 0) {
        booksGrid.innerHTML = createBooksEmptyState();
        return;
    }
    
    booksGrid.innerHTML = books.map(book => {
        const { availableCopies, totalCopies, isAvailable, statusText, statusClass } = 
            getBookAvailabilityStatus(book);
        
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
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                    <span class="book-id">ID: ${book.id}</span>
                </div>
                ${totalCopies > 1 ? `<div class="book-copies">Copies: ${availableCopies}/${totalCopies}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Render books error state
function renderBooksError() {
    if (!booksGrid) return;
    
    booksGrid.innerHTML = createErrorState(
        'Failed to load books',
        'There was an error loading the books. Please refresh the page.'
    );
}

// Open book modal
function openBookModal(bookId) {
    const book = findById(allBooks, bookId);
    if (!book) return;
    
    selectedBookId = bookId;
    
    if (modalBookTitle) modalBookTitle.textContent = book.title || 'Unknown Title';
    if (modalBookAuthor) modalBookAuthor.textContent = `by ${book.author || 'Unknown Author'}`;
    
    const { availableCopies, totalCopies, isAvailable, statusText, statusClass } = 
        getBookAvailabilityStatus(book);
    
    if (modalCopiesInfo) {
        modalCopiesInfo.textContent = `Available: ${availableCopies}/${totalCopies}`;
    }
    
    if (modalBookStatus) {
        modalBookStatus.textContent = statusText;
        modalBookStatus.className = `status-badge ${statusClass}`;
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
    
    openModal('bookModal');
}

// Close book modal
function closeBookModal() {
    closeModal('bookModal');
    selectedBookId = null;
}

// Handle borrow book
async function handleBorrowBook() {
    if (!selectedBookId) return;
    
    try {
        setButtonLoading(borrowBookBtn, true);
        
        await borrowBookFromAPI(selectedBookId);
        
        showSuccess('Book borrowed successfully!');
        closeBookModal();
        
        // Refresh data
        await loadBooks();
        await loadBorrowedBooks();
        
    } catch (error) {
        console.error('Failed to borrow book:', error);
        showApiError(error);
    } finally {
        setButtonLoading(borrowBookBtn, false);
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
    
    if (!validateRequired(title) || !validateRequired(author)) {
        showError('Please fill in all required fields.');
        return;
    }
    
    if (!validatePositiveNumber(copies)) {
        showError('Number of copies must be a positive number.');
        return;
    }
    
    try {
        setButtonLoading(submitBtn, true);
        
        await addBookToAPI({ title, author, total_copies: copies });
        
        showSuccess('Book added successfully!');
        addBookForm.reset();
        
        // Refresh books
        await loadBooks();
        if (currentUser && currentUser.role === 'admin') {
            await loadManageBooks();
        }
        
    } catch (error) {
        console.error('Failed to add book:', error);
        showApiError(error);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Handle search
function handleSearch() {
    if (!searchBooks) return;
    
    const query = searchBooks.value.toLowerCase().trim();
    const filteredBooks = filterByQuery(allBooks, query, ['title', 'author']);
    renderBooks(filteredBooks);
}

// Handle availability filter
function handleAvailabilityFilter() {
    if (!availabilityFilter) return;
    
    const filterValue = availabilityFilter.value;
    let filteredBooks;
    
    switch (filterValue) {
        case 'available':
            filteredBooks = allBooks.filter(book => 
                getBookAvailabilityStatus(book).isAvailable
            );
            break;
        case 'borrowed':
            filteredBooks = allBooks.filter(book => 
                !getBookAvailabilityStatus(book).isAvailable
            );
            break;
        default:
            filteredBooks = allBooks;
    }
    
    renderBooks(filteredBooks);
}