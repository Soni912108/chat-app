const socket = io({ path: '/socket.io' });

let retryCount = 0;
const maxRetries = 5;
let retryTimeout;
socket.on("connect", () => {
    console.log("Connected to the server"), updateConnectionStatus("Connected to the server.", "success"), retryCount = 0, getNotificationNumber()
}), socket.on("connect_error", a => {
    console.error("Connection error:", a), retryCount++, updateConnectionStatus(`Please wait while the connection is reestablishing... (${retryCount})`, "error"), retryCount >= maxRetries ? showTroubleshootingTips() : retryTimeout = setTimeout(() => {
        socket.connect()
    }, 5e3)
}), socket.on("disconnect", () => {
    console.log("Disconnected from server"), updateConnectionStatus("You have been disconnected from the server. Trying to reconnect...", "error"), retryCount < maxRetries ? retryTimeout = setTimeout(() => {
        socket.connect()
    }, 5e3) : showTroubleshootingTips()
});

function updateConnectionStatus(a, b) {
    const c = document.getElementById("error");
    c.innerHTML = "";
    const d = document.createElement("p");
    d.className = `dashboard-error ${b}`, d.textContent = a, c.appendChild(d)
}

function showTroubleshootingTips() {
    const a = document.getElementById("connection-error");
    a.innerHTML = "";
    const b = document.createElement("p");
    b.className = "dashboard-error error", b.innerHTML = `
    <p>We are unable to connect to the server. Please try the following troubleshooting steps:</p>
    <ul>
      <li>Check your internet connection and ensure it is stable.</li>
      <li>Try refreshing the page.</li>
      <li>If the problem persists, please contact support.</li>
    </ul>
  `, a.appendChild(b)
}
socket.on("notification", (unreadCount) => {
    console.log("New notification received, unread count:", unreadCount);
    updateNotificationCount(unreadCount);
    showNotificationAnimation();
    
    // Also update the notification count by fetching the latest count
    getNotificationNumber();
});

function updateNotificationCount(a) {
    const b = document.getElementById("notification-count");
    b.textContent = a, b.style.display = 0 < a ? "inline" : "none"
}

function showNotificationAnimation() {
    const a = document.getElementById("notification");
    a.classList.add("notification-animation"), setTimeout(() => {
        a.classList.remove("notification-animation")
    }, 1e3)
}

function resetNotificationCount() {
    const a = document.getElementById("notification-count");
    a.textContent = "", a.style.display = "none"
}

function getNotificationNumber() {
    fetch("/api/notifications/newNotifications", {
        method: "GET",
        credentials: "include" // Send cookies for authentication
    }).then(a => {
        if (!a.ok) {
            if (500 === a.status) return {
                unreadNotifications: 0
            };
            if (401 === a.status) {
                handleAuthExpired();
                return { unreadNotifications: 0 };
            }
            throw new Error("Failed to fetch Notifications")
        }
        return a.json()
    }).then(a => {
        updateNotificationCount(a.unreadNotifications)
    }).catch(a => {
        console.error("Error fetching notifications:", a), updateConnectionStatus(a.message, "error")
    })
}
