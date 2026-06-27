
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
            handleAuthExpired();
            return false;
        }
        
        console.log("Authentication successful, loading dashboard");
        return true;
    } catch (error) {
        console.error("Error checking authentication:", error);
        handleAuthExpired();
        return false;
    }
}

// Initialize socket connection for real-time notifications
let socket;
let roomsPage = 1;
const roomsPageSize = 10;
let roomsSearchTerm = "";
let roomsTotalPages = 1;
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
    spinnerEl.style.display = "block";
    const pageInfo = document.getElementById("roomsPageInfo");
    const prevButton = document.getElementById("roomsPrevPage");
    const nextButton = document.getElementById("roomsNextPage");
    const searchQuery = roomsSearchTerm.trim();

    const params = new URLSearchParams({
        page: String(roomsPage),
        limit: String(roomsPageSize)
    });
    if (searchQuery) {
        params.set("search", searchQuery);
    }

    fetch(`/api/rooms?${params.toString()}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include" // Send cookies for authentication
    })
    .then(async response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthExpired();
                return { rooms: [] };
            }
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
        roomsTotalPages = data.totalPages || 1;

        if (pageInfo) {
            pageInfo.textContent = `Page ${data.page || roomsPage} of ${roomsTotalPages}`;
        }
        if (prevButton) {
            prevButton.disabled = (data.page || roomsPage) <= 1;
        }
        if (nextButton) {
            nextButton.disabled = (data.page || roomsPage) >= roomsTotalPages;
        }

        if (!data.rooms || !data.rooms.length) {
            const li = document.createElement("li");
            li.textContent = searchQuery ? "No matching rooms" : "No rooms available";
            roomsList.appendChild(li);
            return;
        }

        data.rooms.forEach(room => {
            const li = document.createElement("li");
            const roomType = room.isPrivate ? "Private" : "Public";
            const statusText = room.isBanned
                ? "Banned"
                : room.isMember
                    ? "Open"
                    : room.hasPendingRequest
                        ? "Pending"
                        : "Join";

            const details = document.createElement("div");
            details.className = "room-card-details";

            const name = document.createElement("span");
            name.className = "room-card-name";
            name.textContent = room.name;

            const meta = document.createElement("span");
            meta.className = "room-card-meta";
            meta.textContent = roomType;

            const status = document.createElement("span");
            status.className = `room-card-status ${statusText.toLowerCase()}`;
            status.textContent = statusText;

            details.appendChild(name);
            details.appendChild(meta);
            li.appendChild(details);
            li.appendChild(status);

            li.onclick = () => {
                if (!room.isBanned) {
                    joinRoom(room._id);
                }
            };
            roomsList.appendChild(li);
        });
    })
    .catch(error => {
        console.error("Error:", error);
        const roomsList = document.getElementById("rooms");
        roomsList.innerHTML = "";
        spinnerEl.style.display = "none";
        showToast(`Error loading rooms: ${error.message}`, "error");
    });
}

function setRoomsPage(page) {
    roomsPage = page;
    loadRooms();
}

function performRoomSearch() {
    roomsSearchTerm = document.getElementById("roomSearchInput").value;
    roomsPage = 1;
    loadRooms();
}

async function createRoom() {
    const roomName = document.getElementById("newRoomName").value;
    const privacyValue = document.getElementById("privacy").value;

    if (!roomName.trim()) {
        showToast("Room name cannot be empty", "error");
        return;
    }

    const roomData = {
        name: roomName,
        private: privacyValue === "private" // This will evaluate to true/false
    };

    try {
        const response = await fetch("/api/rooms/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(roomData)
        });
        const data = await response.json();
        if (response.status === 401) {
            handleAuthExpired();
            return;
        }
        if (data.room) {
            const shouldJoin = await confirmDialog({
                title: "Room created",
                message: "Do you want to join this room now?",
                confirmText: "Join room",
                cancelText: "Stay on dashboard"
            });
            if (shouldJoin) {
                joinRoom(data.room._id);
            } else {
                window.location.href = "/dashboard";
            }
        } else {
            showToast(data.message || "Error creating room", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Error creating room", "error");
    }
}

document.getElementById("createRoomButton").addEventListener("click", createRoom);
document.getElementById("roomsPrevPage").addEventListener("click", () => {
    if (roomsPage > 1) {
        setRoomsPage(roomsPage - 1);
    }
});
document.getElementById("roomsNextPage").addEventListener("click", () => {
    if (roomsPage < roomsTotalPages) {
        setRoomsPage(roomsPage + 1);
    }
});
document.getElementById("roomSearchButton").addEventListener("click", performRoomSearch);
document.getElementById("roomSearchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        performRoomSearch();
    }
});

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
        if (response.status === 401) {
            handleAuthExpired();
            return null;
        }
        return response.json();
    }).then(data => {
        if (!data) return;
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
            break;
        case "Already a member of the room":
            window.location.href = `/room?roomId=${b}`;
            break;
        default:
            displayError(a.message);
    }
}

function displayError(a) {
    showToast(a, "error");
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
