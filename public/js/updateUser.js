// Check if user is authenticated before loading updateUser content
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
        
        console.log("Authentication successful, loading updateUser page");
        return true;
    } catch (error) {
        console.error("Error checking authentication:", error);
        window.location.href = '/login?message=loggedOut';
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
    if (e.textContent = "", c !== d) return void(e.textContent = "New passwords do not match");
    try {
        const a = await fetch("/api/auth/changePassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include", // Send cookies for authentication
                body: JSON.stringify({
                    oldPassword: b,
                    newPassword: c
                })
            }),
            d = await a.json();
        a.ok ? window.location.href = "/profile" : e.textContent = d.message || "Error changing password. Please try again."
    } catch (a) {
        console.error("Error changing password:", a), e.textContent = "Error changing password. Please try again."
    }
}), document.getElementById("avatar-upload-form").addEventListener("submit", async a => {
    a.preventDefault();
    const b = new FormData,
        c = document.getElementById("avatar-input");
    b.append("avatar", c.files[0]);
    try {
        const a = await fetch("/api/fileUpload/uploadAvatar", {
            method: "POST",
            credentials: "include", // Send cookies for authentication
            body: b
        });
        if (!a.ok) {
            const b = await a.json();
            throw new Error(b.message)
        }
        confirm("Image was updated successfully") && (window.location.href = "/profile")
    } catch (a) {
        console.error("Error uploading avatar:", a), alert("Error uploading avatar:", a.message)
    }
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
