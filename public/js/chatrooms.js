const socket = io({ path: '/socket.io' });
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
let currentUserId = null;
let currentUsername = null;
let isRoomOwner = false;
let oldestMessageCursor = null;
let hasMoreMessages = false;
let isLoadingOlderMessages = false;
let messagesInitialized = false;

let retryTimeout;
let retryCount = 0;
const maxRetries = 5;

// Check if user is authenticated before loading room content
async function checkAuthentication() {
    try {
        console.log("Checking authentication status...");
        
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log("Authentication failed, redirecting to login");
            handleAuthExpired();
            return false;
        }
        
        const data = await response.json();
        currentUserId = data.user.id;
        currentUsername = data.user.username;
        return true;
    } catch (error) {
        console.error("Error checking authentication:", error);
        handleAuthExpired();
        return false;
    }
}

// Check room access permissions before loading content
// This function runs when the room page loads and redirects unauthorized users
// to the dashboard with appropriate error messages
async function checkRoomAccess() {
    if (!roomId) {
        console.log("No room ID provided, redirecting to dashboard");
        window.location.href = "/dashboard?message=noRoomId";
        return false;
    }

    try {
        console.log("Checking room access for room:", roomId);
        
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
                console.log("Room not found, redirecting to dashboard");
                window.location.href = "/dashboard?message=roomNotFound";
                return false;
            } else if (response.status === 403) {
                const redirectMessage = errorData.message === "You are banned from this room" ? "userBanned" : "accessDenied";
                window.location.href = `/dashboard?message=${redirectMessage}`;
                return false;
            } else {
                console.log("Unauthorized access, redirecting to login");
                handleAuthExpired();
                return false;
            }
        }

        const data = await response.json();
        if (!data.room) {
            console.log("Room data not found, redirecting to dashboard");
            window.location.href = "/dashboard?message=roomNotFound";
            return false;
        }

        console.log("Room access granted, loading room content");
        return true;
    } catch (error) {
        console.error("Error checking room access:", error);
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

function fetchRoomDetails() {
    console.log("Fetching room details for room:", roomId);
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
            console.log("Room details response:", data);
            
            if (data.room) {
                document.getElementById("roomTitle").textContent = `Room - ${data.room.name}`;
                document.getElementById("roomName").textContent = `Room - ${data.room.name}`;
                document.getElementById("roomOwner").textContent = `Owner - ${data.room.roomOwner.username}`;
                isRoomOwner = data.room.roomOwner._id === currentUserId;
                const isOwner = isRoomOwner;
                document.getElementById("deleteRoom").style.display = isOwner ? "" : "none";
                document.getElementById("banUser").style.display = isOwner ? "" : "none";
                document.getElementById("renameRoom").style.display = isOwner ? "" : "none";
                document.getElementById("transferOwnership").style.display = isOwner ? "" : "none";
                
                const userList = document.getElementById("userList");
                userList.innerHTML = "";
                
                data.room.users.forEach(user => {
                    const listItem = document.createElement("li");
                    listItem.textContent = user.username;
                    userList.appendChild(listItem);
                });
            } else {
                console.error("Error fetching room details:", data.message);
            }
        } catch (error) {
            console.error("Error fetching room details:", error);
        }
    }, "Loading room...");
}

function displayMessages() {
    console.log("Fetching messages for room:", roomId);
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

        console.log("Messages response status:", response.status);

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
                    const messagesContainer = document.getElementById("messages");
                    if (messagesContainer) {
                        messagesContainer.innerHTML = "";
                        const emptyMessage = document.createElement("li");
                        emptyMessage.textContent = "It's empty. Type something here...";
                        messagesContainer.appendChild(emptyMessage);
                    }
                }
                return;
            }
            throw new Error("Failed to fetch messages");
        }

        const data = await response.json();
        console.log("Messages data:", data);

        const tuples = Array.isArray(data.messageTuples) ? data.messageTuples : [];
        hasMoreMessages = Boolean(data.hasMore);
        oldestMessageCursor = data.oldestCursor || oldestMessageCursor;

        if (mode === "replace") {
            const messagesContainer = document.getElementById("messages");
            if (messagesContainer) {
                messagesContainer.innerHTML = "";
                if (!tuples.length) {
                    const emptyMessage = document.createElement("li");
                    emptyMessage.textContent = "It's empty. Type something here...";
                    messagesContainer.appendChild(emptyMessage);
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
    console.error("Connection error:", error);
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
            console.log("Attempting to reconnect...");
            socket.connect();
        }, 5000);
    }
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    
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
            console.log("Attempting to reconnect...");
            socket.connect();
        }, 5000);
    } else {
        showTroubleshootingTips();
    }
});

function showTroubleshootingTips() {
    console.log("Showing troubleshooting tips");
    
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
    console.log("Message received:", messageData);
    
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) {
        return;
    }

    if (messagesContainer.textContent === "It's empty. Type something here...") {
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
    console.log("Updating user list:", users);
    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    
    users.forEach(user => {
        const listItem = document.createElement("li");
        listItem.textContent = user.username;
        userList.appendChild(listItem);
    });
}), socket.on("error", (errorMessage) => {
    console.error("Socket error received:", errorMessage);
    showToast(errorMessage, "error");
    
    if (errorMessage.includes("banned")) {
        console.log("User banned, redirecting to dashboard");
        window.location.href = "/dashboard?message=userBanned";
    } else if (errorMessage.includes("Access denied") || errorMessage.includes("not a member")) {
        window.location.href = "/dashboard?message=accessDenied";
    }
}), socket.on("userBanned", (message) => {
    console.log("User banned message received:", message);
    showToast(message, "error");
    window.location.href = "/dashboard?message=userBanned";
});
socket.on("roomOwnershipTransferred", (payload) => {
    const message = typeof payload === "string" ? payload : payload?.message;
    console.log("Room ownership transferred:", payload);
    if (message) {
        showToast(message, "info");
    }
    fetchRoomDetails();
});
socket.on("roomRenamed", (payload) => {
    const message = typeof payload === "string" ? payload : payload?.message;
    console.log("Room renamed:", payload);
    if (message) {
        showToast(message, "info");
    }
    fetchRoomDetails();
});
socket.on("reloadingPage", (users) => {
    console.log("Reloading page with users:", users);
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

        if (messagesContainer && messagesContainer.textContent === "It's empty. Type something here...") {
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
    console.log("User typing, emitting typing event");
    socket.emit("typing", roomId);
});

socket.on("typing", () => {
    console.log("Typing indicator received");
    const typingIndicator = document.getElementById("typingIndicator");
    typingIndicator.textContent = "Someone is typing...";
    
    setTimeout(() => {
        typingIndicator.textContent = "";
    }, 6000);
});
async function deleteRoom() {
    if (!roomId) {
        console.error("Missing room ID");
        return;
    }
    
    await withGlobalLoading(async () => {
        try {
            console.log("Attempting to delete room:", roomId);
            
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            
            const data = await response.json();
            console.log("Delete room response:", data);
            
            if (data.message === "Room and associated messages deleted successfully") {
                showToast("Room deleted successfully", "success");
                window.location.href = "/dashboard";
            } else {
                displayError(data.message);
            }
        } catch (error) {
            console.error("Error deleting room:", error);
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
    
    console.log("Attempting to ban user:", username, "from room:", roomId);
    
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
                console.log("Ban user response:", { status: response.status, body: data });
                
                if (response.status === 200) {
                    showToast(data.message, "success");
                    displayMessages();
                    socket.emit("joinRoom", { roomId });
                } else {
                    displayError(data.message);
                }
            } catch (error) {
                console.error("Error banning user:", error);
                displayError("Internal server error");
            }
        }, "Updating room members...");
    } else {
        console.error("User not found in the list");
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
            console.error("Error transferring ownership:", error);
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
            console.error("Error leaving room:", error);
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
            console.error("Error renaming room:", error);
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
            console.error("Error loading older messages:", error);
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
        console.log("Room deletion confirmed");
        deleteRoom();
    } else {
        console.log("Room deletion cancelled");
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
        console.log("Banning user:", username);
        banUser(username);
    }
};

document.getElementById("transferOwnership").onclick = async function() {
    await transferOwnership();
};

document.getElementById("leaveRoom").onclick = async function() {
    await leaveRoom();
};
