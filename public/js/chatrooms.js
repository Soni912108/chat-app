const socket = io({ path: '/socket.io' });
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");

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
            window.location.href = '/login?message=loggedOut';
            return false;
        }
        
        console.log("Authentication successful, loading room");
        return true;
    } catch (error) {
        console.error("Error checking authentication:", error);
        window.location.href = '/login?message=loggedOut';
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
            if (response.status === 404) {
                console.log("Room not found, redirecting to dashboard");
                window.location.href = "/dashboard?message=roomNotFound";
                return false;
            } else if (response.status === 403) {
                console.log("Access denied to room, redirecting to dashboard");
                window.location.href = "/dashboard?message=accessDenied";
                return false;
            } else {
                console.log("Unauthorized access, redirecting to login");
                window.location.href = "/login?message=loggedOut";
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

function fetchRoomDetails() {
    console.log("Fetching room details for room:", roomId);
    
    fetch(`/api/rooms/${roomId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        console.log("Room details response:", data);
        
        if (data.room) {
            document.getElementById("roomTitle").textContent = `Room - ${data.room.name}`;
            document.getElementById("roomName").textContent = `Room - ${data.room.name}`;
            document.getElementById("roomOwner").textContent = `Owner - ${data.room.roomOwner.username}`;
            
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
    })
    .catch(error => {
        console.error("Error fetching room details:", error);
    });
}

function displayMessages() {
    console.log("Fetching messages for room:", roomId);
    
    fetch(`/api/messages/${roomId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    })
    .then(response => {
        console.log("Messages response status:", response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                return { messageTuples: [] };
            }
            throw new Error("Failed to fetch messages");
        }
        return response.json();
    })
    .then(data => {
        console.log("Messages data:", data);
        
        const messagesContainer = document.getElementById("messages");
        messagesContainer.innerHTML = "";
        
        if (data.messageTuples && data.messageTuples.length > 0) {
            data.messageTuples.forEach(message => {
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
                messagesContainer.appendChild(messageElement);
            });
            
            scrollToBottom();
        } else {
            const emptyMessage = document.createElement("li");
            emptyMessage.textContent = "It's empty. Type something here...";
            messagesContainer.appendChild(emptyMessage);
        }
    })
    .catch(error => {
        console.error("Error fetching messages:", error);
    });
}
socket.on("connect", async () => {
    console.log("Connected to server");
    console.log("Socket ID:", socket.id);
    console.log("User ID from sessionStorage:", sessionStorage.getItem("userID"));
    
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
    displayMessages();
    socket.emit("joinRoom", { roomId });
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
    const messageElement = document.createElement("li");
    messageElement.className = "message";
    
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.textContent = messageData.user.charAt(0).toUpperCase();
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    const usernameSpan = document.createElement("span");
    usernameSpan.className = "username";
    usernameSpan.textContent = messageData.user;
    
    const messageParagraph = document.createElement("p");
    messageParagraph.textContent = messageData.content;
    
    contentDiv.appendChild(usernameSpan);
    contentDiv.appendChild(messageParagraph);
    messageElement.appendChild(avatarDiv);
    messageElement.appendChild(contentDiv);
    messagesContainer.appendChild(messageElement);
    
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
    alert(errorMessage);
    
    if (errorMessage.includes("banned")) {
        console.log("User banned, redirecting to dashboard");
        window.location.href = "/dashboard";
    }
}), socket.on("userBanned", (message) => {
    console.log("User banned message received:", message);
    alert(message);
    window.location.href = "/dashboard";
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
        const userId = sessionStorage.getItem("userID");
        const messagesContainer = document.getElementById("messages");
        
        console.log("Sending message with user ID:", userId);
        console.log("Message content:", messageText);
        console.log("Room ID:", roomId);
        
        if (messagesContainer && messagesContainer.textContent === "It's empty. Type something here...") {
            messagesContainer.textContent = "";
        }
        
        socket.emit("message", {
            content: messageText,
            userId: userId,
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
    
    try {
        console.log("Attempting to delete room:", roomId);
        
        const response = await fetch(`/api/rooms/${roomId}`, {
            method: "DELETE",
            credentials: "include"
        });
        
        const data = await response.json();
        console.log("Delete room response:", data);
        
        if (data.message === "Room and associated messages deleted successfully") {
            alert("Room deleted successfully!");
            window.location.href = "/dashboard";
        } else {
            displayError(data.message);
        }
    } catch (error) {
        console.error("Error deleting room:", error);
        displayError("Error deleting room");
    }
}

function displayError(errorMessage) {
    console.log("Displaying error:", errorMessage);
    
    const errorElement = document.getElementById("error");
    errorElement.textContent = errorMessage;
    errorElement.style.display = "block";
    
    setTimeout(() => {
        errorElement.style.display = "none";
    }, 5000);
}

function banUser(username) {
    if (!username || !roomId) {
        displayError("Missing username or room ID");
        return;
    }
    
    console.log("Attempting to ban user:", username, "from room:", roomId);
    
    const userList = document.getElementById("userList");
    const userElement = Array.from(userList.getElementsByTagName("li"))
        .find(li => li.textContent.trim() === username);
    
    if (userElement) {
        fetch(`/api/rooms/${roomId}/${username}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        .then(response => response.json().then(data => ({
            status: response.status,
            body: data
        })))
        .then(({ status, body }) => {
            console.log("Ban user response:", { status, body });
            
            if (status === 200) {
                alert(body.message);
                displayMessages();
                socket.emit("joinRoom", { roomId });
            } else if (status === 403) {
                displayError(body.message);
            } else if (status === 404) {
                displayError(body.message);
            } else {
                displayError(body.message);
            }
        })
        .catch(error => {
            console.error("Error banning user:", error);
            displayError("Internal server error");
        });
    } else {
        console.error("User not found in the list");
        displayError("User not found in the list");
    }
}
document.getElementById("deleteRoom").onclick = function() {
    const confirmation = prompt("Type 'Delete this room' if you want to delete this room:");
    if (confirmation === "Delete this room") {
        console.log("Room deletion confirmed");
        deleteRoom();
    } else {
        console.log("Room deletion cancelled");
        displayError("Room not deleted.");
    }
};

document.getElementById("banUser").onclick = function() {
    const username = prompt("Enter the username to ban:");
    if (username) {
        console.log("Banning user:", username);
        banUser(username);
    }
};