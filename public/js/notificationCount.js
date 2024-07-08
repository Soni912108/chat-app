// public/js/notificationCount.js



const socket = io('https://chat-app-gules-seven.vercel.app/');

let retryCount = 0;
const maxRetries = 5;
let retryTimeout;

socket.on('connect', () => {
  console.log('Connected to the server');
  updateConnectionStatus('Connected to the server.', 'success');
  retryCount = 0; // Reset retry count on successful connection
  getNotificationNumber();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  retryCount++;
  updateConnectionStatus(`Please wait while the connection is reestablishing... (${retryCount})`, 'error');
  
  if (retryCount >= maxRetries) {
    showTroubleshootingTips();
  } else {
    retryTimeout = setTimeout(() => {
      socket.connect(); // Retry connection
    }, 5000); // Retry after 5 seconds
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateConnectionStatus('You have been disconnected from the server. Trying to reconnect...', 'error');
  
  if (retryCount < maxRetries) {
    retryTimeout = setTimeout(() => {
      socket.connect(); // Retry connection
    }, 5000); // Retry after 5 seconds
  } else {
    showTroubleshootingTips();
  }
});

function updateConnectionStatus(message, type) {
  const errorElement = document.getElementById('error');
  
  // Clear existing content
  errorElement.innerHTML = '';

  // Create and append new message
  const messageElement = document.createElement('p');
  messageElement.className = `dashboard-error ${type}`;
  messageElement.textContent = message;

  errorElement.appendChild(messageElement);
}



// Function to display troubleshooting tips
function showTroubleshootingTips() {
  const errorElement = document.getElementById('connection-error');

  // Clear existing content
  errorElement.innerHTML = '';

  // Create and append new message with troubleshooting tips
  const messageElement = document.createElement('p');
  messageElement.className = 'dashboard-error error';
  messageElement.innerHTML = `
    <p>We are unable to connect to the server. Please try the following troubleshooting steps:</p>
    <ul>
      <li>Check your internet connection and ensure it is stable.</li>
      <li>Try refreshing the page.</li>
      <li>If the problem persists, please contact support.</li>
    </ul>
  `;

  errorElement.appendChild(messageElement);
}

socket.on('notification', (data) => {
  console.log('New notification:', data.message);
  updateNotificationCount(data.unreadCount);
  showNotificationAnimation();
});

function updateNotificationCount(count) {
  const notificationCountElement = document.getElementById('notification-count');
  notificationCountElement.textContent = count;

  // Show the element if it was previously hidden
  if (count > 0) {
    notificationCountElement.style.display = 'inline';
  } else {
    notificationCountElement.style.display = 'none';
  }
}

function showNotificationAnimation() {
  const notificationButton = document.getElementById('notification');
  notificationButton.classList.add('notification-animation');
  setTimeout(() => {
    notificationButton.classList.remove('notification-animation');
  }, 1000); // Adjust time based on your preference
}

// Optional: Reset notification count when the notifications page is loaded
function resetNotificationCount() {
  const notificationCountElement = document.getElementById('notification-count');
  notificationCountElement.textContent = '';
  notificationCountElement.style.display = 'none';
}

function getNotificationNumber() {
  // Call the server /newNotifications to fetch this user's notification number
  fetch('/api/notifications/newNotifications', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + sessionStorage.getItem('token'), // Note the space after Bearer
    },
  }).then(response => {
    if (!response.ok) {
      if (response.status === 500) {
        return { unreadNotifications: 0 };
      } else if (response.status === 401) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to fetch Notifications');
    }
    return response.json();
  }).then(data => {
    updateNotificationCount(data.unreadNotifications);
  }).catch(error => {
    console.error('Error fetching notifications:', error);
    updateConnectionStatus(error.message, 'error');
  });
}


