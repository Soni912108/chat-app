# Roomloop - Project Architecture & Development Guide

## Overview
A real-time chat application built with Node.js, Express.js, Socket.io, MongoDB (Mongoose), and JWT authentication. Users can create/join chat rooms, send messages in real-time, manage notifications, and update profiles.

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | Latest |
| Backend Framework | Express.js | ^4.19.2 |
| Real-time Communication | Socket.io | ^4.7.5 |
| Database | MongoDB | ^6.17.0 |
| ODM | Mongoose | ^8.4.0 |
| Authentication | JWT | ^9.0.2 |
| Password Hashing | Bcrypt | ^6.0.0 |
| File Upload | Multer | ^1.4.5-lts.1 |
| Middleware | CORS | ^2.8.5 |
| Image Storage | Cloudinary | ^2.10.0 |

---

## Local Development

- `npm run dev` starts the app with Node watch mode on the host machine.
- `make docker-dev` builds and runs the Docker development image with watch mode.
- `make docker-run` runs the production-style Docker image.

## Deployment

Fly.io was used as the cloud provider for deployment during the project. The repository keeps `fly.toml` and Docker-based deployment settings so the app can be reproduced or redeployed without rewriting the app.

---

## Project Structure

```
roomloop/
├── server.js                 # Main Express server entry point
├── socket.js                 # Socket.io event handlers
├── testConn.js              # Database connection testing utility
├── databases/
│   ├── mongodbConnection.js  # MongoDB connection setup
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/                   # Mongoose schemas
│   ├── Users.js             # User model with bcrypt hashing
│   ├── Rooms.js             # Chat room model
│   ├── Messages.js          # Message model
│   └── Notification.js      # Notification model
├── routes/                   # API endpoints
│   ├── userAuth.js          # Register, login, logout
│   ├── room.js              # Room CRUD operations
│   ├── messages.js          # Message operations
│   ├── avatar.js            # Avatar upload/management (Cloudinary)
│   ├── notifications.js     # Notification endpoints
│   └── settings.js          # User settings
├── public/                   # Frontend static assets
│   ├── css/
│   │   └── style.css
│   ├── js/                  # Client-side scripts
│   │   ├── chatrooms.js     # Room management UI
│   │   ├── clientAuth.js    # Auth flow handling
│   │   ├── dashboardScript.mjs
│   │   ├── navbar.js
│   │   ├── notificationCount.js
│   │   ├── notifications.js
│   │   ├── profile.js
│   │   ├── │   └── templates/           # HTML templates
├── utils/
│   └── notificationFunction.js  # Notification utilities
├── docs/                        # Documentation
├── package.json
└── .env.example
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  HTML Templates │ CSS │ JavaScript │ Socket.io Client       │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Socket.io      │ (Real-time)
                    │  HTTP/REST      │ (Traditional)
                    └────────┬────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   Express.js Server                          │
├─────────────────────────────────────────────────────────────┤
│  CORS Middleware │ JWT Auth Middleware │ Static File Server │
├─────────────────────────────────────────────────────────────┤
│  Routes: Auth │ Rooms │ Messages │ Avatars │ Notifications  │
├─────────────────────────────────────────────────────────────┤
│  Socket.io Handlers: joinRoom │ message │ disconnect │ etc  │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
    ┌─────▼──────┐                      ┌───────▼────────┐
    │  MongoDB   │                      │  Cloudinary    │
    │ (Mongoose) │                      │  (Avatars CDN) │
    │            │                      │                │
    └────────────┘                      └────────────────┘
```

---

## Authentication Flow

### 1. Registration
```
POST /register
├─ Request: { email, username, password }
├─ Process:
│  ├─ Check email/username uniqueness
│  ├─ Create new User (password hashed by pre-save hook)
│  ├─ Generate JWT (1-hour expiry)
│  └─ Set HTTP-only cookie with token
└─ Response: User data + cookie
```

### 2. Login
```
POST /login
├─ Request: { email/username, password }
├─ Process:
│  ├─ Find user in MongoDB
│  ├─ Compare password (bcrypt)
│  ├─ Generate JWT
│  └─ Set HTTP-only cookie
└─ Response: User data + cookie
```

### 3. WebSocket Authentication
```
Socket Connection
├─ Client connects with stored token from cookie
├─ Server receives request with headers.cookie
├─ Auth Middleware:
│  ├─ Parse JWT from cookie
│  ├─ Verify with JWT_SECRET
│  └─ Attach userId to socket.userId
└─ If auth fails: socket disconnects
```

### 4. Protected Routes
```
Protected Endpoint
├─ Request includes:
│  ├─ Authorization header (Bearer <token>) OR
│  └─ Cookie (token)
├─ Auth Middleware (middleware/auth.js):
│  ├─ Extract token
│  ├─ Verify with JWT_SECRET
│  ├─ Attach decoded user to req.user
│  └─ Call next()
└─ Route Handler has access to req.user
```

---

## Data Models

### User Model
```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed by bcrypt),
  lastLogin: Date,
  avatar: String (Cloudinary URL),
  createdAt: Date,
  updatedAt: Date
}
```

**Key Methods:**
- `comparePassword(candidatePassword)` - Bcrypt comparison

**Indexes:**
- Compound unique index on `{ username, email }`

---

### Room Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  roomOwner: ObjectId (ref: User),
  users: [ObjectId] (ref: User) - active members,
  banned: [ObjectId] (ref: User) - banned members,
  isPrivate: Boolean (required),
  pendingRequests: [ObjectId] (ref: User) - for private rooms,
  createdAt: Date,
  updatedAt: Date
}
```

**Access Control:**
- **Public Rooms:** Anyone can join
- **Private Rooms:** Only members can access; pending requests for non-members
- **Banned Users:** Cannot access even if were members

---

### Message Model
```javascript
{
  _id: ObjectId,
  content: String (required),
  timestamp: Date (default: Date.now),
  user: ObjectId (ref: User),
  room: ObjectId (ref: Room),
}
```

---

### Notification Model
```
(See models/Notification.js for structure)
```

---

## WebSocket Events

### Client → Server Events

#### `joinRoom`
```javascript
socket.emit('joinRoom', { roomId })
// Server-side handler:
// - Validates room exists
// - Checks user is member (or public room)
// - Checks user is not banned
// - Joins socket to room socket.io room
```

#### `message`
```javascript
socket.emit('message', { content, roomId })
// Server-side handler:
// - Validates content and roomId
// - Validates user is room member
// - Saves to MongoDB Messages collection
// - Broadcasts to all users in room
```

#### `disconnect` (automatic)
```
// Server-side handler:
// - Cleans up socket references
// - Updates user status if needed
```

### Server → Client Events

#### `error`
```javascript
socket.emit('error', 'Error message')
```

#### `message` (broadcast)
```javascript
io.to(roomId).emit('message', { content, user, timestamp })
```

---

## Key Files Deep Dive

### `server.js` - Server Entry Point
- Creates Express app and HTTP server
- Configures CORS (GET, POST, PUT, DELETE, PATCH)
- Mounts routes
- Serves static files
- Initializes Socket.io

### `socket.js` - Real-time Events
- JWT validation on WebSocket connection
- `joinRoom` - permission checks (member, banned, private)
- `message` - save to DB, broadcast to room
- Error handling and disconnection

### `middleware/auth.js` - JWT Validation
- Accepts token from Authorization header or cookie
- Verifies with JWT_SECRET
- Attaches `req.user` with decoded data
- Returns 401 if invalid/missing

### `models/Users.js` - User Schema
- Password pre-hashing (bcrypt, cost: 10)
- `comparePassword()` method for login
- Timestamps and compound unique index

### `routes/avatar.js` - Avatar Upload
- Cloudinary integration for image storage
- Memory storage (no disk writes)
- Automatic image optimization and resizing
- 300x300 avatars with smart cropping

### `databases/mongodbConnection.js` - MongoDB Setup
- Mongoose connection with environment variables
- Connection pooling and error handling

---

## Environment Variables Required

```env
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here

# MongoDB
USER=mongodb_username
PASSWORD=mongodb_password
DB=database_name
APP_NAME=app_name
MONGODB_URI=mongodb+srv://USERNAME_PLACEHOLDER:PASSWORD_PLACEHOLDER@cluster.mongodb.net/DATABASE_PLACEHOLDER?appName=APP_NAME_PLACEHOLDER

# Cloudinary (for avatars)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Development Workflow

### Start Development Server
```bash
npm install
npm run dev  # Uses Node watch mode for auto-reload
```

### Start Production Server
```bash
npm start
```

### Test MongoDB Connection
```bash
node testConn.js
```

---

## Common Feature Requests & Implementation Patterns

### Adding a New Route
1. Create handler function in `routes/newFeature.js`
2. Use `auth` middleware for protected endpoints
3. Mount in `server.js`: `app.use('/api/path', newFeature);`
4. Test with POST/GET as needed

### Adding a WebSocket Event
1. Add handler in `socket.js` in the `io.on('connection')` handler
2. Extract userId from `socket.userId`
3. Validate user permissions
4. Broadcast with `io.to(roomId).emit()` if needed

### Creating a New Model
1. Define schema in `models/NewModel.js`
2. Add indexes if needed
3. Add pre-hooks for data transformation (like password hashing)
4. Add methods for validation/comparison

### File Uploads (Avatars)
- Uses Cloudinary for storage
- Multer for handling multipart form data
- Memory storage (no local disk writes)
- Automatic resizing, optimization, and CDN delivery

---

## Security Considerations

✅ **Implemented:**
- JWT tokens in HTTP-only cookies (CSRF-safe)
- Password hashing with bcrypt
- CORS configured with specific methods
- JWT validation on WebSocket connections
- Cloudinary storage (no local filesystem exposure)

⚠️ **To Improve:**
- Add refresh tokens (current tokens expire in 1h)
- Rate limiting on auth endpoints
- Input validation/sanitization
- HTTPS in production (NODE_ENV=production)
- Helmet.js for security headers
- Request body size limits

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check JWT_SECRET matches, token not expired, cookie sent |
| Socket connection fails | Verify JWT in cookie, check Socket.io path `/socket.io` |
| MongoDB connection fails | Check MONGODB_URI, credentials, whitelist IP in MongoDB Atlas |
| Room access denied | Verify user is in room.users, room is not isPrivate, user not in banned |
| Messages not broadcasting | Check roomId is valid, user is room member, Socket.io connected |
| Avatar upload fails | Verify Cloudinary env vars are set, image < 5MB, format is JPEG/PNG/WebP |

---

## Testing Endpoints (with cURL or Postman)

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Protected route (with token from cookie or header)
curl -X GET http://localhost:5000/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Future Enhancement Ideas

- [ ] Refresh tokens for longer sessions
- [ ] Message search and filtering
- [ ] Read receipts and typing indicators
- [ ] User online/offline status
- [ ] Message reactions/emoji
- [ ] File sharing in messages
- [ ] Rate limiting
- [ ] Admin dashboard
- [ ] User roles and permissions
- [ ] Notification preferences
- [ ] Two-factor authentication

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Introduction](https://jwt.io/introduction)
- [OWASP Security Guidelines](https://owasp.org/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

**Last Updated:** 2026-06-06  
**Version:** 1.0  
**Maintained By:** Development Team


