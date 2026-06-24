# Socket Rooms

This app uses two different kinds of "rooms":

1. MongoDB rooms in the `rooms` collection.
2. Socket.io rooms held in memory by the running Node process.

They have different jobs.

## MongoDB Room

A MongoDB room is the durable application record. It is stored by the `Room` model and contains the room name, owner, members, banned users, privacy flag, and pending join requests.

Use MongoDB when the app needs to answer questions like:

- Does this room exist?
- Is this user a member?
- Is this user banned?
- Is this room private?
- Who owns the room?

MongoDB is the source of truth for authorization and history. Public rooms are discoverable from the dashboard, but a user still has to join the room before the server returns its messages or allows the socket to join its broadcast group.

## Socket.io Room

A Socket.io room is a temporary broadcast group. It exists only inside the active Socket.io server process. When a browser opens `/room?roomId=...`, the client emits `joinRoom` with the MongoDB room id. The server verifies the user against MongoDB, then calls:

```js
socket.join(roomId);
```

After that, a message can be sent to every connected browser currently viewing that room:

```js
io.to(roomId).emit('message', payload);
```

The Socket.io room id is intentionally the same string as the MongoDB room `_id`. That makes the broadcast target easy to derive, but it does not replace the MongoDB room record.

## Message Flow

1. Browser connects to Socket.io with the JWT cookie.
2. Socket server verifies the JWT and stores `socket.userId`.
3. Browser emits `joinRoom` with a MongoDB `roomId`.
4. Server loads the room from MongoDB.
5. Server checks banned/member rules. A user must already be in `room.users`.
6. Server joins the socket to the Socket.io room named by `roomId`.
7. Browser emits `message` with `{ content, roomId }`.
8. Server checks the MongoDB room again.
9. Server saves the message to MongoDB.
10. Server broadcasts the message to connected sockets in that room.

## User Notification Rooms

Each authenticated socket also joins a Socket.io room named by its user id:

```js
socket.join(userId.toString());
```

This lets the server notify one user from route handlers or utilities:

```js
io.to(recipientUserId).emit('notification', unreadCount);
```

That is separate from chat-room broadcasting. Room messages target the MongoDB room id. Personal notifications target the user id.

## Production Note

Socket.io rooms are in memory. If the app runs on more than one server instance, different users may be connected to different instances. Multi-instance real-time delivery will need an external pub/sub strategy, but this app does not include one yet.
