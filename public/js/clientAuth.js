//public/js/clientAuth.js

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMessageDiv = document.getElementById('errorMessage');
  const loadingSpinner = document.querySelector('.lds-spinner');

  // Show loading spinner
  loadingSpinner.style.display = 'block';

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  .then(response => {
    // Hide loading spinner on successful response
    loadingSpinner.style.display = 'none';

    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.message);
      });
    }
    return response.json();
  })
  .then(data => {
    if (data.token && data.userID && data.userName) {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('userID', data.userID);
      sessionStorage.setItem('username', data.userName);

      window.location.href = '/dashboard'; // Redirect to the dashboard.html page
    } else {
      throw new Error('Invalid response format');
    }
  })
  .catch(error => {
    // Check if the error is a fetch error
    if (error.message === 'Failed to fetch') {
        errorMessageDiv.textContent = 'Failed to login. Please try again later.';
    } else {
        errorMessageDiv.textContent = error.message;
    }
    errorMessageDiv.style.display = 'block';
    // Hide loading spinner on error
    loadingSpinner.style.display = 'none';
});
}

  


function register() {
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMessageDiv = document.getElementById('errorMessage');
  const loadingSpinner = document.querySelector('.lds-spinner');

  // Show loading spinner
  loadingSpinner.style.display = 'block';

  fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
  })
  .then(response => {
      // Hide loading spinner on successful response
      loadingSpinner.style.display = 'none';

      if (!response.ok) {
          return response.json().then(error => {
              throw new Error(error.message);
          });
      }
      return response.json();
  })
  .then(data => {
      if (data.token && data.userID && data.userName) {
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('userID', data.userID);
          sessionStorage.setItem('username', data.userName);
          window.location.href = '/dashboard'; // Redirect to the dashboard.html page
      } else {
          throw new Error('Invalid response format');
      }
  })
  .catch(error => {
      // Check if the error is a fetch error
      if (error.message === 'Failed to fetch') {
          errorMessageDiv.textContent = 'Failed to register. Please try again later.';
      } else {
          errorMessageDiv.textContent = error.message;
      }
      errorMessageDiv.style.display = 'block';
      // Hide loading spinner on error
      loadingSpinner.style.display = 'none';
  });
}



  
