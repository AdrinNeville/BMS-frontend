function setupAdminEventListeners() {
    // Book management modals
    const closeManageBookModal = document.getElementById('closeManageBookModal');
    const cancelManageBookModal = document.getElementById('cancelManageBookModal');
    const addCopiesBtn = document.getElementById('addCopiesBtn');
    const removeCopiesBtn = document.getElementById('removeCopiesBtn');

    if (closeManageBookModal) closeManageBookModal.addEventListener('click', closeManageBookModal);
    if (cancelManageBookModal) cancelManageBookModal.addEventListener('click', closeManageBookModal);
    if (addCopiesBtn) addCopiesBtn.addEventListener('click', handleAddCopies);
    if (removeCopiesBtn) removeCopiesBtn.addEventListener('click', handleRemoveCopies);
}