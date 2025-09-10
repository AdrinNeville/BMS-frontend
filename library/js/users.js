// users.js - User Management Module (Admin Only)

// DOM Elements
const usersTableBody = document.getElementById('usersTableBody');

// User Modal elements
const userModal = document.getElementById('userModal');
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserRole = document.getElementById('modalUserRole');
const modalUserId = document.getElementById('modalUserId');

// Setup event listeners for users functionality
function setupUsersEventListeners() {
    // User modals
    const closeUserModalBtn = document.getElementById('closeUserModalBtn');
    const cancelUserModal = document.getElementById('cancelUserModal');
    const changeRoleBtn = document.getElementById('changeRoleBtn');
    const deleteUserBtn = document.getElementById('deleteUserBtn');

    if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
    if (cancelUserModal) cancelUserModal.addEventListener('click', closeUserModal);
    if (changeRoleBtn) changeRoleBtn.addEventListener('click', handleChangeUserRoleFromModal);
    if (deleteUserBtn) deleteUserBtn.addEventListener('click', handleDeleteUserFromModal);
}

// Load users from API
async function loadUsers() {
    try {
        if (!usersTableBody) return;
        showLoadingTable(usersTableBody);
        const users = await getUsersFromAPI();
        allUsers = Array.isArray(users) ? users : [];
        renderUsers(allUsers);
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users. Please try again.');
        if (usersTableBody) renderUsersError();
    }
}

// Render users table
function renderUsers(users) {
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #6b7280;">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.name || '')}</td>
            <td>${escapeHtml(user.email || '')}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'borrowed' : 'available'}">
                    ${user.role || 'member'}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openUserModal('${user.id}')">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Render users error state
function renderUsersError() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: #ef4444;">
                Failed to load users. Please try again.
            </td>
        </tr>
    `;
}

// Open user modal
function openUserModal(userId) {
    if (!userModal) return;

    // Find user data
    const user = findById(allUsers, userId);
    if (!user) {
        console.error('User not found:', userId);
        showError('User not found');
        return;
    }

    // Populate modal content
    if (modalUserName) modalUserName.textContent = user.name || 'N/A';
    if (modalUserEmail) modalUserEmail.textContent = user.email || 'N/A';
    if (modalUserRole) modalUserRole.textContent = user.role || 'member';
    if (modalUserId) modalUserId.textContent = user.id;

    // Store user ID for actions
    userModal.dataset.userId = userId;

    openModal('userModal');
    console.log('Opened user modal for:', userId);
}

// Close user modal
function closeUserModal() {
    closeModal('userModal');
}

// Handle change user role from modal
async function handleChangeUserRoleFromModal() {
    const userId = userModal?.dataset.userId;
    if (!userId) return;

    const user = findById(allUsers, userId);
    if (!user) return;

    const currentRole = user.role || 'member';
    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    const confirmMessage = `Change ${user.name}'s role from '${currentRole}' to '${newRole}'?`;
    if (!showConfirmDialog(confirmMessage)) return;

    await handleChangeUserRole(userId, newRole);
}

// Handle delete user from modal
async function handleDeleteUserFromModal() {
    const userId = userModal?.dataset.userId;
    if (!userId) return;

    const user = findById(allUsers, userId);
    if (!user) return;

    const confirmMessage = `Are you sure you want to delete user '${user.name}' (${user.email})? This action cannot be undone.`;
    if (!showConfirmDialog(confirmMessage)) return;

    await handleDeleteUser(userId);
}

// Handle change user role
async function handleChangeUserRole(userId, newRole) {
    const changeRoleBtn = document.getElementById('changeRoleBtn');
    
    try {
        if (changeRoleBtn) setButtonLoading(changeRoleBtn, true);
        
        console.log(`Changing role for user ${userId} to ${newRole}`);

        const result = await changeUserRoleAPI(userId, newRole);

        // Update local copy of allUsers
        allUsers = updateById(allUsers, userId, { role: newRole });

        // Re-render the users table
        renderUsers(allUsers);

        showSuccess(result.message || 'User role updated successfully');
        closeUserModal();
        
        console.log("Role updated successfully:", result);
    } catch (error) {
        console.error("Error changing user role:", error);
        showApiError(error);
    } finally {
        if (changeRoleBtn) setButtonLoading(changeRoleBtn, false);
    }
}

// Handle delete user
async function handleDeleteUser(userId) {
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    
    try {
        if (deleteUserBtn) setButtonLoading(deleteUserBtn, true);
        
        console.log(`Deleting user ${userId}`);

        const result = await deleteUserFromAPI(userId);

        // Remove from local allUsers
        allUsers = removeById(allUsers, userId);

        // Re-render the users table
        renderUsers(allUsers);

        showSuccess(result.message || "User deleted successfully");
        closeUserModal();
        
        console.log("User deleted successfully:", result);
    } catch (error) {
        console.error("Error deleting user:", error);
        showApiError(error);
    } finally {
        if (deleteUserBtn) setButtonLoading(deleteUserBtn, false);
    }
}

// Search users
function searchUsers(query) {
    if (!query) {
        renderUsers(allUsers);
        return allUsers;
    }
    
    const filtered = filterByQuery(allUsers, query, ['name', 'email']);
    renderUsers(filtered);
    return filtered;
}

// Filter users by role
function filterUsersByRole(role) {
    let filtered;
    
    switch (role) {
        case 'admin':
            filtered = allUsers.filter(user => user.role === 'admin');
            break;
        case 'member':
            filtered = allUsers.filter(user => user.role !== 'admin');
            break;
        default:
            filtered = allUsers;
    }
    
    renderUsers(filtered);
    return filtered;
}

// Get user statistics
function getUserStatistics() {
    const totalUsers = allUsers.length;
    const adminCount = allUsers.filter(user => user.role === 'admin').length;
    const memberCount = totalUsers - adminCount;
    
    return {
        total: totalUsers,
        admins: adminCount,
        members: memberCount,
        adminPercentage: totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0,
        memberPercentage: totalUsers > 0 ? Math.round((memberCount / totalUsers) * 100) : 0
    };
}

// Bulk user operations (for future enhancement)
function bulkChangeUserRoles(userIds, newRole) {
    const promises = userIds.map(id => handleChangeUserRole(id, newRole));
    return Promise.all(promises);
}

function bulkDeleteUsers(userIds) {
    if (!showConfirmDialog(`Delete ${userIds.length} users? This action cannot be undone.`)) {
        return;
    }
    
    const promises = userIds.map(id => handleDeleteUser(id));
    return Promise.all(promises);
}

// Export users data
function exportUsersData() {
    const stats = getUserStatistics();
    const exportData = {
        timestamp: new Date().toISOString(),
        exportedBy: currentUser.name,
        statistics: stats,
        users: allUsers.map(user => ({
            name: user.name,
            email: user.email,
            role: user.role,
            id: user.id
        }))
    };
    
    return exportData;
}

// Validate user data
function validateUserData(userData) {
    const errors = [];
    
    if (!validateRequired(userData.name)) {
        errors.push('Name is required');
    }
    
    if (!validateRequired(userData.email)) {
        errors.push('Email is required');
    } else if (!validateEmail(userData.email)) {
        errors.push('Email format is invalid');
    }
    
    if (userData.role && !['admin', 'member'].includes(userData.role)) {
        errors.push('Role must be either "admin" or "member"');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}