const socket = window.createAppSocket();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
let currentUserId = null;
let currentUsername = null;
let isRoomOwner = false;
let oldestMessageCursor = null;
let hasMoreMessages = false;
let isLoadingOlderMessages = false;
let messagesInitialized = false;
const roomBackgroundThemes = new Set(["neutral", "dusk", "forest", "ocean", "slate", "sunset"]);

let retryTimeout;
let retryCount = 0;
const maxRetries = 5;

// Check if user is authenticated before loading room content
async function checkAuthentication() {
    try {

        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {

            handleAuthExpired();
            return false;
        }
        
        const data = await response.json();
        currentUserId = data.user.id;
        currentUsername = data.user.username;
        return true;
    } catch (error) {

        handleAuthExpired();
        return false;
    }
}

// Check room access permissions before loading content
// This function runs when the room page loads and redirects unauthorized users
// to the dashboard with appropriate error messages
async function checkRoomAccess() {
    if (!roomId) {

        window.location.href = "/dashboard?message=noRoomId";
        return false;
    }

    try {

        const response = await fetch(`/api/rooms/${roomId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 404) {

                window.location.href = "/dashboard?message=roomNotFound";
                return false;
            } else if (response.status === 403) {
                const redirectMessage = errorData.message === "You are banned from this room" ? "userBanned" : "accessDenied";
                window.location.href = `/dashboard?message=${redirectMessage}`;
                return false;
            } else {

                handleAuthExpired();
                return false;
            }
        }

        const data = await response.json();
        if (!data.room) {

            window.location.href = "/dashboard?message=roomNotFound";
            return false;
        }


        return true;
    } catch (error) {

        window.location.href = "/dashboard?message=error";
        return false;
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById("messages-container");
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function getMessagesContainer() {
    return document.getElementById("messages");
}

function createMessageElement(message) {
    const messageElement = document.createElement("li");
    messageElement.className = "message";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.textContent = message.username.charAt(0).toUpperCase();

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const usernameSpan = document.createElement("span");
    usernameSpan.className = "username";
    usernameSpan.textContent = message.username;

    const messageParagraph = document.createElement("p");
    messageParagraph.textContent = message.content;

    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    const timestamp = new Date(message.timestamp).toLocaleString();
    timestampSpan.textContent = timestamp;

    contentDiv.appendChild(usernameSpan);
    contentDiv.appendChild(messageParagraph);
    contentDiv.appendChild(timestampSpan);
    messageElement.appendChild(avatarDiv);
    messageElement.appendChild(contentDiv);

    return messageElement;
}

function renderMessages(messages, { replace = false, prepend = false } = {}) {
    const messagesContainer = getMessagesContainer();
    if (!messagesContainer) {
        return;
    }

    if (replace) {
        messagesContainer.innerHTML = "";
    }

    const fragment = document.createDocumentFragment();
    messages.forEach(message => {
        fragment.appendChild(createMessageElement(message));
    });

    if (prepend) {
        messagesContainer.prepend(fragment);
    } else {
        messagesContainer.appendChild(fragment);
    }
}

function getMessagesEmptyStateElement() {
    const empty = document.createElement("li");
    empty.className = "messages-empty-state";

    const title = document.createElement("strong");
    title.textContent = "No messages yet";

    const text = document.createElement("p");
    text.textContent = "Start the conversation by sending the first message.";

    empty.appendChild(title);
    empty.appendChild(text);
    return empty;
}

function setMessagesEmptyState() {
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) {
        return;
    }

    messagesContainer.innerHTML = "";
    messagesContainer.appendChild(getMessagesEmptyStateElement());
}

function applyRoomBackgroundTheme(theme) {
    const validTheme = roomBackgroundThemes.has(theme) ? theme : "neutral";
    const messagesContainer = document.getElementById("messages-container");
    const roomPanel = document.getElementById("chat-room");

    if (messagesContainer) {
        messagesContainer.dataset.roomTheme = validTheme;
    }

    if (roomPanel) {
        roomPanel.dataset.roomTheme = validTheme;
    }
}

function fetchRoomDetails() {

    withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            const data = await response.json();

            if (data.room) {
                document.getElementById("roomTitle").textContent = `Room - ${data.room.name}`;
                document.getElementById("roomName").textContent = `Room - ${data.room.name}`;
                document.getElementById("roomOwner").textContent = `Owner - ${data.room.roomOwner.username}`;
                isRoomOwner = data.room.roomOwner._id === currentUserId;
                applyRoomBackgroundTheme(data.room.backgroundTheme || "neutral");
                const isOwner = isRoomOwner;
                document.getElementById("deleteRoom").style.display = isOwner ? "" : "none";
                document.getElementById("banUser").style.display = isOwner ? "" : "none";
                document.getElementById("renameRoom").style.display = isOwner ? "" : "none";
                document.getElementById("transferOwnership").style.display = isOwner ? "" : "none";
                const backgroundSelect = document.getElementById("roomBackgroundTheme");
                const backgroundSave = document.getElementById("saveRoomBackground");
                const backgroundLabel = document.querySelector('label[for="roomBackgroundTheme"]');
                if (backgroundSelect && backgroundSave) {
                    backgroundSelect.value = data.room.backgroundTheme || "neutral";
                    backgroundSelect.disabled = !isOwner;
                    backgroundSave.style.display = isOwner ? "" : "none";
                    backgroundSelect.style.display = isOwner ? "" : "none";
                    if (backgroundLabel) {
                        backgroundLabel.style.display = isOwner ? "" : "none";
                    }
                }
                
                const userList = document.getElementById("userList");
                userList.innerHTML = "";
                
                data.room.users.forEach(user => {
                    const listItem = document.createElement("li");
                    listItem.textContent = user.username;
                    userList.appendChild(listItem);
                });
            } else {

            }
        } catch (error) {

        }
    }, "Loading room...");
}

function displayMessages() {

    const messagesContainer = document.getElementById("messages");
    if (messagesContainer) {
        messagesContainer.innerHTML = "";
    }

    oldestMessageCursor = null;
    hasMoreMessages = false;

    fetchMessages();
}

async function fetchMessages(before = null, mode = "replace") {
    const params = new URLSearchParams({
        limit: "20"
    });
    if (before) {
        params.set("before", before);
    }

    await withGlobalLoading(async () => {
        const response = await fetch(`/api/messages/${roomId}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });


        if (!response.ok) {
            if (response.status === 403) {
                window.location.href = "/dashboard?message=accessDenied";
                return;
            }
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            if (response.status === 404) {
                if (mode === "replace") {
                    setMessagesEmptyState();
                }
                return;
            }
            throw new Error("Failed to fetch messages");
        }

        const data = await response.json();

        const tuples = Array.isArray(data.messageTuples) ? data.messageTuples : [];
        hasMoreMessages = Boolean(data.hasMore);
        oldestMessageCursor = data.oldestCursor || oldestMessageCursor;

        if (mode === "replace") {
            const messagesContainer = document.getElementById("messages");
            if (messagesContainer) {
                messagesContainer.innerHTML = "";
                if (!tuples.length) {
                    setMessagesEmptyState();
                    messagesInitialized = true;
                    return;
                }
            }
            renderMessages(tuples, { replace: true });
            messagesInitialized = true;
            scrollToBottom();
            return;
        }

        if (mode === "prepend" && tuples.length) {
            const messagesContainer = document.getElementById("messages");
            const scrollContainer = document.getElementById("messages-container");
            if (!messagesContainer || !scrollContainer) {
                return;
            }

            const previousHeight = scrollContainer.scrollHeight;
            const previousTop = scrollContainer.scrollTop;
            renderMessages(tuples, { prepend: true });
            const nextHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = nextHeight - previousHeight + previousTop;
        }
    }, mode === "replace" ? "Loading messages..." : "Loading older messages...");
}
socket.on("connect", async () => {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return; // Redirect will happen in checkAuthentication
    }
    
    // Check room access before loading content
    const hasAccess = await checkRoomAccess();
    if (!hasAccess) {
        return; // Redirect will happen in checkRoomAccess
    }
    
    const messagesContainer = document.getElementById("messages");
    let connectionStatus = document.getElementById("connection-status");
    
    if (!connectionStatus) {
        connectionStatus = document.createElement("li");
        connectionStatus.id = "connection-status";
        connectionStatus.className = "message connected";
        messagesContainer.appendChild(connectionStatus);
    }
    
    connectionStatus.className = "message connected";
    connectionStatus.textContent = "Connected to server";
    retryCount = 0;
    clearTimeout(retryTimeout);
    
    fetchRoomDetails();
    await fetchMessages(null, "replace");
    socket.emit("joinRoom", { roomId });
    setupMessageScrollLoader();
}), socket.on("connect_error", (error) => {

    retryCount++;
    
    const messagesContainer = document.getElementById("messages");
    let connectionStatus = document.getElementById("connection-status");
    
    if (!connectionStatus) {
        connectionStatus = document.createElement("li");
        connectionStatus.id = "connection-status";
        connectionStatus.className = "message error";
        messagesContainer.appendChild(connectionStatus);
    }
    
    connectionStatus.className = "message error";
    connectionStatus.textContent = `Please wait while the connection is reestablishing...(${retryCount})`;
    scrollToBottom();
    
    if (retryCount >= maxRetries) {
        showTroubleshootingTips();
    } else {
        retryTimeout = setTimeout(() => {

            socket.connect();
        }, 5000);
    }
});

socket.on("disconnect", () => {

    const messagesContainer = document.getElementById("messages");
    let connectionStatus = document.getElementById("connection-status");
    
    if (!connectionStatus) {
        connectionStatus = document.createElement("li");
        connectionStatus.id = "connection-status";
        connectionStatus.className = "message error";
        messagesContainer.appendChild(connectionStatus);
    }
    
    connectionStatus.className = "message error";
    connectionStatus.textContent = "You have been disconnected from the server. Trying to reconnect...";
    scrollToBottom();
    
    if (retryCount < maxRetries) {
        retryTimeout = setTimeout(() => {

            socket.connect();
        }, 5000);
    } else {
        showTroubleshootingTips();
    }
});

function showTroubleshootingTips() {

    const messagesContainer = document.getElementById("messages");
    let connectionStatus = document.getElementById("connection-status");
    
    if (!connectionStatus) {
        connectionStatus = document.createElement("li");
        connectionStatus.id = "connection-status";
        connectionStatus.className = "message error";
        messagesContainer.appendChild(connectionStatus);
    }
    
    connectionStatus.className = "message error";
    connectionStatus.innerHTML = `
        <p>We are unable to connect to the server. Please try the following troubleshooting steps:</p>
        <ul>
            <li>Check your internet connection and ensure it is stable.</li>
            <li>Try refreshing the page.</li>
            <li>If the problem persists, please contact support.</li>
        </ul>
    `;
    
    scrollToBottom();
}
socket.on("message", (messageData) => {

    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) {
        return;
    }

    if (messagesContainer.querySelector(".messages-empty-state")) {
        messagesContainer.innerHTML = "";
    }

    const message = {
        username: messageData.user,
        content: messageData.content,
        timestamp: messageData.timestamp || new Date().toISOString()
    };
    renderMessages([message], { prepend: false });
    scrollToBottom();
});
socket.on("updateUserList", (users) => {

    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    
    users.forEach(user => {
        const listItem = document.createElement("li");
        listItem.textContent = user.username;
        userList.appendChild(listItem);
    });
}), socket.on("error", (errorMessage) => {

    showToast(errorMessage, "error");
    
    if (errorMessage.includes("banned")) {

        window.location.href = "/dashboard?message=userBanned";
    } else if (errorMessage.includes("Access denied") || errorMessage.includes("not a member")) {
        window.location.href = "/dashboard?message=accessDenied";
    }
}), socket.on("userBanned", (message) => {

    showToast(message, "error");
    window.location.href = "/dashboard?message=userBanned";
});
socket.on("roomOwnershipTransferred", (payload) => {
    const message = typeof payload === "string" ? payload : payload?.message;

    if (message) {
        showToast(message, "info");
    }
    fetchRoomDetails();
});
socket.on("roomRenamed", (payload) => {
    const message = typeof payload === "string" ? payload : payload?.message;

    if (message) {
        showToast(message, "info");
    }
    fetchRoomDetails();
});
socket.on("roomBackgroundUpdated", (payload) => {
    const theme = typeof payload === "object" && payload ? payload.room?.backgroundTheme : null;
    if (typeof theme === "string") {
        applyRoomBackgroundTheme(theme);
        const backgroundSelect = document.getElementById("roomBackgroundTheme");
        if (backgroundSelect) {
            backgroundSelect.value = theme;
        }
    }
});
socket.on("reloadingPage", (users) => {

    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    
    users.forEach(user => {
        const listItem = document.createElement("li");
        listItem.textContent = user.username;
        userList.appendChild(listItem);
    });
});

function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        const messagesContainer = document.getElementById("messages");

        if (messagesContainer && messagesContainer.querySelector(".messages-empty-state")) {
            messagesContainer.textContent = "";
        }
        
        socket.emit("message", {
            content: messageText,
            roomId: roomId
        });
        
        messageInput.value = "";
    }
}
document.getElementById("messageInput").addEventListener("input", () => {

    socket.emit("typing", roomId);
});

socket.on("typing", () => {

    const typingIndicator = document.getElementById("typingIndicator");
    typingIndicator.textContent = "Someone is typing...";
    
    setTimeout(() => {
        typingIndicator.textContent = "";
    }, 6000);
});
async function deleteRoom() {
    if (!roomId) {

        return;
    }
    
    await withGlobalLoading(async () => {
        try {

            const response = await fetch(`/api/rooms/${roomId}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            
            const data = await response.json();

            if (data.message === "Room and associated messages deleted successfully") {
                showToast("Room deleted successfully", "success");
                window.location.href = "/dashboard";
            } else {
                displayError(data.message);
            }
        } catch (error) {

            displayError("Error deleting room");
        }
    }, "Deleting room...");
}

function displayError(errorMessage) {
    showToast(errorMessage, "error");
}

function banUser(username) {
    if (!username || !roomId) {
        displayError("Missing username or room ID");
        return;
    }

    if (currentUsername && username.trim() === currentUsername.trim()) {
        displayError("Room owners cannot ban themselves. Delete the room or transfer ownership instead.");
        return;
    }
    

    const userList = document.getElementById("userList");
    const userElement = Array.from(userList.getElementsByTagName("li"))
        .find(li => li.textContent.trim() === username);
    
    if (userElement) {
        withGlobalLoading(async () => {
            try {
                const response = await fetch(`/api/rooms/${roomId}/${username}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include"
                });
                const data = await response.json();
                if (response.status === 401) {
                    handleAuthExpired();
                    return;
                }

                if (response.status === 200) {
                    showToast(data.message, "success");
                    displayMessages();
                    socket.emit("joinRoom", { roomId });
                } else {
                    displayError(data.message);
                }
            } catch (error) {

                displayError("Internal server error");
            }
        }, "Updating room members...");
    } else {

        displayError("User not found in the list");
    }
}

async function transferOwnership(targetUsername) {
    if (!roomId) {
        displayError("Missing room ID");
        return;
    }

    const username = targetUsername || await promptDialog({
        title: "Transfer ownership",
        message: "Enter the exact username of a current room member.",
        placeholder: "Username",
        confirmText: "Transfer",
        danger: true
    });

    if (!username) {
        return;
    }

    if (currentUsername && username.trim() === currentUsername.trim()) {
        displayError("You are already the owner of this room.");
        return;
    }

    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ targetUsername: username.trim() })
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, "success");
                await fetchRoomDetails();
            } else {
                displayError(data.message);
            }
        } catch (error) {

            displayError("Internal server error");
        }
    }, "Transferring ownership...");
}

async function leaveRoom() {
    if (!roomId) {
        displayError("Missing room ID");
        return;
    }

    if (isRoomOwner) {
        displayError("Room owners cannot leave their own room. Delete the room or transfer ownership instead.");
        return;
    }

    const confirmation = await confirmDialog({
        title: "Leave room",
        message: "Are you sure you want to leave this room?",
        confirmText: "Leave",
        danger: true
    });

    if (!confirmation) {
        return;
    }

    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/leave`, {
                method: "POST",
                credentials: "include"
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, "success");
                window.location.href = "/dashboard?message=leftRoom";
            } else {
                displayError(data.message);
            }
        } catch (error) {

            displayError("Internal server error");
        }
    }, "Leaving room...");
}

async function renameRoom() {
    if (!roomId) {
        displayError("Missing room ID");
        return;
    }

    const newName = await promptDialog({
        title: "Rename room",
        message: "Enter the new room name.",
        placeholder: "New room name",
        confirmText: "Rename",
        danger: false
    });

    if (!newName) {
        return;
    }

    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/rename`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ name: newName })
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, "success");
                await fetchRoomDetails();
            } else {
                displayError(data.message);
            }
        } catch (error) {

            displayError("Internal server error");
        }
    }, "Renaming room...");
}

function setupMessageScrollLoader() {
    const messagesContainer = document.getElementById("messages-container");
    if (!messagesContainer || messagesContainer.dataset.scrollLoaderBound === "true") {
        return;
    }

    messagesContainer.dataset.scrollLoaderBound = "true";
    messagesContainer.addEventListener("scroll", async () => {
        if (isLoadingOlderMessages || !hasMoreMessages || !oldestMessageCursor) {
            return;
        }

        if (messagesContainer.scrollTop > 80) {
            return;
        }

        isLoadingOlderMessages = true;
        try {
            await fetchMessages(oldestMessageCursor, "prepend");
        } catch (error) {

        } finally {
            isLoadingOlderMessages = false;
        }
    });
}
document.getElementById("deleteRoom").onclick = async function() {
    const confirmation = await promptDialog({
        title: "Delete room",
        messageHtml: 'Type <strong>Delete this room</strong> to confirm. This removes the room and its messages.',
        placeholder: "Delete this room",
        confirmText: "Delete",
        danger: true
    });
    if (confirmation === "Delete this room") {

        deleteRoom();
    } else {

        displayError("Room not deleted.");
    }
};

document.getElementById("banUser").onclick = async function() {
    const username = await promptDialog({
        title: "Ban user",
        message: "Enter the exact username to remove and ban from this room.",
        placeholder: "Username",
        confirmText: "Ban user",
        danger: true
    });
    if (username) {

        banUser(username);
    }
};

document.getElementById("transferOwnership").onclick = async function() {
    await transferOwnership();
};

document.getElementById("leaveRoom").onclick = async function() {
    await leaveRoom();
};

document.getElementById("saveRoomBackground").onclick = async function() {
    const backgroundSelect = document.getElementById("roomBackgroundTheme");
    if (!backgroundSelect || !roomId) {
        return;
    }

    const theme = backgroundSelect.value;
    if (!roomBackgroundThemes.has(theme)) {
        displayError("Invalid room background");
        return;
    }

    await withGlobalLoading(async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/background`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ theme })
            });

            if (response.status === 401) {
                handleAuthExpired();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                applyRoomBackgroundTheme(data.room?.backgroundTheme || theme);
                showToast(data.message || "Room background updated", "success");
            } else {
                displayError(data.message || "Failed to update room background");
            }
        } catch (error) {
            displayError("Internal server error");
        }
    }, "Updating background...");
};
