const socket = io();

// Extract roomId from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const token = sessionStorage.getItem('token');
const isOwner = sessionStorage.getItem('isOwner');

// Function to scroll to the bottom
function scrollToBottom() {
  const messages = document.getElementById('messages-container');
  messages.scrollTop = messages.scrollHeight;
}

// Function to fetch room details
function fetchRoomDetails() {
  fetch(`/api/rooms/${roomId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.room) {
        // Update the title and room name
        document.getElementById('roomTitle').textContent = `Room - ${data.room.name}`;
        document.getElementById('roomName').textContent = `Room - ${data.room.name}`;
        document.getElementById('roomOwner').textContent = `Owner - ${data.room.roomOwner.username}`;

        // Update the list of users in the room
        const userList = document.getElementById('userList');
        userList.innerHTML = ''; // Clear existing users 

        data.room.users.forEach(user => {
          const userItem = document.createElement('li');
          userItem.textContent = user.username;
          userList.appendChild(userItem);
        });
      } else {
        console.error('Error fetching room details:', data.message);
      }
    })
    .catch(error => console.error('Error:', error));
}

// Function to display messages
function displayMessages() {
  fetch(`/api/messages/${roomId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          return { messageTuples: [] }; // Return an empty array if no messages are found
        }
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    })
    .then(data => {
      const messages = document.getElementById('messages');
      messages.innerHTML = ''; // Clear existing messages before displaying new ones
      
      if (data.messageTuples && data.messageTuples.length > 0) {
        data.messageTuples.forEach(message => {
          const messageElement = document.createElement('li');
          messageElement.className = 'message';

          const avatar = document.createElement('div');
          avatar.className = 'message-avatar';
          avatar.textContent = message.username.charAt(0).toUpperCase();

          const messageContent = document.createElement('div');
          messageContent.className = 'message-content';

          const username = document.createElement('span');
          username.className = 'username';
          username.textContent = message.username;

          const content = document.createElement('p');
          content.textContent = message.content;

          messageContent.appendChild(username);
          messageContent.appendChild(content);

          messageElement.appendChild(avatar);
          messageElement.appendChild(messageContent);

          messages.appendChild(messageElement);
          scrollToBottom();
        });
      } else {
        const noMessagesElement = document.createElement('li');
        noMessagesElement.textContent = 'It\'s empty. Type something here...';
        messages.appendChild(noMessagesElement);
      }
    })
    .catch(error => {
      console.error('Error fetching messages:', error);
    });
}

// Handle successful connection
socket.on('connect', () => {
  console.log('Connected to server');
  const messages = document.getElementById('messages');
  const messageElement = document.createElement('li');
  messageElement.className = 'message';
  messageElement.textContent = 'Connected to server';
  messages.appendChild(messageElement);

  if (isOwner === 'TRUE') {
    document.getElementById('deleteRoom').disabled = false;
    document.getElementById('banUser').disabled = false;
  }

  // Fetch and update room details
  fetchRoomDetails();
  // Load the messages
  displayMessages();
  messageElement.textContent = '';
  // Join the room
  socket.emit('joinRoom', roomId);
});

// Handle connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  const messages = document.getElementById('messages');
  const messageElement = document.createElement('li');
  messageElement.className = 'message';
  messageElement.textContent = 'Server is processing the request. Please wait while the connection is reestablishing...';
  messages.appendChild(messageElement);
});

// Handle disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from server');
  const messages = document.getElementById('messages');
  const messageElement = document.createElement('li');
  messageElement.className = 'message';
  messageElement.textContent = 'You have been disconnected from the server. Trying to reconnect...';
  messages.appendChild(messageElement);
});

// Handle new messages
socket.on('message', (msg) => {
  const messages = document.getElementById('messages');
  const messageElement = document.createElement('li');
  messageElement.className = 'message';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = msg.user.charAt(0).toUpperCase();

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const username = document.createElement('span');
  username.className = 'username';
  username.textContent = msg.user;

  const content = document.createElement('p');
  content.textContent = msg.content;

  messageContent.appendChild(username);
  messageContent.appendChild(content);

  messageElement.appendChild(avatar);
  messageElement.appendChild(messageContent);

  messages.appendChild(messageElement);
  scrollToBottom();
});

// Handle updated user list
socket.on('updateUserList', (userList) => {
  const userListElement = document.getElementById('userList');
  userListElement.innerHTML = ''; // Clear existing users

  userList.forEach(user => {
    const userItem = document.createElement('li');
    userItem.textContent = user.username;
    userListElement.appendChild(userItem);
  });
});

function sendMessage() {
  const input = document.getElementById('messageInput');
  const messageContent = input.value.trim();

  //send the message to the sever by clicking the send button
  if (messageContent) {
    const userId = sessionStorage.getItem('userID');

    const message = {
      content: messageContent,
      userId: userId,
      roomId: roomId,
    };

    // Check for 'noMessagesElement' and update its content
    const noMessagesElement = document.getElementById('messages'); // Assuming 'messages' is the parent element
    if (noMessagesElement && noMessagesElement.textContent === 'It\'s empty. Type something here...') {
      noMessagesElement.textContent = ''; // Change to empty string
    }
    
    socket.emit('message', message);
    input.value = '';
  }
}

document.getElementById('messageInput').addEventListener('input', () => {
  socket.emit('typing', roomId);
});

socket.on('typing', () => {
  const typingIndicator = document.getElementById('typingIndicator');
  typingIndicator.textContent = 'Someone is typing...';

  // Remove the "Someone is typing..." message after a timeout
  setTimeout(() => {
    typingIndicator.textContent = '';
  }, 3000); // Adjust the timeout duration as needed
});

async function deleteRoom() {
  if (!roomId || !token) {
    console.error('Missing room ID or token');
    return;
  }
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.message === 'Room and associated messages deleted successfully') {
      alert('Room deleted successfully!');
      window.location.href = '/dashboard'; // Redirect to the dashboard.html page
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
