// User info elements
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const logoutBtn = document.getElementById('logoutBtn');

// User Modal elements
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserRole = document.getElementById('modalUserRole');
const modalUserId = document.getElementById('modalUserId');

function setupAdminEventListeners() {
    // User modals
    const closeUserModalBtn = document.getElementById('closeUserModalBtn');
    const cancelUserModal = document.getElementById('cancelUserModal');
    const changeRoleBtn = document.getElementById('changeRoleBtn');
    const deleteUserBtn = document.getElementById('deleteUserBtn');

    if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
    if (cancelUserModal) cancelUserModal.addEventListener('click', closeUserModal);
    if (changeRoleBtn) changeRoleBtn.addEventListener('click', handleChangeUserRole);
    if (deleteUserBtn) deleteUserBtn.addEventListener('click', handleDeleteUser);
}

// Render users
function renderUsers(users) {
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
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
                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="openUserModal('${user.id}')">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Render users error
function renderUsersError() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                Failed to load users. Please try again.
            </td>
        </tr>
    `;
}

// User modal functions
function openUserModal(userId) {
    const userModal = document.getElementById('userModal');
    if (!userModal) return;

    // 1. Show modal
    userModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // 2. Find user data (assuming you have allUsers in memory)
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        console.error('User not found:', userId);
        return;
    }

    // 3. Populate modal content (example fields)
    userModal.getElementById('modalUserName').textContent = user.name || 'N/A';
    userModal.getElementById('modalUserEmail').textContent = user.email || 'N/A';
    userModal.getElementById('modalUserRole').textContent = user.role || 'member';

    console.log('Opened user modal for:', userId);
}


async function handleChangeUserRole(userId, newRole) {
    try {
        console.log(`Changing role for user ${userId} to ${newRole}`);

        const response = await fetch(`/users/${userId}/role?new_role=${newRole}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}` // use your token helper
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to update role");
        }

        const data = await response.json();

        // Update local copy of allUsers (if you’re storing them)
        allUsers = allUsers.map(user =>
            user.id === userId ? { ...user, role: newRole } : user
        );

        // Re-render the users table
        renderUsers(allUsers);

        alert(data.message);
        console.log("Role updated successfully:", data);
    } catch (error) {
        console.error("Error changing user role:", error);
        alert(`Error: ${error.message}`);
    }
}

async function handleDeleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {
        console.log(`Deleting user ${userId}`);

        const response = await fetch(`/users/${userId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to delete user");
        }

        const data = await response.json();

        // Remove from local allUsers
        allUsers = allUsers.filter(user => user.id !== userId);

        // Re-render the users table
        renderUsers(allUsers);

        alert(data.message || "User deleted successfully");
        console.log("User deleted successfully:", data);
    } catch (error) {
        console.error("Error deleting user:", error);
        alert(`Error: ${error.message}`);
    }
}

function closeUserModal() {
    const userModal = document.getElementById('userModal');
    if (userModal) {
        userModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}