// reports.js - Reports and analytics functionality
import { makeAPIRequest, showNotification, escapeHtml } from './utils.js';

let currentUser = null;
let reportsData = {};

// DOM Elements
const totalBooks = document.getElementById('totalBooks');
const totalUsers = document.getElementById('totalUsers');
const activeBorrows = document.getElementById('activeBorrows');
const overdueCount = document.getElementById('overdueCount');
const popularBooks = document.getElementById('popularBooks');

// Chart elements (if using Chart.js)
let borrowTrendsChart = null;
let userActivityChart = null;
let bookPopularityChart = null;

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
    // Refresh button
    const refreshReportsBtn = document.getElementById('refreshReports');
    if (refreshReportsBtn) {
        refreshReportsBtn.addEventListener('click', loadReports);
    }
    
    // Export buttons
    const exportUserDataBtn = document.getElementById('exportUserData');
    const exportBookDataBtn = document.getElementById('exportBookData');
    const exportBorrowDataBtn = document.getElementById('exportBorrowData');
    
    if (exportUserDataBtn) {
        exportUserDataBtn.addEventListener('click', () => handleExportData('users'));
    }
    
    if (exportBookDataBtn) {
        exportBookDataBtn.addEventListener('click', () => handleExportData('books'));
    }
    
    if (exportBorrowDataBtn) {
        exportBorrowDataBtn.addEventListener('click', () => handleExportData('borrows'));
    }
    
    // Date range filters
    const dateRangeSelect = document.getElementById('dateRangeSelect');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', handleDateRangeChange);
    }
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible' && 
            document.querySelector('#reportsTabContent')?.classList.contains('active')) {
            loadReports();
        }
    }, 300000);
}

// Load all reports data
export async function loadReports() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        showReportsLoading();
        
        // Load data in parallel
        const [
            usersData,
            booksData,
            borrowsData,
            overdueData,
            statsData
        ] = await Promise.all([
            makeAPIRequest('/users'),
            makeAPIRequest('/books'),
            makeAPIRequest('/borrow/all'),
            makeAPIRequest('/borrow/overdue'),
            generateSystemStats()
        ]);
        
        reportsData = {
            users: usersData,
            books: booksData,
            borrows: borrowsData,
            overdue: overdueData,
            stats: statsData
        };
        
        renderReports(reportsData);
        
    } catch (error) {
        console.error('Failed to load reports:', error);
        showNotification('Failed to load reports data', 'error');
        renderReportsError();
    }
}

// Generate system statistics
async function generateSystemStats() {
    try {
        const [users, books, borrows] = await Promise.all([
            makeAPIRequest('/users'),
            makeAPIRequest('/books'),
            makeAPIRequest('/borrow/all')
        ]);
        
        const activeBorrowsList = borrows.filter(b => !b.returned_at);
        const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
        const borrowedCopies = books.reduce((sum, book) => sum + book.borrowed_copies, 0);
        
        // Calculate popular books
        const bookBorrowCounts = {};
        borrows.forEach(borrow => {
            if (!bookBorrowCounts[borrow.book_id]) {
                bookBorrowCounts[borrow.book_id] = { count: 0, book: null };
            }
            bookBorrowCounts[borrow.book_id].count++;
        });
        
        // Match books with their borrow counts
        const popularBooksList = books.map(book => ({
            ...book,
            borrow_count: bookBorrowCounts[book.id]?.count || 0
        }))
        .sort((a, b) => b.borrow_count - a.borrow_count)
        .slice(0, 10);
        
        return {
            totalBooks: books.length,
            totalUsers: users.length,
            activeBorrows: activeBorrowsList.length,
            totalCopies,
            borrowedCopies,
            availableCopies: totalCopies - borrowedCopies,
            popularBooks: popularBooksList,
            adminCount: users.filter(u => u.role === 'admin').length,
            memberCount: users.filter(u => u.role !== 'admin').length
        };
        
    } catch (error) {
        console.error('Failed to generate system stats:', error);
        return {};
    }
}

// Render all reports
function renderReports(data) {
    renderStatCards(data.stats);
    renderPopularBooks(data.stats.popularBooks);
    renderUserStats(data.users);
    renderBookStats(data.books);
    renderBorrowTrends(data.borrows);
    renderOverdueAnalysis(data.overdue);
}

// Render stat cards
function renderStatCards(stats) {
    if (totalBooks) totalBooks.textContent = stats.totalBooks || 0;
    if (totalUsers) totalUsers.textContent = stats.totalUsers || 0;
    if (activeBorrows) activeBorrows.textContent = stats.activeBorrows || 0;
    if (overdueCount) {
        const count = reportsData.overdue?.length || 0;
        overdueCount.textContent = count;
        
        // Update color based on overdue count
        const overdueCard = overdueCount.closest('.stat-card');
        if (overdueCard) {
            overdueCard.className = 'stat-card ' + (count > 0 ? 'warning' : 'success');
        }
    }
    
    // Additional stats
    const availableCopiesEl = document.getElementById('availableCopies');
    const utilizationRateEl = document.getElementById('utilizationRate');
    const adminCountEl = document.getElementById('adminCount');
    const memberCountEl = document.getElementById('memberCount');
    
    if (availableCopiesEl) availableCopiesEl.textContent = stats.availableCopies || 0;
    if (utilizationRateEl) {
        const rate = stats.totalCopies ? ((stats.borrowedCopies / stats.totalCopies) * 100).toFixed(1) : 0;
        utilizationRateEl.textContent = `${rate}%`;
    }
    if (adminCountEl) adminCountEl.textContent = stats.adminCount || 0;
    if (memberCountEl) memberCountEl.textContent = stats.memberCount || 0;
}

// Render popular books
function renderPopularBooks(books) {
    if (!popularBooks || !books) return;
    
    if (books.length === 0) {
        popularBooks.innerHTML = `
            <div class="empty-state">
                <h3>No borrowing activity</h3>
                <p>No books have been borrowed yet</p>
            </div>
        `;
        return;
    }
    
    popularBooks.innerHTML = `
        <div class="popular-books-list">
            ${books.map((book, index) => `
                <div class="popular-book-item" data-rank="${index + 1}">
                    <div class="book-rank">${index + 1}</div>
                    <div class="book-info">
                        <h4>${escapeHtml(book.title)}</h4>
                        <p>by ${escapeHtml(book.author)}</p>
                        <div class="book-stats">
                            <span class="borrow-count">${book.borrow_count} borrows</span>
                            <span class="copies-info">${book.total_copies} copies</span>
                        </div>
                    </div>
                    <div class="popularity-score">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${Math.min(100, (book.borrow_count / books[0].borrow_count) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render user statistics
function renderUserStats(users) {
    const userStatsContainer = document.getElementById('userStats');
    if (!userStatsContainer || !users) return;
    
    // Calculate user activity
    const borrows = reportsData.borrows || [];
    const userBorrowCounts = {};
    
    borrows.forEach(borrow => {
        if (!userBorrowCounts[borrow.user_id]) {
            userBorrowCounts[borrow.user_id] = 0;
        }
        userBorrowCounts[borrow.user_id]++;
    });
    
    const activeUsers = Object.keys(userBorrowCounts).length;
    const inactiveUsers = users.length - activeUsers;
    
    // Most active users
    const mostActiveUsers = users
        .map(user => ({
            ...user,
            borrowCount: userBorrowCounts[user.id] || 0
        }))
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 5);
    
    userStatsContainer.innerHTML = `
        <div class="user-stats-overview">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${activeUsers}</span>
                    <span class="stat-label">Active Users</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${inactiveUsers}</span>
                    <span class="stat-label">Inactive Users</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${((activeUsers / users.length) * 100).toFixed(1)}%</span>
                    <span class="stat-label">Engagement Rate</span>
                </div>
            </div>
        </div>
        
        <div class="most-active-users">
            <h4>Most Active Users</h4>
            <div class="active-users-list">
                ${mostActiveUsers.map((user, index) => `
                    <div class="active-user-item">
                        <div class="user-rank">${index + 1}</div>
                        <div class="user-info">
                            <div class="user-name">${escapeHtml(user.name)}</div>
                            <div class="user-email">${escapeHtml(user.email)}</div>
                        </div>
                        <div class="user-activity">
                            <span class="borrow-count">${user.borrowCount} borrows</span>
                            <span class="user-role role-${user.role}">${user.role}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render book statistics
function renderBookStats(books) {
    const bookStatsContainer = document.getElementById('bookStats');
    if (!bookStatsContainer || !books) return;
    
    const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
    const borrowedCopies = books.reduce((sum, book) => sum + book.borrowed_copies, 0);
    const availableCopies = totalCopies - borrowedCopies;
    
    // Books never borrowed
    const borrows = reportsData.borrows || [];
    const borrowedBookIds = [...new Set(borrows.map(b => b.book_id))];
    const neverBorrowedBooks = books.filter(book => !borrowedBookIds.includes(book.id));
    
    // Books with no available copies
    const fullyBorrowedBooks = books.filter(book => book.borrowed_copies === book.total_copies);
    
    bookStatsContainer.innerHTML = `
        <div class="book-stats-overview">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${totalCopies}</span>
                    <span class="stat-label">Total Copies</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${availableCopies}</span>
                    <span class="stat-label">Available</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${borrowedCopies}</span>
                    <span class="stat-label">Borrowed</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${((borrowedCopies / totalCopies) * 100).toFixed(1)}%</span>
                    <span class="stat-label">Utilization</span>
                </div>
            </div>
        </div>
        
        <div class="book-analysis">
            <div class="analysis-item">
                <h4>Never Borrowed (${neverBorrowedBooks.length})</h4>
                <div class="book-list">
                    ${neverBorrowedBooks.slice(0, 5).map(book => `
                        <div class="book-item">
                            <span class="book-title">${escapeHtml(book.title)}</span>
                            <span class="book-author">by ${escapeHtml(book.author)}</span>
                        </div>
                    `).join('')}
                    ${neverBorrowedBooks.length > 5 ? `<div class="more-items">+${neverBorrowedBooks.length - 5} more</div>` : ''}
                </div>
            </div>
            
            <div class="analysis-item">
                <h4>Fully Borrowed (${fullyBorrowedBooks.length})</h4>
                <div class="book-list">
                    ${fullyBorrowedBooks.slice(0, 5).map(book => `
                        <div class="book-item">
                            <span class="book-title">${escapeHtml(book.title)}</span>
                            <span class="book-author">by ${escapeHtml(book.author)}</span>
                        </div>
                    `).join('')}
                    ${fullyBorrowedBooks.length > 5 ? `<div class="more-items">+${fullyBorrowedBooks.length - 5} more</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Render borrow trends
function renderBorrowTrends(borrows) {
    const borrowTrendsContainer = document.getElementById('borrowTrends');
    if (!borrowTrendsContainer || !borrows) return;
    
    // Group borrows by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyBorrows = {};
    const monthlyReturns = {};
    
    borrows.forEach(borrow => {
        const borrowDate = new Date(borrow.borrowed_at);
        const borrowMonth = borrowDate.toISOString().slice(0, 7); // YYYY-MM format
        
        if (borrowDate >= sixMonthsAgo) {
            if (!monthlyBorrows[borrowMonth]) {
                monthlyBorrows[borrowMonth] = 0;
            }
            monthlyBorrows[borrowMonth]++;
        }
        
        if (borrow.returned_at) {
            const returnDate = new Date(borrow.returned_at);
            const returnMonth = returnDate.toISOString().slice(0, 7);
            
            if (returnDate >= sixMonthsAgo) {
                if (!monthlyReturns[returnMonth]) {
                    monthlyReturns[returnMonth] = 0;
                }
                monthlyReturns[returnMonth]++;
            }
        }
    });
    
    // Generate last 6 months labels
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push(date.toISOString().slice(0, 7));
    }
    
    const monthLabels = months.map(month => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
    });
    
    const borrowData = months.map(month => monthlyBorrows[month] || 0);
    const returnData = months.map(month => monthlyReturns[month] || 0);
    
    borrowTrendsContainer.innerHTML = `
        <div class="trends-overview">
            <div class="trend-summary">
                <div class="summary-item">
                    <span class="summary-value">${borrows.length}</span>
                    <span class="summary-label">Total Borrows</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${borrows.filter(b => b.returned_at).length}</span>
                    <span class="summary-label">Total Returns</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${borrows.filter(b => !b.returned_at).length}</span>
                    <span class="summary-label">Active Borrows</span>
                </div>
            </div>
        </div>
        
        <div class="trends-chart">
            <h4>6-Month Borrow Trends</h4>
            <div class="chart-container">
                <canvas id="borrowTrendsChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-legend">
                <div class="legend-item">
                    <div class="legend-color borrows"></div>
                    <span>Borrows</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color returns"></div>
                    <span>Returns</span>
                </div>
            </div>
        </div>
        
        <div class="monthly-breakdown">
            <h4>Monthly Breakdown</h4>
            <div class="breakdown-list">
                ${months.map((month, index) => {
                    const borrowCount = monthlyBorrows[month] || 0;
                    const returnCount = monthlyReturns[month] || 0;
                    return `
                        <div class="breakdown-item">
                            <div class="month-label">${monthLabels[index]}</div>
                            <div class="month-stats">
                                <span class="stat-borrows">${borrowCount} borrows</span>
                                <span class="stat-returns">${returnCount} returns</span>
                                <span class="stat-net ${borrowCount - returnCount >= 0 ? 'positive' : 'negative'}">
                                    ${borrowCount - returnCount >= 0 ? '+' : ''}${borrowCount - returnCount} net
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Create chart if Chart.js is available
    if (typeof Chart !== 'undefined') {
        createBorrowTrendsChart(monthLabels, borrowData, returnData);
    }
}

// Create borrow trends chart
function createBorrowTrendsChart(labels, borrowData, returnData) {
    const canvas = document.getElementById('borrowTrendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (borrowTrendsChart) {
        borrowTrendsChart.destroy();
    }
    
    borrowTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Borrows',
                    data: borrowData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Returns',
                    data: returnData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Render overdue analysis
function renderOverdueAnalysis(overdueList) {
    const overdueAnalysisContainer = document.getElementById('overdueAnalysis');
    if (!overdueAnalysisContainer) return;
    
    if (!overdueList || overdueList.length === 0) {
        overdueAnalysisContainer.innerHTML = `
            <div class="empty-state success">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <h3>No overdue books!</h3>
                <p>All books are returned on time. Excellent job!</p>
            </div>
        `;
        return;
    }
    
    // Analyze overdue patterns
    const overdueByDays = {};
    const overdueByUser = {};
    let totalOverdueDays = 0;
    
    overdueList.forEach(overdue => {
        const days = overdue.days_overdue;
        totalOverdueDays += days;
        
        // Group by overdue duration
        const dayRange = days <= 7 ? '1-7 days' : 
                        days <= 14 ? '8-14 days' : 
                        days <= 30 ? '15-30 days' : '30+ days';
        
        if (!overdueByDays[dayRange]) {
            overdueByDays[dayRange] = 0;
        }
        overdueByDays[dayRange]++;
        
        // Group by user
        const userName = overdue.user_name;
        if (!overdueByUser[userName]) {
            overdueByUser[userName] = [];
        }
        overdueByUser[userName].push(overdue);
    });
    
    const avgOverdueDays = Math.round(totalOverdueDays / overdueList.length);
    const worstOffenders = Object.entries(overdueByUser)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5);
    
    overdueAnalysisContainer.innerHTML = `
        <div class="overdue-overview">
            <div class="overdue-stats">
                <div class="stat-item urgent">
                    <span class="stat-value">${overdueList.length}</span>
                    <span class="stat-label">Overdue Books</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${avgOverdueDays}</span>
                    <span class="stat-label">Avg Days Overdue</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${(totalOverdueDays * 1.00).toFixed(2)}</span>
                    <span class="stat-label">Potential Fines</span>
                </div>
            </div>
        </div>
        
        <div class="overdue-breakdown">
            <div class="breakdown-section">
                <h4>Overdue Duration Breakdown</h4>
                <div class="duration-breakdown">
                    ${Object.entries(overdueByDays).map(([range, count]) => `
                        <div class="duration-item">
                            <div class="duration-label">${range}</div>
                            <div class="duration-count">${count} books</div>
                            <div class="duration-bar">
                                <div class="duration-fill" style="width: ${(count / overdueList.length) * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="breakdown-section">
                <h4>Users with Most Overdue Books</h4>
                <div class="offenders-list">
                    ${worstOffenders.map(([userName, overdues], index) => `
                        <div class="offender-item">
                            <div class="offender-rank">${index + 1}</div>
                            <div class="offender-info">
                                <div class="offender-name">${escapeHtml(userName)}</div>
                                <div class="offender-details">${overdues.length} overdue books</div>
                            </div>
                            <div class="offender-actions">
                                <button class="btn btn-sm btn-warning" onclick="sendBulkReminder('${userName}')">
                                    Send Reminder
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="overdue-actions">
            <button class="btn btn-warning" onclick="sendAllOverdueReminders()">
                Send All Reminders
            </button>
            <button class="btn btn-danger" onclick="generateOverdueReport()">
                Generate Overdue Report
            </button>
        </div>
    `;
}

// Show loading state
function showReportsLoading() {
    const containers = [
        totalBooks, totalUsers, activeBorrows, overdueCount,
        popularBooks, document.getElementById('userStats'),
        document.getElementById('bookStats'), document.getElementById('borrowTrends'),
        document.getElementById('overdueAnalysis')
    ];
    
    containers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
        }
    });
}

// Show error state
function renderReportsError() {
    const mainContainer = document.querySelector('.reports-grid') || document.getElementById('reportsContent');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div class="error-state">
                <svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Failed to load reports</h3>
                <p>There was an error loading the reports data. Please try again.</p>
                <button class="btn btn-primary" onclick="loadReports()">Retry</button>
            </div>
        `;
    }
}

// Handle date range change
function handleDateRangeChange() {
    const dateRange = document.getElementById('dateRangeSelect')?.value;
    if (dateRange) {
        loadReportsForDateRange(dateRange);
    }
}

async function loadReportsForDateRange(range) {
    // This would filter reports based on date range
    // For now, we'll just reload all reports
    await loadReports();
    showNotification(`Reports updated for ${range} period`, 'success');
}

// Export data functions
async function handleExportData(type) {
    try {
        showNotification(`Preparing ${type} export...`, 'info');
        
        let data, filename;
        
        switch (type) {
            case 'users':
                data = await prepareUserExportData();
                filename = `users_report_${new Date().toISOString().slice(0, 10)}.json`;
                break;
            case 'books':
                data = await prepareBookExportData();
                filename = `books_report_${new Date().toISOString().slice(0, 10)}.json`;
                break;
            case 'borrows':
                data = await prepareBorrowExportData();
                filename = `borrows_report_${new Date().toISOString().slice(0, 10)}.json`;
                break;
        }
        
        if (data) {
            downloadJSONData(data, filename);
            showNotification(`${type} data exported successfully!`, 'success');
        }
        
    } catch (error) {
        console.error(`Failed to export ${type} data:`, error);
        showNotification(`Failed to export ${type} data`, 'error');
    }
}

async function prepareUserExportData() {
    const users = reportsData.users || [];
    const borrows = reportsData.borrows || [];
    
    return users.map(user => {
        const userBorrows = borrows.filter(b => b.user_id === user.id);
        const activeBorrows = userBorrows.filter(b => !b.returned_at);
        const overdueBooks = userBorrows.filter(b => {
            if (b.returned_at) return false;
            const borrowDate = new Date(b.borrowed_at);
            const dueDate = new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000));
            return new Date() > dueDate;
        });
        
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            totalBorrows: userBorrows.length,
            activeBorrows: activeBorrows.length,
            overdueBooks: overdueBooks.length,
            lastActivity: userBorrows.length > 0 ? 
                new Date(Math.max(...userBorrows.map(b => new Date(b.borrowed_at)))).toISOString() : null
        };
    });
}

async function prepareBookExportData() {
    const books = reportsData.books || [];
    const borrows = reportsData.borrows || [];
    
    return books.map(book => {
        const bookBorrows = borrows.filter(b => b.book_id === book.id);
        const activeBorrows = bookBorrows.filter(b => !b.returned_at);
        
        return {
            id: book.id,
            title: book.title,
            author: book.author,
            totalCopies: book.total_copies,
            availableCopies: book.total_copies - book.borrowed_copies,
            borrowedCopies: book.borrowed_copies,
            totalBorrows: bookBorrows.length,
            activeBorrows: activeBorrows.length,
            popularityScore: book.total_copies > 0 ? (bookBorrows.length / book.total_copies) : 0,
            utilizationRate: book.total_copies > 0 ? ((book.borrowed_copies / book.total_copies) * 100) : 0
        };
    });
}

async function prepareBorrowExportData() {
    const borrows = reportsData.borrows || [];
    
    return borrows.map(borrow => {
        const borrowDate = new Date(borrow.borrowed_at);
        const returnDate = borrow.returned_at ? new Date(borrow.returned_at) : null;
        const dueDate = new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        const isOverdue = !returnDate && new Date() > dueDate;
        const duration = returnDate ? 
            Math.ceil((returnDate - borrowDate) / (1000 * 60 * 60 * 24)) : 
            Math.ceil((new Date() - borrowDate) / (1000 * 60 * 60 * 24));
        
        return {
            id: borrow.id,
            userId: borrow.user_id,
            bookId: borrow.book_id,
            borrowedAt: borrow.borrowed_at,
            returnedAt: borrow.returned_at,
            durationDays: duration,
            isOverdue: isOverdue,
            overdueDays: isOverdue ? Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24)) : 0
        };
    });
}

function downloadJSONData(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Action functions
window.sendAllOverdueReminders = async function() {
    const overdueList = reportsData.overdue || [];
    if (overdueList.length === 0) {
        showNotification('No overdue books to send reminders for', 'info');
        return;
    }
    
    if (!confirm(`Send reminders to ${overdueList.length} users with overdue books?`)) {
        return;
    }
    
    try {
        // Simulate sending reminders
        showNotification('Sending overdue reminders...', 'info');
        
        // In a real application, this would send actual emails
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification(`Sent reminders to ${overdueList.length} users`, 'success');
        console.log('Overdue reminders sent to:', overdueList.map(o => o.user_email));
        
    } catch (error) {
        console.error('Failed to send reminders:', error);
        showNotification('Failed to send reminders', 'error');
    }
};

window.sendBulkReminder = async function(userName) {
    try {
        showNotification(`Sending reminder to ${userName}...`, 'info');
        
        // Simulate sending reminder
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showNotification(`Reminder sent to ${userName}`, 'success');
        console.log(`Bulk reminder sent to user: ${userName}`);
        
    } catch (error) {
        console.error('Failed to send bulk reminder:', error);
        showNotification('Failed to send reminder', 'error');
    }
};

window.generateOverdueReport = function() {
    const overdueList = reportsData.overdue || [];
    if (overdueList.length === 0) {
        showNotification('No overdue books to report', 'info');
        return;
    }
    
    const reportData = {
        generatedAt: new Date().toISOString(),
        totalOverdue: overdueList.length,
        report: overdueList.map(overdue => ({
            borrowId: overdue.borrow_id,
            userInfo: {
                name: overdue.user_name,
                email: overdue.user_email
            },
            bookInfo: {
                title: overdue.book_title,
                author: overdue.book_author
            },
            borrowedAt: overdue.borrowed_at,
            daysOverdue: overdue.days_overdue,
            estimatedFine: overdue.days_overdue * 1.00
        }))
    };
    
    const filename = `overdue_report_${new Date().toISOString().slice(0, 10)}.json`;
    downloadJSONData(reportData, filename);
    
    showNotification('Overdue report generated successfully!', 'success');
};

// Get reports data for external use
export function getReportsData() {
    return reportsData;
}

// Cleanup function
export function cleanupReports() {
    if (borrowTrendsChart) {
        borrowTrendsChart.destroy();
        borrowTrendsChart = null;
    }
    
    if (userActivityChart) {
        userActivityChart.destroy();
        userActivityChart = null;
    }
    
    if (bookPopularityChart) {
        bookPopularityChart.destroy();
        bookPopularityChart = null;
    }
}

// Global function exports
window.loadReports = loadReports;
window.sendAllOverdueReminders = window.sendAllOverdueReminders;
window.sendBulkReminder = window.sendBulkReminder;
window.generateOverdueReport = window.generateOverdueReport;

console.log('Reports module loaded successfully');