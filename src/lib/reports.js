// reports.js - Reports and analytics functionality
import { makeAPIRequest, showNotification, escapeHtml } from './utils.js';

let currentUser = null;
let reportsData = {
    users: null,
    books: null,
    borrows: null
};

// DOM Elements
const reportsContainer = document.getElementById('reportsContainer');

// Initialize reports module
export function initializeReportsModule(user) {
    currentUser = user;
    
    if (user.role !== 'admin') {
        console.warn('Reports module initialized for non-admin user');
        return;
    }
    
    setupReportsEventListeners();
    loadReports();
}

// Setup event listeners
function setupReportsEventListeners() {
    // Auto-refresh reports every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible' && currentUser && currentUser.role === 'admin') {
            loadReports();
        }
    }, 300000); // 5 minutes
}

// Load all reports
export async function loadReports() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showReportsLoading();
        
        // Load all report data in parallel
        const [userReport, bookReport, borrowReport] = await Promise.all([
            generateUserReport(),
            generateBookReport(),
            generateBorrowReport()
        ]);
        
        reportsData = {
            users: userReport,
            books: bookReport,
            borrows: borrowReport
        };
        
        renderReports();
        
    } catch (error) {
        console.error('Failed to load reports:', error);
        showNotification('Failed to load reports. Please try again.', 'error');
        renderReportsError();
    }
}

// Generate user report
async function generateUserReport() {
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

// Generate book report
async function generateBookReport() {
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
            utilizationRate: totalCopies > 0 ? ((borrowedCopies / totalCopies) * 100).toFixed(1) : 0,
            popularBooks,
            neverBorrowedCount: neverBorrowedBooks.length
        };
        
    } catch (error) {
        console.error('Failed to generate book report:', error);
        return null;
    }
}

// Generate borrow report
async function generateBorrowReport() {
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
            returnRate: borrows.length > 0 ? ((returnedBorrows.length / borrows.length) * 100).toFixed(1) : 0,
            monthlyStats
        };
        
    } catch (error) {
        console.error('Failed to generate borrow report:', error);
        return null;
    }
}

// Render all reports
function renderReports() {
    if (!reportsContainer) return;
    
    const { users, books, borrows } = reportsData;
    
    if (!users || !books || !borrows) {
        renderReportsError();
        return;
    }
    
    reportsContainer.innerHTML = `
        <div class="reports-grid">
            ${renderOverviewCards(users, books, borrows)}
            ${renderUserReport(users)}
            ${renderBookReport(books)}
            ${renderBorrowReport(borrows)}
            ${renderCharts(borrows)}
        </div>
    `;
}

// Render overview cards
function renderOverviewCards(users, books, borrows) {
    return `
        <div class="overview-cards">
            <div class="overview-card">
                <div class="card-icon users">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>${users.totalUsers}</h3>
                    <p>Total Users</p>
                    <small>${users.uniqueActiveBorrowers} active borrowers</small>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon books">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>${books.totalBooks}</h3>
                    <p>Total Books</p>
                    <small>${books.totalCopies} total copies</small>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon borrows">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>${borrows.activeBorrows}</h3>
                    <p>Active Borrows</p>
                    <small>${borrows.overdueCount} overdue</small>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon utilization">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h3>${books.utilizationRate}%</h3>
                    <p>Utilization Rate</p>
                    <small>${books.borrowedCopies}/${books.totalCopies} copies borrowed</small>
                </div>
            </div>
        </div>
    `;
}

// Render user report
function renderUserReport(users) {
    return `
        <div class="report-section">
            <h3>User Analytics</h3>
            <div class="report-content">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${users.adminUsers}</span>
                        <span class="stat-label">Administrators</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${users.memberUsers}</span>
                        <span class="stat-label">Members</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${users.uniqueActiveBorrowers}</span>
                        <span class="stat-label">Active Borrowers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${users.inactiveUsers}</span>
                        <span class="stat-label">Inactive Users</span>
                    </div>
                </div>
                
                <div class="top-users">
                    <h4>Most Active Users</h4>
                    <div class="users-list">
                        ${users.mostActiveUsers.slice(0, 5).map(user => `
                            <div class="user-item">
                                <div class="user-avatar-small">
                                    ${user.name.charAt(0).toUpperCase()}
                                </div>
                                <div class="user-info">
                                    <span class="user-name">${escapeHtml(user.name)}</span>
                                    <small>${user.totalBorrows} borrows</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render book report
function renderBookReport(books) {
    return `
        <div class="report-section">
            <h3>Book Analytics</h3>
            <div class="report-content">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${books.totalBooks}</span>
                        <span class="stat-label">Unique Titles</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${books.totalCopies}</span>
                        <span class="stat-label">Total Copies</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${books.availableCopies}</span>
                        <span class="stat-label">Available</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${books.neverBorrowedCount}</span>
                        <span class="stat-label">Never Borrowed</span>
                    </div>
                </div>
                
                <div class="popular-books">
                    <h4>Most Popular Books</h4>
                    <div class="books-list">
                        ${books.popularBooks.slice(0, 5).map(book => `
                            <div class="book-item">
                                <div class="book-cover-small">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
                                </div>
                                <div class="book-info">
                                    <span class="book-title">${escapeHtml(book.title)}</span>
                                    <small>${book.totalBorrows} borrows</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render borrow report
function renderBorrowReport(borrows) {
    return `
        <div class="report-section">
            <h3>Borrowing Analytics</h3>
            <div class="report-content">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${borrows.totalBorrows}</span>
                        <span class="stat-label">Total Borrows</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${borrows.activeBorrows}</span>
                        <span class="stat-label">Currently Active</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${borrows.returnRate}%</span>
                        <span class="stat-label">Return Rate</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${borrows.avgBorrowDuration}</span>
                        <span class="stat-label">Avg. Duration (days)</span>
                    </div>
                </div>
                
                ${borrows.overdueCount > 0 ? `
                    <div class="overdue-alert">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div>
                            <strong>${borrows.overdueCount} Overdue Books</strong>
                            <p>Immediate attention required</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Render charts
function renderCharts(borrows) {
    const monthlyData = Object.entries(borrows.monthlyStats)
        .sort(([a], [b]) => new Date(a) - new Date(b));
    
    return `
        <div class="report-section full-width">
            <h3>Borrowing Trends (Last 6 Months)</h3>
            <div class="chart-container">
                <div class="chart">
                    ${renderBarChart(monthlyData)}
                </div>
            </div>
        </div>
    `;
}

// Render simple bar chart
function renderBarChart(data) {
    if (data.length === 0) {
        return '<p class="no-data">No data available for the selected period</p>';
    }
    
    const maxValue = Math.max(...data.map(([, value]) => value));
    
    return `
        <div class="bar-chart">
            ${data.map(([month, value]) => {
                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                return `
                    <div class="bar-item">
                        <div class="bar" style="height: ${height}%">
                            <span class="bar-value">${value}</span>
                        </div>
                        <span class="bar-label">${month}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Show loading state
function showReportsLoading() {
    if (!reportsContainer) return;
    
    reportsContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading reports and analytics...</p>
        </div>
    `;
}

// Show error state
function renderReportsError() {
    if (!reportsContainer) return;
    
    reportsContainer.innerHTML = `
        <div class="error-state">
            <svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Failed to load reports</h3>
            <p>There was an error loading the reports and analytics. Please try again.</p>
            <button class="btn btn-primary" onclick="loadReports()">Retry</button>
        </div>
    `;
}

// Export functions for global use
window.loadReports = loadReports;

console.log('Reports module loaded successfully');