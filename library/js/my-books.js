// borrowed-books.js - User's Borrowed Books Module

// DOM Elements
const borrowedBooksList = document.getElementById('borrowedBooksList');

// Setup event listeners for borrowed books functionality
function setupBorrowedBooksEventListeners() {
    // No specific event listeners needed as return buttons are dynamically created
    // Event delegation is handled in the render functions
}

// Load borrowed books from API
async function loadBorrowedBooks() {
    try {
        if (borrowedBooksList) showLoading(borrowedBooksList);
        const borrowed = await getBorrowedBooksFromAPI();
        borrowedBooks = Array.isArray(borrowed) ? borrowed : [];
        console.log('Loaded borrowed books:', borrowedBooks);
        
        // Enhance borrowed books with book details
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
                const bookDetails = await getBookByIdFromAPI(borrow.book_id);
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

// Render borrowed books list
function renderBorrowedBooks(borrowed) {
    if (!borrowedBooksList) return;
    
    console.log('Rendering borrowed books:', borrowed);
    
    if (borrowed.length === 0) {
        borrowedBooksList.innerHTML = createBorrowedBooksEmptyState();
        return;
    }
    
    borrowedBooksList.innerHTML = borrowed.map(borrow => {
        // Get book info
        const bookTitle = borrow.book?.title || `Book ID: ${borrow.book_id}`;
        const bookAuthor = borrow.book?.author || 'Unknown Author';
        
        const borrowDate = formatDate(borrow.borrowed_at);
        const isReturned = !!borrow.returned_at;
        const returnDate = isReturned ? formatDate(borrow.returned_at) : null;
        
        // Calculate if overdue (for active borrows)
        const isOverdue = !isReturned && calculateDaysOverdue(borrow.borrowed_at) > 0;
        const daysOverdue = isOverdue ? calculateDaysOverdue(borrow.borrowed_at) : 0;
        
        return `
            <div class="borrowed-book-item ${isOverdue ? 'overdue' : ''}">
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
                        `<span class="status-badge ${isOverdue ? 'overdue' : 'borrowed'}">
                            ${isOverdue ? `Overdue (${daysOverdue} days)` : 'Currently Borrowed'}
                        </span>`
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

// Render borrowed books error state
function renderBorrowedBooksError() {
    if (!borrowedBooksList) return;
    
    borrowedBooksList.innerHTML = createErrorState(
        'Failed to load borrowed books',
        'There was an error loading your borrowed books. Please refresh the page.'
    );
}

// Return book function
async function returnBook(borrowId) {
    const button = event.target.closest('button');
    
    try {
        setButtonLoading(button, true);
        
        await returnBookToAPI(borrowId);
        
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
        showApiError(error);
    } finally {
        setButtonLoading(button, false);
    }
}

// Get borrowed books statistics
function getBorrowedBooksStats() {
    const activeBorrows = borrowedBooks.filter(b => !b.returned_at);
    const returnedBooks = borrowedBooks.filter(b => b.returned_at);
    const overdueBorrows = activeBorrows.filter(b => 
        calculateDaysOverdue(b.borrowed_at) > 0
    );
    
    return {
        total: borrowedBooks.length,
        active: activeBorrows.length,
        returned: returnedBooks.length,
        overdue: overdueBorrows.length,
        activeBorrows,
        returnedBooks,
        overdueBorrows
    };
}

// Filter borrowed books by status
function filterBorrowedBooks(status = 'all') {
    let filtered;
    
    switch (status) {
        case 'active':
            filtered = borrowedBooks.filter(b => !b.returned_at);
            break;
        case 'returned':
            filtered = borrowedBooks.filter(b => b.returned_at);
            break;
        case 'overdue':
            filtered = borrowedBooks.filter(b => 
                !b.returned_at && calculateDaysOverdue(b.borrowed_at) > 0
            );
            break;
        default:
            filtered = borrowedBooks;
    }
    
    renderBorrowedBooks(filtered);
    return filtered;
}

// Search borrowed books
function searchBorrowedBooks(query) {
    const filtered = filterByQuery(borrowedBooks, query, ['book.title', 'book.author']);
    renderBorrowedBooks(filtered);
    return filtered;
}

// Export borrowed books data (for potential future use)
function exportBorrowedBooksData() {
    const stats = getBorrowedBooksStats();
    const exportData = {
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        stats,
        books: borrowedBooks.map(borrow => ({
            bookTitle: borrow.book?.title || `Book ID: ${borrow.book_id}`,
            bookAuthor: borrow.book?.author || 'Unknown',
            borrowedAt: borrow.borrowed_at,
            returnedAt: borrow.returned_at,
            isOverdue: !borrow.returned_at && calculateDaysOverdue(borrow.borrowed_at) > 0,
            daysOverdue: !borrow.returned_at ? calculateDaysOverdue(borrow.borrowed_at) : 0
        }))
    };
    
    return exportData;
}