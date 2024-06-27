const userName = sessionStorage.getItem('username');
const token = sessionStorage.getItem('token');
const userId = sessionStorage.getItem('userID');


function checkAuthentication() {
  if (!token) {
    window.location.href = '/login?message=loggedOut';
  }
}

function loadRooms() {
  
  if (!token) {
    window.location.href = '/login?message=loggedOut';
    return; // Exit the function if no token
  }
  
  fetch('/api/rooms', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    }
  })

  .then(response => {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    return response.json();
  })
  .then(data => {
    const roomsList = document.getElementById('rooms');
    roomsList.innerHTML = '';
    if (!data.rooms.length) {
      const noRoomsMessage = document.createElement('li');
      noRoomsMessage.textContent = 'No rooms available';
      roomsList.appendChild(noRoomsMessage);
      return;
    }

    data.rooms.forEach((room, index) => {
      const roomItem = document.createElement('li'); // Changed to 'li' for proper list item
      roomItem.textContent = room.name;
      roomItem.onclick = () => joinRoom(room._id);
      roomsList.appendChild(roomItem);
      const lineBreak = document.createElement('br');
      roomsList.appendChild(lineBreak);
    });
    
  })
  .catch(error => {
    if (error.message === 'Unauthorized') {
      window.location.href = '/login?message=loggedOut';
    } else {
      console.error('Fetch error:', error);
      const roomsList = document.getElementById('rooms');
      roomsList.innerHTML = '';
      const errorMessage = document.createElement('li'); // Changed to 'li' for proper list item
      errorMessage.textContent = 'Error loading rooms';
      roomsList.appendChild(errorMessage);
    }
  });
}

function createRoom() {
  const roomName = document.getElementById('newRoomName').value;
  
  if (!roomName.trim()) {
    alert('Room name cannot be empty');
    return;
  }

  
  fetch('/api/rooms/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ 
      name: roomName,
      owner: userId
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.room) {
      if (confirm('Room created successfully. Do you want to join this room?')) {
        joinRoom(data.room._id);
      } 
    } else {
      alert('Error creating room: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error creating room');
  });
}

function joinRoom(roomId) {
  fetch(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      window.location.href = `/room?roomId=${roomId}`;
      if (data.isOwner) {
        sessionStorage.setItem('isOwner', 'True');
      } else {
        sessionStorage.setItem('isOwner', data.isOwner);
      }
    } else {
      alert('Error joining room: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error joining room');
  });
}


// Check authentication and load rooms when the page is first loaded
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  loadRooms();
});

// Check authentication when navigating back to the page
window.addEventListener('pageshow', () => {
  checkAuthentication();
  loadRooms();
});
