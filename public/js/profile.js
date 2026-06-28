// Check if user is authenticated before loading profile content
let currentUserId = null;

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
        return true;
    } catch (error) {

        handleAuthExpired();
        return false;
    }
}

async function fetchProfileInfo() {
    const a = currentUserId;
    if (!a) {
        handleAuthExpired();
        return;
    }
    await withGlobalLoading(async () => {
        try {
            const b = await fetch('/api/auth/me/profile', {
                method: "GET",
                credentials: "include" // Send cookies for authentication
            });
            if (b.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!b.ok) {
                const a = await b.json();
                throw new Error(a.message)
            }
            const c = await b.json();
            displayProfileInfo(c)
        } catch (a) {

            showToast("Error fetching profile info", "error");
        }
    }, "Loading profile...");
}

function displayProfileInfo(a) {
    document.getElementById("profile-username").textContent = a.username, document.getElementById("email").textContent = `Email: ${a.email}`, document.getElementById("joined-date").textContent = `Joined: ${new Date(a.joinedDate).toLocaleString()}`, document.getElementById("last-login").textContent = `Last login: ${new Date(a.lastLogin).toLocaleString()}`;
    const b = document.getElementById("profile-avatar");
    b.src = a.avatar ? a.avatar : "/public/images/profile-circle.svg";
    const c = document.getElementById("rooms-created");
    if (c.innerHTML = "", 0 === a.roomDetails.length) {
        const a = document.createElement("p");
        a.textContent = "No rooms created yet.", c.appendChild(a)
    } else a.roomDetails.forEach(a => {
        const b = document.createElement("li");
        b.classList.add("room-name");
        const d = document.createElement("a");
        d.href = "#", d.textContent = a.name, d.addEventListener("click", b => {
            b.preventDefault(), joinRoom(a._id)
        }), b.appendChild(d), c.appendChild(b)
    });
    document.getElementById("rooms-created-count").textContent = `Rooms Created: ${a.roomsCreatedCount}`, document.getElementById("rooms-joined-count").textContent = `Rooms Joined: ${a.roomsJoinedCount}`;
}

function joinRoom(a) {
    withGlobalLoading(async () => {
        return fetch(`/api/rooms/${a}/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include" // Send cookies for authentication
        }).then(a => {
            if (a.status === 401) {
                handleAuthExpired();
                return null;
            }
            return a.json();
        }).then(b => {
            if (!b) return;
            b.message ? "You are banned from this room" === b.message ? displayError("You are banned from this room") : window.location.href = `/room?roomId=${a}` : displayError("Error joining room: " + b.message)
        }).catch(a => {

        })
    }, "Joining room...");
}

function displayError(message) {
    showToast(message, "error");
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuthentication().then((isAuthenticated) => {
        if (isAuthenticated) {
            fetchProfileInfo()
        }
    });
});
