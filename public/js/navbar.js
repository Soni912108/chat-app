const userName = sessionStorage.getItem("username"),
    userId = sessionStorage.getItem("userID"),
    welcomeUser = document.getElementById("username");
welcomeUser ? welcomeUser.textContent = "Welcome, " + userName : console.log("Element not found");

function gotoNotification() {
    window.location.href = "/notification";
}

function goToProfile() {
    window.location.href = "/profile";
}

async function logout() {
    try {
        // Call server logout endpoint to clear cookies
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = "/login?message=loggedOut";
    } catch (error) {
        console.error('Error during logout:', error);
        // Even if server logout fails, clear local storage and redirect
        sessionStorage.clear();
        window.location.href = "/login?message=loggedOut";
    }
}

function goBack() {
    window.location.href = "/dashboard"
}

function updateUserProfile() {
    window.location.href = "/updateUser"
}

function goBackToProfile() {
    window.location.href = "/profile"
}