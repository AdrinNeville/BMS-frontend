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