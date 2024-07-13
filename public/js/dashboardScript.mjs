//importing the jwt_decode method from the default implementation
import jwt_decode from 'https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.esm.js';


const token = sessionStorage.getItem('token');
const userId = sessionStorage.getItem('userID');



function isTokenExpired(token) {
    try {
        const decoded = jwt_decode(token);
        const currentTime = Date.now() / 1000; // current time in seconds
        return decoded.exp < currentTime;
    } catch (error) {
        console.error('Failed to decode token:', error);
        return true; // Assume token is expired if decoding fails
    }
}



function loadRooms() {

  const loadingRooms = document.getElementById('lds-ellipsis');

  if (isTokenExpired(token)) {
    sessionStorage.clear();
    window.location.href = '/login?message=loggedOut';
    return; // Exit the function if token is expired .style.display = 'block';
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
      loadingRooms.style.display = 'none';
      const noRoomsMessage = document.createElement('li');
      noRoomsMessage.textContent = 'No rooms available';
      roomsList.appendChild(noRoomsMessage);
      return;
    }

    data.rooms.forEach((room) => {
      loadingRooms.style.display = 'none';
      const roomItem = document.createElement('li'); // Changed to 'li' for proper list item

      // Use a ternary operator for concise conditional display
      let privacyText = room.isPrivate ? "Private" : "Public";
      roomItem.textContent = room.name + " - " + privacyText + "- ";

      if (room.banned.includes(userId)) {
        roomItem.innerHTML += "<span style='font-weight: bold; color: red;'>Banned from this Room</span>";
      } else {
        roomItem.innerHTML += "<span style='font-weight: bold; color: green;'>Join this Room</span>";
      }

      roomItem.onclick = () => joinRoom(room._id);
      roomsList.appendChild(roomItem);

      const lineBreak = document.createElement('br');
      roomsList.appendChild(lineBreak);
    });
    
  })
  .catch(error => {
    if (error.message === 'Unauthorized') {
      sessionStorage.clear();
      window.location.href = '/login?message=loggedOut';
    } else {
      console.error('Fetch error:', error);
      const roomsList = document.getElementById('rooms');
      roomsList.innerHTML = '';
      const errorMessage = document.createElement('li'); // Changed to 'li' for proper list item
      loadingRooms.style.display = 'none';
      errorMessage.textContent = 'Error loading rooms';
      roomsList.appendChild(errorMessage);
    }
  });
}

function createRoom() {

  if (isTokenExpired(token)) {
    sessionStorage.clear();
    window.location.href = '/login?message=loggedOut';
    return; // Exit the function if token is expired
  }


  const roomName = document.getElementById('newRoomName').value;
  const isPrivate = document.getElementById('privacy').value;
  console.log(isPrivate);

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
      owner: userId,
      private: isPrivate === 'private', //must be a boolean value to pass to the server
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


//calling the function on the click of the button createRoomButton
document.getElementById('createRoomButton').addEventListener('click', createRoom);



function joinRoom(roomId) {
  if (isTokenExpired(token)) {
    sessionStorage.clear();
    window.location.href = '/login?message=loggedOut';
    return;
  }

  fetch(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
  })
    .then(response => response.json())
    .then(data => {
      handleJoinResponse(data, roomId);
    })
    .catch(error => {
      console.error('Error:', error);
      displayError('Error joining room');
    });
}

function handleJoinResponse(data, roomId) {
  if (data.message) {
    switch (data.message) {
      case 'You are banned from this room':
        displayError('You are banned from this room');
        break;
      case 'Request sent to join private room':
      case 'Join request already sent to the room owner':
        displayError('Join request sent to room owner');
        break;
      case 'Joined room':
        window.location.href = `/room?roomId=${roomId}`;
        sessionStorage.setItem('isOwner', data.isOwner ? 'True' : 'False');
        break;
      case 'Already a member of the room':
        window.location.href = `/room?roomId=${roomId}`;
        break;
      default:
        displayError(data.message);
    }
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



function checkAuthentication() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?message=loggedOut';
    }
  }

// Check authentication and load rooms when the page is first loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadRooms();
  });

// Check authentication when navigating back to the page
window.addEventListener('pageshow', checkAuthentication);

