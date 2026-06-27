const socket = io({ path: '/socket.io' });

let retryCount = 0;
const maxRetries = 5;
let retryTimeout;

socket.on("connect", () => {
    updateConnectionStatus("Connected to the server.", "success");
    retryCount = 0;
    getNotificationNumber();
});

socket.on("connect_error", error => {
    retryCount++;
    updateConnectionStatus(`Please wait while the connection is reestablishing... (${retryCount})`, "error");
    if (retryCount >= maxRetries) {
        showTroubleshootingTips();
    } else {
        retryTimeout = setTimeout(() => {
            socket.connect();
        }, 5000);
    }
});

socket.on("disconnect", () => {
    updateConnectionStatus("You have been disconnected from the server. Trying to reconnect...", "error");
    if (retryCount < maxRetries) {
        retryTimeout = setTimeout(() => {
            socket.connect();
        }, 5000);
    } else {
        showTroubleshootingTips();
    }
});

function updateConnectionStatus(message, level) {
    const errorContainer = document.getElementById("error");
    if (!errorContainer) {
        return;
    }

    errorContainer.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = `dashboard-error ${level}`;
    paragraph.textContent = message;
    errorContainer.appendChild(paragraph);
}

function showTroubleshootingTips() {
    const errorContainer = document.getElementById("connection-error");
    if (!errorContainer) {
        return;
    }

    errorContainer.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = "dashboard-error error";
    paragraph.innerHTML = `
    <p>We are unable to connect to the server. Please try the following troubleshooting steps:</p>
    <ul>
      <li>Check your internet connection and ensure it is stable.</li>
      <li>Try refreshing the page.</li>
      <li>If the problem persists, please contact support.</li>
    </ul>
  `;
    errorContainer.appendChild(paragraph);
}

socket.on("notification", unreadCount => {
    updateNotificationCount(unreadCount);
    showNotificationAnimation();
    getNotificationNumber();
});

function updateNotificationCount(count) {
    const badge = document.getElementById("notification-count");
    if (!badge) {
        return;
    }

    badge.textContent = count;
    badge.style.display = count > 0 ? "inline" : "none";
}

function showNotificationAnimation() {
    const notificationButton = document.getElementById("notification");
    if (!notificationButton) {
        return;
    }

    notificationButton.classList.add("notification-animation");
    setTimeout(() => {
        notificationButton.classList.remove("notification-animation");
    }, 1000);
}

function resetNotificationCount() {
    const badge = document.getElementById("notification-count");
    if (!badge) {
        return;
    }

    badge.textContent = "";
    badge.style.display = "none";
}

function getNotificationNumber() {
    fetch("/api/notifications/newNotifications", {
        method: "GET",
        credentials: "include"
    }).then(response => {
        if (!response.ok) {
            if (response.status === 500) {
                return { unreadNotifications: 0 };
            }
            if (response.status === 401) {
                handleAuthExpired();
                return { unreadNotifications: 0 };
            }
            throw new Error("Failed to fetch Notifications");
        }
        return response.json();
    }).then(data => {
        updateNotificationCount(data.unreadNotifications);
    }).catch(() => {
        updateConnectionStatus("Unable to fetch notification count.", "error");
    });
}
