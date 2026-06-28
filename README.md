# Roomloop

A Node.js and Express chat application with MongoDB, Socket.io, JWT authentication, Cloudinary avatars, and browser-rendered room management.

## Features

- JWT-based login and registration
- Public and private rooms
- Real-time messaging with Socket.io
- Room ownership, join requests, banning, leaving, renaming, and transfer
- Notifications with read and delete flows
- Profile editing, password change, avatar upload, and theme settings
- Search and tabbed room browsing on the dashboard

## Tech Stack

- Node.js
- Express.js
- MongoDB and Mongoose
- Socket.io
- JWT
- Cloudinary
- HTML, CSS, and vanilla JavaScript

## Local Development

Install dependencies:

```bash
npm install
```

Run the app with Node watch mode:

```bash
npm run dev
```

Run the Docker-based development image:

```bash
make docker-dev
```

Run tests:

```bash
npm test
```

## Docker

The repository includes a multi-stage `Dockerfile` that supports both production-style builds and local containerized development.

Useful targets:

```bash
make docker-build
make docker-run
make docker-dev
```

## Deployment

`fly.toml` remains in the repository because Fly.io was used as the cloud provider for deployment during the project.

The repo is still runnable locally without Fly.io. For deployment-related notes, see:

- [docs/DEPLOYMENT_AND_LOCAL_DEV.md](docs/DEPLOYMENT_AND_LOCAL_DEV.md)
- [docs/PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md)
- [docs/SOCKET_ROOMS.md](docs/SOCKET_ROOMS.md)
- [docs/AVATAR_STORAGE.md](docs/AVATAR_STORAGE.md)

## Project Structure

- `server.js` - Express app and page routes
- `routes/` - API routes
- `models/` - MongoDB models
- `public/` - frontend templates, styles, and scripts
- `docs/` - project notes and architecture docs
- `utils/` - shared helpers

## License

MIT
