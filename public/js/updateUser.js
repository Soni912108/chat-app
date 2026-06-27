// Check if user is authenticated before loading updateUser content
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
        

        return true;
    } catch (error) {

        handleAuthExpired();
        return false;
    }
}

// Initialize the page after authentication check
function initializePage() {
    document.getElementById("changePasswordForm").addEventListener("submit", async function(a) {
    a.preventDefault();
    const b = document.getElementById("old-password").value,
        c = document.getElementById("new-password").value,
        d = document.getElementById("repeat-password").value,
        e = document.getElementById("error-message");
    e.textContent = "";
    if (c !== d) {
        showToast("New passwords do not match", "error");
        return;
    }
    await withGlobalLoading(async () => {
        try {
            const a = await fetch("/api/auth/me/password", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include", // Send cookies for authentication
                    body: JSON.stringify({
                        oldPassword: b,
                        newPassword: c
                    })
                });
            if (a.status === 401) {
                handleAuthExpired();
                return;
            }
            const d = await a.json();
            if (a.ok) {
                showToast("Password changed successfully", "success");
                window.location.href = "/profile";
            } else {
                showToast(d.message || "Error changing password. Please try again.", "error");
            }
        } catch (a) {

            showToast("Error changing password. Please try again.", "error");
        }
    }, "Changing password...");
}), document.getElementById("avatar-upload-form").addEventListener("submit", async a => {
    a.preventDefault();
    const b = new FormData,
        c = document.getElementById("avatar-input");
    b.append("avatar", c.files[0]);
    await withGlobalLoading(async () => {
        try {
            const a = await fetch("/api/uploads/avatar", {
                method: "POST",
                credentials: "include", // Send cookies for authentication
                body: b
            });
            if (a.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!a.ok) {
                const b = await a.json();
                throw new Error(b.message)
            }
            showToast("Image updated successfully", "success");
            window.location.href = "/profile";
        } catch (a) {

            showToast(a.message || "Error uploading avatar", "error");
        }
    }, "Uploading avatar...");
});
}

// Call the authentication check and page initialization
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }
    initializePage();
});
