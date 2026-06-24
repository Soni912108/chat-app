const welcomeUser = document.getElementById("username");

async function loadCurrentUser() {
    if (!welcomeUser) {
        return;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            welcomeUser.textContent = "";
            return;
        }

        const data = await response.json();
        welcomeUser.textContent = `Welcome, ${data.user.username}`;
    } catch (error) {
        welcomeUser.textContent = "";
    }
}

loadCurrentUser();

function gotoNotification() {
    window.location.href = "/notification";
}

function goToProfile() {
    window.location.href = "/profile";
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        window.location.href = "/login?message=loggedOut";
    } catch (error) {
        window.location.href = "/login?message=loggedOut";
    }
}

function goBack() {
    window.location.href = "/dashboard";
}

function updateUserProfile() {
    window.location.href = "/updateUser";
}

function goBackToProfile() {
    window.location.href = "/profile";
}
