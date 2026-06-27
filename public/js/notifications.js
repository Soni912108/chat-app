// Check if user is authenticated before loading notifications content
async function checkAuthentication() {
    try {
        updateStatus("Checking authentication status...");

        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            updateStatus("Authentication failed, redirecting to login");

            handleAuthExpired();
            return false;
        }
        
        updateStatus("Authentication successful, loading notifications");

        return true;
    } catch (error) {
        updateStatus("Error checking authentication: " + error.message);

        handleAuthExpired();
        return false;
    }
}

// Update status display
function updateStatus(message) {
    const statusText = document.getElementById("status-text");
    if (statusText) {
        statusText.textContent = message;
    }

}

// Initialize socket connection for real-time notifications
let socket;
let notificationsPage = 1;
const notificationsPageSize = 10;
let notificationsTotalPages = 1;
let notificationListHandlerAttached = false;
function initializeSocket() {
    socket = window.createAppSocket ? window.createAppSocket() : { on() {}, emit() {}, connect() {}, disconnect() {}, off() {} };
    
    socket.on('connect', () => {

    });
    
    socket.on('notification', (unreadCount) => {

        // Refresh the notifications list when a new notification arrives
        fetchNotifications();
    });
    
    socket.on('disconnect', () => {

    });
}

async function fetchNotifications() {
    await withGlobalLoading(async () => {
        try {
            const pageInfo = document.getElementById("notificationsPageInfo");
            const prevButton = document.getElementById("notificationsPrevPage");
            const nextButton = document.getElementById("notificationsNextPage");
            updateStatus("Fetching notifications...");

            const response = await fetch(`/api/notifications?page=${notificationsPage}&limit=${notificationsPageSize}`, {
                method: "GET",
                credentials: "include" // Send cookies for authentication
            });
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch notifications');
            }
            
            const data = await response.json();


            notificationsTotalPages = data.totalPages || 1;
            updateStatus(`Showing page ${data.page || notificationsPage} of ${notificationsTotalPages}`);
            if (pageInfo) {
                pageInfo.textContent = `Page ${data.page || notificationsPage} of ${notificationsTotalPages}`;
            }
            if (prevButton) {
                prevButton.disabled = (data.page || notificationsPage) <= 1;
            }
            if (nextButton) {
                nextButton.disabled = (data.page || notificationsPage) >= notificationsTotalPages;
            }
            
            displayNotifications(data.notifications);
            updateNotificationControls(data.unreadNotifications ?? 0);
        } catch (error) {
            updateStatus("Error fetching notifications: " + error.message);

            displayError("Error fetching notifications: " + error.message);
        }
    }, "Loading notifications...");
}

function initializeNotificationListHandlers() {
    if (notificationListHandlerAttached) {
        return;
    }

    const notificationsList = document.getElementById("notifications-list");
    if (!notificationsList) {
        return;
    }

    notificationsList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }

        const { action, notificationId, roomId, senderId, isRead } = button.dataset;
        if (action === "mark-read") {
            if (isRead === "true") {
                return;
            }

            const confirmed = await confirmDialog({
                title: "Mark as read",
                message: "Do you want to mark this notification as read?",
                confirmText: "Mark as read",
                danger: false
            });

            if (!confirmed) {
                return;
            }

            await markNotificationAsRead(notificationId);
            await fetchNotifications();
            if (typeof getNotificationNumber === 'function') {
                getNotificationNumber();
            }
            return;
        }

        if (action === "delete") {
            const confirmed = await confirmDialog({
                title: "Delete notification",
                message: "Do you want to delete this notification?",
                confirmText: "Delete",
                danger: true
            });

            if (!confirmed) {
                return;
            }

            await deleteNotification(notificationId);
            await fetchNotifications();
            if (typeof getNotificationNumber === 'function') {
                getNotificationNumber();
            }
            return;
        }

        if (action === "accept-request") {
            const success = await handleRoomRequestNotification(senderId, roomId, notificationId);
            if (success) {
                await fetchNotifications();
                if (typeof getNotificationNumber === 'function') {
                    getNotificationNumber();
                }
            }
        }
    });

    notificationListHandlerAttached = true;
}

function displayNotifications(notifications) {

    const notificationsList = document.getElementById("notifications-list");

    if (!notificationsList) {

        return;
    }
    
    // Clear the list first

    notificationsList.innerHTML = "";
    
    if (notifications.length === 0) {

        const noNotificationsItem = document.createElement("li");
        noNotificationsItem.textContent = "No new notifications.";
        noNotificationsItem.style.color = "green";
        notificationsList.appendChild(noNotificationsItem);
        return;
    }
    

    notifications.forEach((notification, index) => {

        const notificationItem = document.createElement("li");
        notificationItem.textContent = notification.message;
        
        // Add accept button for join requests
        if (notification.message.includes("wants to join your private room") && !notification.read) {

            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept Request";
            acceptButton.dataset.action = "accept-request";
            acceptButton.dataset.notificationId = notification._id;
            acceptButton.dataset.roomId = notification.roomId;
            acceptButton.dataset.senderId = notification.sender;
            notificationItem.appendChild(acceptButton);
        }
        
        // Add mark as read button
        const markReadButton = document.createElement("button");
        markReadButton.textContent = notification.read ? "Already Read" : "Mark as Read";
        markReadButton.disabled = notification.read;
        markReadButton.dataset.action = "mark-read";
        markReadButton.dataset.notificationId = notification._id;
        markReadButton.dataset.isRead = String(notification.read);
        notificationItem.appendChild(markReadButton);
        
        // Add delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.notificationId = notification._id;
        notificationItem.appendChild(deleteButton);
        
        notificationsList.appendChild(notificationItem);

    });
    

}

function updateNotificationControls(unreadNotifications) {
    const markAllButton = document.getElementById("markAllRead");
    if (markAllButton) {
        markAllButton.disabled = unreadNotifications === 0;
        markAllButton.textContent = unreadNotifications === 0 ? "All read" : "Mark all as read";
    }
}

async function markNotificationAsRead(notificationId) {
    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: "POST",
                credentials: "include" // Send cookies for authentication
            });
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to mark notification as read');
            }
            

        } catch (error) {

            displayError("Error marking notification as read: " + error.message);
        }
    }, "Updating notification...");
}

async function deleteNotification(notificationId) {
    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/delete`, {
                method: "DELETE",
                credentials: "include" // Send cookies for authentication
            });
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete notification');
            }
            

        } catch (error) {

            displayError("Error deleting notification: " + error.message);
        }
    }, "Deleting notification...");
}

async function handleRoomRequestNotification(senderId, roomId, notificationId) {
    return withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/${senderId}/accept`, {
                method: "POST",
                credentials: "include" // Send cookies for authentication
            });
            if (response.status === 401) {
                handleAuthExpired();
                return false;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to accept room request');
            }
            

            await markNotificationAsRead(notificationId);
            return true;
        } catch (error) {

            displayError("Error accepting room request: " + error.message);
            return false;
        }
    }, "Accepting request...");
}

function displayError(message) {
    showToast(message, "error");
}

async function markAllNotificationsAsRead() {
    try {
        const confirmed = await confirmDialog({
            title: "Mark all as read",
            message: "Do you want to mark all notifications as read?",
            confirmText: "Mark all",
            danger: false
        });

        if (!confirmed) {
            return;
        }

        await withGlobalLoading(async () => {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to mark notifications as read');
            }

            const data = await response.json();
            showToast(data.message || "All notifications marked as read", "success");
            notificationsPage = 1;
            await fetchNotifications();
            if (typeof getNotificationNumber === 'function') {
                getNotificationNumber();
            }
        }, "Marking notifications...");
    } catch (error) {

        displayError("Error marking all notifications as read: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {

        initializeNotificationListHandlers();
        fetchNotifications();
        initializeSocket(); // Initialize socket connection
    }
});

document.getElementById("markAllRead").addEventListener("click", markAllNotificationsAsRead);
document.getElementById("notificationsPrevPage").addEventListener("click", () => {
    if (notificationsPage > 1) {
        notificationsPage -= 1;
        fetchNotifications();
    }
});
document.getElementById("notificationsNextPage").addEventListener("click", () => {
    if (notificationsPage < notificationsTotalPages) {
        notificationsPage += 1;
        fetchNotifications();
    }
});
