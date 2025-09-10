// api.js - API Communication Layer

// Token management
function getToken() {
    return window.authToken || localStorage.getItem('authToken') || null;
}

function clearToken() {
    window.authToken = null;
    localStorage.removeItem('authToken');
}

// Generic API request function
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

// Authentication API calls
async function getCurrentUser() {
    try {
        return await makeAPIRequest('/auth/me');
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

// Books API calls
async function getBooksFromAPI() {
    return await makeAPIRequest('/books/');
}

async function getBookByIdFromAPI(bookId) {
    return await makeAPIRequest(`/books/${bookId}`);
}

async function addBookToAPI(bookData) {
    return await makeAPIRequest('/books/', {
        method: 'POST',
        body: JSON.stringify(bookData)
    });
}

async function addBookCopiesAPI(bookId, copies) {
    return await makeAPIRequest(`/books/${bookId}/add-copies?copies=${copies}`, {
        method: 'PATCH'
    });
}

async function removeBookCopiesAPI(bookId, copies) {
    return await makeAPIRequest(`/books/${bookId}/remove-copies?copies=${copies}`, {
        method: 'PATCH'
    });
}

// Borrow API calls
async function borrowBookFromAPI(bookId) {
    return await makeAPIRequest(`/borrow/${bookId}`, {
        method: 'POST'
    });
}

async function returnBookToAPI(borrowId) {
    return await makeAPIRequest(`/borrow/${borrowId}/return`, {
        method: 'PATCH'
    });
}

async function forceReturnBookToAPI(borrowId) {
    return await makeAPIRequest(`/borrow/admin/${borrowId}/force-return`, {
        method: 'PATCH'
    });
}

async function getBorrowedBooksFromAPI() {
    return await makeAPIRequest('/borrow/my-borrows');
}

async function getAllBorrowsFromAPI() {
    return await makeAPIRequest('/borrow/all');
}

async function getOverdueBooksFromAPI() {
    return await makeAPIRequest('/borrow/overdue');
}

// Users API calls
async function getUsersFromAPI() {
    return await makeAPIRequest('/users/');
}

async function getUserByIdFromAPI(userId) {
    return await makeAPIRequest(`/users/${userId}`);
}

async function deleteUserFromAPI(userId) {
    return await makeAPIRequest(`/users/${userId}`, {
        method: 'DELETE'
    });
}

async function changeUserRoleAPI(userId, newRole) {
    return await makeAPIRequest(`/users/${userId}/role?new_role=${newRole}`, {
        method: 'PATCH'
    });
}

async function getUserBorrowsAPI(userId) {
    return await makeAPIRequest(`/users/${userId}/borrows`);
}

async function getUserStatsAPI() {
    return await makeAPIRequest('/users/stats/summary');
}