// notifications.js - UI Feedback System

// Main notification functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showWarning(message) {
    showNotification(message, 'warning');
}

// Core notification display function
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.getElementById('notification');
    if (!notification) {
        // Fallback to console if no notification element exists
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const messageEl = notification.querySelector('.notification-message');
    const closeBtn = notification.querySelector('.notification-close');
    
    if (messageEl) messageEl.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after specified duration
    const timeoutId = setTimeout(() => {
        hideNotification();
    }, duration);
    
    // Close button
    if (closeBtn) {
        closeBtn.onclick = () => {
            clearTimeout(timeoutId);
            hideNotification();
        };
    }
    
    // Store timeout ID for potential clearing
    notification.dataset.timeoutId = timeoutId;
}

// Hide notification with animation
function hideNotification() {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing timeout
    const timeoutId = notification.dataset.timeoutId;
    if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
    }
    
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
        notification.classList.add('hidden');
        notification.style.animation = '';
    }, 300);
}

// Clear all notifications
function clearAllNotifications() {
    hideNotification();
}

// Show API error with better formatting
function showApiError(error) {
    const message = getErrorMessage(error);
    showError(message);
    logError('API Error:', error);
}

// Show loading toast
function showLoadingToast(message = 'Loading...') {
    showNotification(message, 'info', 0); // 0 duration means don't auto-hide
}

// Hide loading toast
function hideLoadingToast() {
    hideNotification();
}

// Show confirmation dialog (using native confirm for now, could be enhanced)
function showConfirmDialog(message, title = 'Confirm Action') {
    return confirm(`${title}\n\n${message}`);
}

// Show prompt dialog (using native prompt for now, could be enhanced)
function showPromptDialog(message, defaultValue = '') {
    return prompt(message, defaultValue);
}

// Batch notifications (show multiple messages in sequence)
function showBatchNotifications(notifications, delay = 1000) {
    notifications.forEach((notification, index) => {
        setTimeout(() => {
            const { message, type = 'info', duration = 5000 } = notification;
            showNotification(message, type, duration);
        }, index * delay);
    });
}

// Show operation result
function showOperationResult(success, successMessage, errorMessage) {
    if (success) {
        showSuccess(successMessage);
    } else {
        showError(errorMessage);
    }
}

// Show network status
function showNetworkStatus(isOnline) {
    if (isOnline) {
        showSuccess('Connection restored');
    } else {
        showError('Connection lost. Some features may not work.');
    }
}

// Show validation errors
function showValidationErrors(errors) {
    if (Array.isArray(errors)) {
        errors.forEach(error => showError(error));
    } else if (typeof errors === 'string') {
        showError(errors);
    } else if (errors && typeof errors === 'object') {
        Object.values(errors).forEach(error => showError(error));
    }
}

// Show contextual help
function showContextualHelp(message, element) {
    // This could be enhanced to show tooltips near specific elements
    showInfo(message);
}

// Show progress notification (for long operations)
function showProgressNotification(message, progress = 0) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.log(`${message} - ${progress}%`);
        return;
    }
    
    const messageEl = notification.querySelector('.notification-message');
    const progressEl = notification.querySelector('.notification-progress');
    
    if (messageEl) messageEl.textContent = message;
    notification.className = 'notification progress';
    notification.classList.remove('hidden');
    
    // Update or create progress bar
    if (progressEl) {
        progressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    } else {
        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';
        progressBar.style.cssText = `
            width: ${Math.min(100, Math.max(0, progress))}%;
            height: 4px;
            background-color: #3b82f6;
            margin-top: 8px;
            border-radius: 2px;
            transition: width 0.3s ease;
        `;
        notification.appendChild(progressBar);
    }
}

// Hide progress notification
function hideProgressNotification() {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const progressEl = notification.querySelector('.notification-progress');
    if (progressEl) {
        progressEl.remove();
    }
    
    hideNotification();
}

// Show action notification with custom buttons
function showActionNotification(message, actions = []) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.log(`${message}`);
        return;
    }
    
    const messageEl = notification.querySelector('.notification-message');
    const actionsEl = notification.querySelector('.notification-actions') || 
                     document.createElement('div');
    
    if (messageEl) messageEl.textContent = message;
    notification.className = 'notification action';
    notification.classList.remove('hidden');
    
    // Clear existing actions
    actionsEl.innerHTML = '';
    actionsEl.className = 'notification-actions';
    
    // Add action buttons
    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.className = `btn btn-sm ${action.class || 'btn-secondary'}`;
        button.onclick = () => {
            if (action.handler) action.handler();
            if (action.hideAfter !== false) hideNotification();
        };
        actionsEl.appendChild(button);
    });
    
    // Add actions to notification if not already there
    if (!notification.querySelector('.notification-actions')) {
        notification.appendChild(actionsEl);
    }
}

// Initialize notification system
function initializeNotifications() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification';
        notificationContainer.className = 'notification hidden';
        notificationContainer.innerHTML = `
            <div class="notification-content">
                <div class="notification-message"></div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => showNetworkStatus(true));
    window.addEventListener('offline', () => showNetworkStatus(false));
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNotifications);