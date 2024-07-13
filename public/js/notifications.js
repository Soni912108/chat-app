async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      displayNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = '';

    // Check if the length of the notifications is 0 and display a "No new notifications" message
    if (notifications.length === 0) {
      const noNewNotificationsMessage = document.createElement('li');
      noNewNotificationsMessage.textContent = 'No new notifications.';
      noNewNotificationsMessage.style.color = 'green';
      notificationsList.appendChild(noNewNotificationsMessage);
    }

    notifications.forEach(notification => {
      const listItem = document.createElement('li');
      listItem.textContent = notification.message;
    
        // Only add the Accept Request button if the notification is unread
          if (notification.message.includes('wants to join your private room') && notification.read === false) {
            const acceptButton = document.createElement('button');
            acceptButton.textContent = 'Accept Request';
            acceptButton.addEventListener('click', async () => {
              const success = await handleRoomRequestNotification(
                notification.sender,
                notification.roomId,
                notification._id
              );

              if (success) { // Check for successful response
                acceptButton.style.display = 'none'; // Hide button on success
                listItem.remove();
              } else {
                console.error('Error accepting room request');
                const msg = 'Error accepting room request. User might already be in the room list';
                displayError(msg);
              }
            });
            listItem.appendChild(acceptButton);
          
          notificationsList.appendChild(listItem);
        };
      // Add event listener for marking the notification as read
      const markAsReadButton = document.createElement('button');
      markAsReadButton.textContent = notification.read ? 'Already Read' : 'Mark as Read';
      markAsReadButton.addEventListener('click', async () => {
        await markNotificationAsRead(notification._id);
        // Update the UI to reflect the read state (optional)
        markAsReadButton.textContent = 'Already Read';
        listItem.style.color = 'green';
      });
      listItem.appendChild(markAsReadButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', async () => {
        await deleteNotification(notification._id);
        // Remove the list item from the UI
        notificationsList.removeChild(listItem);
      });
      listItem.appendChild(deleteButton);

      notificationsList.appendChild(listItem);
    });
  }

  async function markNotificationAsRead(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
  
      console.log('Notification marked as read successfully');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
}
  
async function deleteNotification(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server response error:', error); // Detailed log
        throw new Error(error.message);
      }

      console.log('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }


//function to add a button that would accept requests to join a room  
//checking this type of notification form the text received from the server
async function handleRoomRequestNotification(userId, roomId, notificationId) {
  try {
    const response = await fetch(`/api/rooms/${roomId}/${userId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    console.log('User added to the room successfully');
    // Mark the notification as read after accepting the request
    await markNotificationAsRead(notificationId);
    return true; // Indicate success
  } catch (error) {
    console.error('Error accepting room request:', error);
    return false; // Indicate failure
  }
}





function displayError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000); // Hide after 5 seconds
  }
  

//calling this function when the page is loaded
document.addEventListener('DOMContentLoaded', fetchNotifications);
