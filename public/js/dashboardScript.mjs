
// Check if user is authenticated before loading dashboard content
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
        
        console.log("Authentication successful, loading dashboard");
        return true;
    } catch (error) {
        console.error("Error checking authentication:", error);
        window.location.href = '/login?message=loggedOut';
        return false;
    }
}

// Initialize socket connection for real-time notifications
let socket;
function initializeSocket() {
    socket = io({ path: '/socket.io' });
    
    socket.on('connect', () => {
        console.log('Connected to server for dashboard notifications');
    });
    
    socket.on('notification', (unreadCount) => {
        console.log('New notification received on dashboard, unread count:', unreadCount);
        // Update notification count if the element exists
        updateNotificationCount(unreadCount);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Update notification count display
function updateNotificationCount(count) {
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        notificationCount.textContent = count;
        notificationCount.style.display = count > 0 ? 'inline' : 'none';
    }
}

function loadRooms() {
    const spinnerEl = document.getElementById("lds-ellipsis");
    console.log("Loading rooms...");
    console.log("User ID from sessionStorage:", userId);
    spinnerEl.style.display = "block";

    fetch("/api/rooms", {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include" // Send cookies for authentication
    })
    .then(async response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
            const error = await response.json();
            console.error("Error response:", error);
            throw new Error(error.message || 'Failed to fetch rooms');
        }
        return response.json();
    })
    .then(data => {
        console.log("Rooms data:", data);
        const roomsList = document.getElementById("rooms");
        roomsList.innerHTML = "";
        spinnerEl.style.display = "none";

        if (!data.rooms || !data.rooms.length) {
            const li = document.createElement("li");
            li.textContent = "No rooms available";
            roomsList.appendChild(li);
            return;
        }

        data.rooms.forEach(room => {
            const li = document.createElement("li");
            const roomType = room.isPrivate ? "Private" : "Public";
            li.textContent = `${room.name} - ${roomType} - `;
            
            console.log("Room:", room.name);
            console.log("Room banned users:", room.banned);
            console.log("Current user ID:", userId);
            
            // Convert user ID to string for comparison
            const userIdStr = userId.toString();
            const bannedUserIds = room.banned.map(id => id.toString());
            const isBanned = bannedUserIds.includes(userIdStr);
            
            console.log("Is user banned:", isBanned);
            
            if (isBanned) {
                li.innerHTML += "<span style='font-weight: bold; color: red;'>Banned from this Room</span>";
            } else {
                li.innerHTML += "<span style='font-weight: bold; color: green;'>Join this Room</span>";
            }
            
            li.onclick = () => {
                console.log("Joining room:", room._id);
                joinRoom(room._id);
            };
            roomsList.appendChild(li);
            roomsList.appendChild(document.createElement("br"));
        });
    })
    .catch(error => {
        console.error("Error:", error);
        const roomsList = document.getElementById("rooms");
        roomsList.innerHTML = "";
        spinnerEl.style.display = "none";
        
        const li = document.createElement("li");
        li.textContent = `Error loading rooms: ${error.message}`;
        roomsList.appendChild(li);
    });
}

function createRoom() {
    const roomName = document.getElementById("newRoomName").value;
    const privacyValue = document.getElementById("privacy").value;

    if (!roomName.trim()) {
        alert("Room name cannot be empty");
        return;
    }

    const roomData = {
        name: roomName,
        private: privacyValue === "private" // This will evaluate to true/false
    };

    fetch("/api/rooms/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(roomData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.room) {
            if (confirm("Room created successfully. Do you want to join this room?")) {
                joinRoom(data.room._id);
            }
        } else {
            alert("Error creating room: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error creating room");
    });
}

document.getElementById("createRoomButton").addEventListener("click", createRoom);

function joinRoom(roomId) {
    console.log("Attempting to join room:", roomId);
    fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    }).then(response => {
        console.log("Join room response status:", response.status);
        return response.json();
    }).then(data => {
        console.log("Join room response data:", data);
        handleJoinResponse(data, roomId);
    }).catch(error => {
        console.error("Error joining room:", error);
        displayError("Error joining room");
    });
}

function handleJoinResponse(a, b) {
    if (a.message) switch (a.message) {
        case "You are banned from this room":
            displayError("You are banned from this room");
            break;
        case "Request sent to join private room":
        case "Join request already sent to the room owner":
            displayError("Join request sent to room owner");
            break;
        case "Joined room":
            window.location.href = `/room?roomId=${b}`;
            sessionStorage.setItem("isOwner", a.isOwner ? "True" : "False");
            break;
        case "Already a member of the room":
            window.location.href = `/room?roomId=${b}`;
            break;
        default:
            displayError(a.message);
    }
}

function displayError(a) {
    const b = document.getElementById("error");
    b.textContent = a, b.style.display = "block", setTimeout(() => {
        b.style.display = "none"
    }, 5e3)
}

function checkRedirectMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message) {
        let errorMessage = '';
        switch (message) {
            case 'noRoomId':
                errorMessage = 'No room ID specified. Please select a room from the list.';
                break;
            case 'roomNotFound':
                errorMessage = 'Room not found. It may have been deleted or doesn\'t exist.';
                break;
            case 'userBanned':
                errorMessage = 'You are banned from that room. You cannot access it.';
                break;
            case 'accessDenied':
                errorMessage = 'Access denied. This is a private room and you are not a member.';
                break;
            case 'loggedOut':
                errorMessage = 'You have been logged out. Please log in again.';
                break;
            case 'error':
                errorMessage = 'An error occurred while accessing the room. Please try again.';
                break;
            default:
                errorMessage = 'An error occurred. Please try again.';
        }
        
        if (errorMessage) {
            displayError(errorMessage);
            // Clean up the URL by removing the message parameter
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication before loading any content
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    return; // Redirect will happen in checkAuthentication
  }
  
  loadRooms();
  checkRedirectMessages();
  initializeSocket(); // Initialize socket connection
});