// Check if user is authenticated before loading notifications content
async function checkAuthentication() {
    try {
        updateStatus("Checking authentication status...");
        console.log("Checking authentication status...");
        
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            updateStatus("Authentication failed, redirecting to login");
            console.log("Authentication failed, redirecting to login");
            window.location.href = '/login?message=loggedOut';
            return false;
        }
        
        updateStatus("Authentication successful, loading notifications");
        console.log("Authentication successful, loading notifications");
        return true;
    } catch (error) {
        updateStatus("Error checking authentication: " + error.message);
        console.error("Error checking authentication:", error);
        window.location.href = '/login?message=loggedOut';
        return false;
    }
}

// Update status display
function updateStatus(message) {
    const statusText = document.getElementById("status-text");
    if (statusText) {
        statusText.textContent = message;
    }
    console.log("Status:", message);
}

// Initialize socket connection for real-time notifications
let socket;
function initializeSocket() {
    socket = io({ path: '/socket.io' });
    
    socket.on('connect', () => {
        console.log('Connected to server for notifications');
    });
    
    socket.on('notification', (unreadCount) => {
        console.log('New notification received, refreshing notifications list');
        // Refresh the notifications list when a new notification arrives
        fetchNotifications();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

async function fetchNotifications() {
    try {
        updateStatus("Fetching notifications...");
        console.log("Fetching notifications...");
        const response = await fetch("/api/notifications", {
            method: "GET",
            credentials: "include" // Send cookies for authentication
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch notifications');
        }
        
        const data = await response.json();
        console.log("Notifications fetched:", data.notifications);
        console.log("Number of notifications:", data.notifications.length);
        
        updateStatus(`Found ${data.notifications.length} notifications`);
        
        // Log each notification for debugging
        data.notifications.forEach((notification, index) => {
            console.log(`Notification ${index + 1}:`, {
                id: notification._id,
                message: notification.message,
                sender: notification.sender,
                recipient: notification.recipient,
                roomId: notification.roomId,
                read: notification.read,
                createdAt: notification.createdAt
            });
        });
        
        displayNotifications(data.notifications);
    } catch (error) {
        updateStatus("Error fetching notifications: " + error.message);
        console.error("Error fetching notifications:", error);
        displayError("Error fetching notifications: " + error.message);
    }
}

function displayNotifications(notifications) {
    console.log("displayNotifications called with:", notifications);
    
    const notificationsList = document.getElementById("notifications-list");
    console.log("Found notifications list element:", notificationsList);
    
    if (!notificationsList) {
        console.error("Notifications list element not found");
        return;
    }
    
    // Clear the list first
    console.log("Clearing notifications list...");
    notificationsList.innerHTML = "";
    
    if (notifications.length === 0) {
        console.log("No notifications to display, showing 'no notifications' message");
        const noNotificationsItem = document.createElement("li");
        noNotificationsItem.textContent = "No new notifications.";
        noNotificationsItem.style.color = "green";
        notificationsList.appendChild(noNotificationsItem);
        return;
    }
    
    console.log(`Displaying ${notifications.length} notifications...`);
    
    notifications.forEach((notification, index) => {
        console.log(`Creating notification item ${index + 1}:`, notification.message);
        
        const notificationItem = document.createElement("li");
        notificationItem.textContent = notification.message;
        
        // Add accept button for join requests
        if (notification.message.includes("wants to join your private room") && !notification.read) {
            console.log("Adding accept button for join request");
            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept Request";
            acceptButton.addEventListener("click", async () => {
                const success = await handleRoomRequestNotification(notification.sender, notification.roomId, notification._id);
                if (success) {
                    acceptButton.style.display = "none";
                    notificationItem.remove();
                } else {
                    console.error("Error accepting room request");
                    displayError("Error accepting room request. User might already be in the room list");
                }
            });
            notificationItem.appendChild(acceptButton);
        }
        
        // Add mark as read button
        const markReadButton = document.createElement("button");
        markReadButton.textContent = notification.read ? "Already Read" : "Mark as Read";
        markReadButton.addEventListener("click", async () => {
            await markNotificationAsRead(notification._id);
            markReadButton.textContent = "Already Read";
            notificationItem.style.color = "green";
        });
        notificationItem.appendChild(markReadButton);
        
        // Add delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", async () => {
            await deleteNotification(notification._id);
            notificationsList.removeChild(notificationItem);
        });
        notificationItem.appendChild(deleteButton);
        
        notificationsList.appendChild(notificationItem);
        console.log(`Notification item ${index + 1} added to DOM`);
    });
    
    console.log("Finished displaying all notifications");
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: "POST",
            credentials: "include" // Send cookies for authentication
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to mark notification as read');
        }
        
        console.log("Notification marked as read successfully");
    } catch (error) {
        console.error("Error marking notification as read:", error);
        displayError("Error marking notification as read: " + error.message);
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/delete`, {
            method: "DELETE",
            credentials: "include" // Send cookies for authentication
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete notification');
        }
        
        console.log("Notification deleted successfully");
    } catch (error) {
        console.error("Error deleting notification:", error);
        displayError("Error deleting notification: " + error.message);
    }
}

async function handleRoomRequestNotification(senderId, roomId, notificationId) {
    try {
        const response = await fetch(`/api/rooms/${roomId}/${senderId}/accept`, {
            method: "POST",
            credentials: "include" // Send cookies for authentication
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to accept room request');
        }
        
        console.log("User added to the room successfully");
        await markNotificationAsRead(notificationId);
        return true;
    } catch (error) {
        console.error("Error accepting room request:", error);
        displayError("Error accepting room request: " + error.message);
        return false;
    }
}

function displayError(message) {
    showToast(message, "error");
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Notifications page loaded, checking authentication...");
    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
        console.log("Authentication successful, fetching notifications...");
        fetchNotifications();
        initializeSocket(); // Initialize socket connection
    }
});
