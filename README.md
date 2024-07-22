# Chat App

This is a Chat Application platform, built using Node.js, Express.js, MongoDB, and Redis for the Backend, and JavaScript, HTML, and CSS for the Frontend. It is a full-stack app that provides options to chat in private/public rooms created by users, the ability to customize your profile, upload profile photos, and more.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Live Demo](#live-demo)

## Features

- **User Authentication**
  - Register and login functionality using JWT for secure authentication.
  
- **Chat Rooms**
  - Create public and private chat rooms.
  - Join existing chat rooms.
  - Real-time messaging using WebSockets.

- **User Profiles**
  - Customize your profile with a username, bio, and profile photo.
  - Upload and change profile pictures.

- **Messaging**
  - Send and receive messages in real-time.
  - Support for text and emojis.
  - Message history and retrieval.

- **Notifications**
  - Real-time notifications for new messages.
  - Alerts for mentions and direct messages.

- **Search**
  - Search for users and chat rooms.
  - Filter messages within a chat room.

- **Security**
  - Secure password storage with bcrypt.
  - Data validation and sanitization.

- **Scalability**
  - Horizontal scaling using Redis for session management and message queueing.
  - Optimized for performance and scalability.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed on your machine
- A MongoDB database (local or Atlas)
- A Redis instance (local or cloud-based)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/chat-app.git
   cd chat-app

2.Install the dependencies:
    
     npm install

## Environment Variables

1.Create a .env file in the root directory of your project and add the following variables:

    
    REDIS_PASSWORD=your_redis_password
    REDIS_HOST = your_redis_host
    REDIS_PORT = your_redis_port
    
    PASSWORD=your_mongodb_password
    JWT_SECRET=your_jwt_secret
    PORT=your_local_port_number

Replace your_mongodb_uri, your_redis_url, your_jwt_secret, and your_port_number with your actual MongoDB URI, Redis URL, JWT secret, and desired port number.


## Usage
To start the development server using nodemon, run:

    npm run dev

The app will be running on http://localhost:3000. (or the port you pass)



## Deployment

The app is deployed using Azure. To deploy your own instance, follow these steps:

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Create a new Web App resource.
3. In the deployment section, choose GitHub as the deployment source.
4. Link your GitHub account and select the repository and branch you want to deploy.
5. Configure the build settings if needed.
6. Set up your environment variables in the "Configuration" section of your Web App settings.
7. Click on "Save" and then "Deploy".



## Contributing

Contributions are welcome! Please follow these steps:

1.Fork the repository.
2.Create a new branch (git checkout -b feature-branch).
3.Make your changes.
4.Commit your changes (git commit -m 'Add some feature').
5.Push to the branch (git push origin feature-branch).
6.Open a pull request.


## License
This project is licensed under the MIT License. See the LICENSE file for more details.

## Live Demo

Check out the live demo of the application [here](https://chatapp2.azurewebsites.net/).


