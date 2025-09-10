// app.js - Main Application Controller
// Configuration
const API_BASE_URL = 'http://localhost:8000';

// Global state
let currentUser = null;
let currentTab = 'books';
let allBooks = [];
let borrowedBooks = [];
let allUsers = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
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
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Setup feature-specific listeners
    setupBooksEventListeners();
    setupBorrowedBooksEventListeners();
    if (currentUser && currentUser.role === 'admin') {
        setupUsersEventListeners();
        setupAdminEventListeners();
    }
}

// Tab switching
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
    
    // Update content
    tabContents.forEach(content => {
        let targetId;
        switch (tabName) {
            case 'books':
                targetId = 'booksTab';
                break;
            case 'borrowed':
                targetId = 'borrowedBooksTab';
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