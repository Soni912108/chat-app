//public/js/profile.js


// Fetch additional profile information and statistics
async function fetchProfileInfo() {
  const userId = sessionStorage.getItem('userID');
  try {
      const response = await fetch(`/api/auth/profileInfo/${userId}`, {
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
      console.log(data);
      // Update the UI with the fetched data
      displayProfileInfo(data);
  } catch (error) {
      console.error('Error fetching profile info:', error);
      alert('Error fetching profile info:', error);
  }
}


function displayProfileInfo(data) {
  document.getElementById('username').textContent = data.username;
  document.getElementById('email').textContent = `Email: ${data.email}`;
  document.getElementById('joined-date').textContent = `Joined: ${new Date(data.joinedDate).toLocaleString()}`;
  document.getElementById('last-login').textContent = `Last login: ${new Date(data.lastLogin).toLocaleString()}`;

  const avatarImg = document.getElementById('profile-avatar');
  if (data.avatar) {
      avatarImg.src = data.avatar; // Set the avatar image if available
  } else {
      avatarImg.src = '/public/images/profile-circle.svg'; // Set default avatar image
  }

  const roomsCreatedList = document.getElementById('rooms-created');
  roomsCreatedList.innerHTML = '';
  if (data.roomDetails.length === 0) {
    // Handle no rooms case
    const noRoomsMessage = document.createElement('p');
    noRoomsMessage.textContent = 'No rooms created yet.';
    roomsCreatedList.appendChild(noRoomsMessage);
  } else {
    // Existing code to create list items for rooms
    data.roomDetails.forEach(room => {
      const roomListItem = document.createElement('li');
      roomListItem.classList.add('room-name');
      const roomLink = document.createElement('a');
      roomLink.href = '#';
      roomLink.textContent = room.name;
      roomLink.addEventListener('click', (e) => {
        e.preventDefault();
        joinRoom(room._id);
      });
      roomListItem.appendChild(roomLink);
      roomsCreatedList.appendChild(roomListItem);
    });
  }

  document.getElementById('rooms-created-count').textContent = `Rooms Created: ${data.roomsCreatedCount}`;
  document.getElementById('rooms-joined-count').textContent = `Rooms Joined: ${data.roomsJoinedCount}`;
  document.getElementById('messages-sent-count').textContent = `Messages Sent: ${data.messagesSentCount}`;

  const recentActivityList = document.getElementById('recent-activity-list');
    recentActivityList.innerHTML = '';
    data.recentActivity.forEach(activity => {
      const activityItem = document.createElement('li');

      // Convert timestamp to Date object and format it
      const timestamp = new Date(activity.timestamp);
      const formattedTimestamp = timestamp.toLocaleString(); // Adjust format as needed

      activityItem.textContent = `Message: ${activity.content} at ${formattedTimestamp}  (in ${activity.roomName})`;
      recentActivityList.appendChild(activityItem);
    });

}




function joinRoom(roomId) {
    fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.message) {
        if (data.message === 'You are banned from this room') {
          displayError('You are banned from this room');
        } else {
          window.location.href = `/room?roomId=${roomId}`;
          
          // Store the isOwner flag in sessionStorage
          if (data.isOwner) {
            sessionStorage.setItem('isOwner', 'True');
          } else {
            sessionStorage.setItem('isOwner', 'False');
          }
        }
      } else {
        displayError('Error joining room: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      displayError('Error joining room');
    });
  }
  


function checkAuthentication() {
        const token = sessionStorage.getItem('token');
        if (!token) {
        sessionStorage.clear();
        window.location.href = '/login?message=loggedOut';
        }
  }

// Check authentication and load rooms when the page is first loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    fetchProfileInfo(); // Call fetchAdminRooms when the page loads

});

// Check authentication when navigating back to the page
window.addEventListener('pageshow', checkAuthentication);


//section to change user settings--work in progress...

//document.getElementById('settings-form').addEventListener('submit', async (event) => {
  //   event.preventDefault();
  
  //   const theme = document.getElementById('theme').value;
  
  //   // Save settings to server
  //   try {
  //       const response = await fetch('/api/user/settings', {
  //           method: 'POST',
  //           headers: {
  //               'Content-Type': 'application/json',
  //               'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
  //           },
  //           body: JSON.stringify({ theme: theme }),
  //       });
  
  //       if (!response.ok) {
  //           const error = await response.json();
  //           throw new Error(error.message);
  //       }
  
  //       const data = await response.json();
  //       alert('Settings updated successfully!');
  //       applySettings(data.settings); // Apply settings to the page
  //   } catch (error) {
  //       console.error('Error updating settings:', error);
  //       alert('Error updating settings:', error.message);
  //   }
  // });
  
  // // Function to apply settings to the page
  // function applySettings(settings) {
  //   if (settings.theme === 'dark') {
  //       document.body.classList.add('dark-theme');
  //       document.body.classList.remove('light-theme');
  //   } else {
  //       document.body.classList.add('light-theme');
  //       document.body.classList.remove('dark-theme');
  //   }
  // }
  
  // // Fetch and apply settings when the page loads
  // document.addEventListener('DOMContentLoaded', async () => {
  //   try {
  //       const response = await fetch('/api/user/settings', {
  //           method: 'GET',
  //           headers: {
  //               'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
  //           },
  //       });
  
  //       if (!response.ok) {
  //           const error = await response.json();
  //           throw new Error(error.message);
  //       }
  
  //       const data = await response.json();
  //       document.getElementById('theme').value = data.settings.theme;
  //       applySettings(data.settings);
  //   } catch (error) {
  //       console.error('Error fetching settings:', error);
  //   }
  // });
  