document.getElementById('changePasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const repeatPassword = document.getElementById('repeat-password').value;
    const errorMessage = document.getElementById('error-message');
  
    errorMessage.textContent = '';
  
    // Ensure new passwords match
    if (newPassword !== repeatPassword) {
      errorMessage.textContent = 'New passwords do not match';
      return;
    }
  
    // Fetch to change password endpoint
    try {
      const response = await fetch('/api/auth/changePassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
        body: JSON.stringify({
          userID: sessionStorage.getItem('userID'),
          oldPassword,
          newPassword,
        })
      });
  
      const data = await response.json();
      
      if (response.ok) {
        window.location.href = '/profile';
      } else {
        errorMessage.textContent = data.message || 'Error changing password. Please try again.';
      }
  
    } catch (error) {
      console.error('Error changing password:', error);
      errorMessage.textContent = 'Error changing password. Please try again.';
    }
});
  


document.getElementById('avatar-upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    const fileInput = document.getElementById('avatar-input');
    formData.append('avatar', fileInput.files[0]);

    try {
        const response = await fetch('/api/fileUpload/uploadAvatar', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        // const data = await response.json();
        // document.getElementById('profile-avatar').src = data.avatar; // Update the avatar image
        if (confirm('Image was updated successfully')) {
            window.location.href = '/profile';
          } 
    } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Error uploading avatar:', error.message);
    }
});
