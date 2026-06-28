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

function updateStatus(message) {
    const statusText = document.getElementById("status-text");
    const statusBar = document.getElementById("status");
    if (statusText) {
        statusText.textContent = message;
    }

    if (statusBar) {
        const isError = /error|failed|denied|invalid|unable|problem/i.test(message);
        statusBar.classList.toggle("is-error", isError);
        statusBar.classList.toggle("is-success", !isError);
    }
}

let socket;
let notificationsPage = 1;
const notificationsPageSize = 10;
let notificationsTotalPages = 1;
let notificationListHandlerAttached = false;

function closeNotificationMenus(exceptMenu = null) {
    document.querySelectorAll(".notification-menu.is-open").forEach(menu => {
        if (menu !== exceptMenu) {
            menu.classList.remove("is-open");
            const toggle = menu.closest(".notification-action-wrap")?.querySelector("[data-action='toggle-menu']");
            if (toggle) {
                toggle.setAttribute("aria-expanded", "false");
            }
        }
    });
}

function initializeSocket() {
    socket = window.createAppSocket ? window.createAppSocket() : { on() {}, emit() {}, connect() {}, disconnect() {}, off() {} };

    socket.on('connect', () => {});

    socket.on('notification', () => {
        fetchNotifications();
    });

    socket.on('disconnect', () => {});
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
                credentials: "include"
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

        if (action === "toggle-menu") {
            const wrap = button.closest(".notification-action-wrap");
            const menu = wrap ? wrap.querySelector(".notification-menu") : null;
            if (!menu) {
                return;
            }

            const willOpen = !menu.classList.contains("is-open");
            closeNotificationMenus(menu);
            menu.classList.toggle("is-open", willOpen);
            button.setAttribute("aria-expanded", String(willOpen));
            return;
        }

        closeNotificationMenus();

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

    notificationsList.innerHTML = "";

    if (notifications.length === 0) {
        const noNotificationsItem = document.createElement("li");
        noNotificationsItem.textContent = "No new notifications.";
        noNotificationsItem.style.color = "green";
        notificationsList.appendChild(noNotificationsItem);
        return;
    }

    notifications.forEach(notification => {
        const notificationItem = document.createElement("li");
        notificationItem.className = "notification-item";

        const content = document.createElement("div");
        content.className = "notification-content";

        const message = document.createElement("span");
        message.className = "notification-message";
        message.textContent = notification.message;
        content.appendChild(message);

        const isJoinRequest = notification.message.includes("wants to join your private room");

        const meta = document.createElement("div");
        meta.className = "notification-status-row";

        const statusBadge = document.createElement("span");
        statusBadge.className = `notification-status-badge ${notification.read ? "read" : "unread"}`;
        statusBadge.textContent = isJoinRequest && !notification.read ? "Join request" : (notification.read ? "Read" : "Unread");
        meta.appendChild(statusBadge);
        content.appendChild(meta);

        const actionWrap = document.createElement("div");
        actionWrap.className = "notification-action-wrap";

        const primaryActions = document.createElement("div");
        primaryActions.className = "notification-primary-actions";

        if (isJoinRequest && !notification.read) {
            const acceptButton = document.createElement("button");
            acceptButton.type = "button";
            acceptButton.textContent = "Accept";
            acceptButton.title = "Accept join request";
            acceptButton.setAttribute("aria-label", "Accept join request");
            acceptButton.className = "primary-action-button accept-button";
            acceptButton.dataset.action = "accept-request";
            acceptButton.dataset.notificationId = notification._id;
            acceptButton.dataset.roomId = notification.roomId;
            acceptButton.dataset.senderId = notification.sender;
            primaryActions.appendChild(acceptButton);
        }

        const overflowButton = document.createElement("button");
        overflowButton.type = "button";
        overflowButton.textContent = "\u22EE";
        overflowButton.title = "More actions";
        overflowButton.setAttribute("aria-label", "More actions");
        overflowButton.setAttribute("aria-expanded", "false");
        overflowButton.className = "icon-button overflow-button";
        overflowButton.dataset.action = "toggle-menu";

        const menu = document.createElement("div");
        menu.className = "notification-menu";

        if (!notification.read && !isJoinRequest) {
            const markReadButton = document.createElement("button");
            markReadButton.type = "button";
            markReadButton.textContent = "Mark as read";
            markReadButton.className = "menu-item";
            markReadButton.dataset.action = "mark-read";
            markReadButton.dataset.notificationId = notification._id;
            markReadButton.dataset.isRead = String(notification.read);
            menu.appendChild(markReadButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "menu-item danger-menu-item";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.notificationId = notification._id;
        menu.appendChild(deleteButton);

        actionWrap.appendChild(primaryActions);
        actionWrap.appendChild(overflowButton);
        actionWrap.appendChild(menu);

        notificationItem.appendChild(content);
        notificationItem.appendChild(actionWrap);
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
                credentials: "include"
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
                credentials: "include"
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
                credentials: "include"
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
        initializeSocket();
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

document.addEventListener("click", event => {
    if (!event.target.closest(".notification-action-wrap")) {
        closeNotificationMenus();
    }
});
