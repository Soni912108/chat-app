const welcomeUser = document.getElementById("username");

function applyTheme(settings) {
    if (settings && settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    }
}

async function loadTheme() {
    try {
        const response = await fetch('/api/users/me/settings', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            applyTheme({ theme: 'light' });
            return;
        }

        const data = await response.json();
        applyTheme(data.settings || { theme: 'light' });
    } catch (error) {
        applyTheme({ theme: 'light' });
    }
}

async function loadCurrentUser() {
    if (!welcomeUser) {
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleAuthExpired();
                return;
            }
            welcomeUser.textContent = "";
            return;
        }

        const data = await response.json();
        welcomeUser.textContent = `Welcome, ${data.user.username}`;
        welcomeUser.title = "Account menu";
    } catch (error) {
        welcomeUser.textContent = "";
    }
}

loadTheme();
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
