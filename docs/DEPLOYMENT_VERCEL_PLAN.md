# Vercel Deployment Plan

## Goal
Move the current Azure-based deployment flow to Vercel and keep the repo ready for production deployments from GitHub.

## Important Constraint
The current app uses Socket.io for realtime chat, typing indicators, and live notifications.

That matters because Vercel is a serverless deployment platform for HTTP functions and static assets. The existing long-lived Socket.io server in `socket.js` is not a clean fit for that model.

This means there are two deployment tracks:

1. HTTP app deployment to Vercel
2. Realtime layer decision

The HTTP deployment can be prepared now. The realtime layer needs a separate decision before the app is fully production-complete on Vercel.

The current templates also load `/socket.io/socket.io.js` directly, so the frontend assumes a live Socket.io server is available. That means a plain Vercel deployment will need either:

- a separate Socket.io host
- conditional loading of the realtime client code
- or a replacement for realtime messaging and notifications

## Files In Place
- `vercel.json`
- `.github/workflows/deploy-vercel.yml`
- `.vercelignore`

## Required Secrets
Set these in GitHub and in the Vercel project:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Deployment Steps
1. Create a Vercel project from the GitHub repository.
2. Link the repository to the Vercel project.
3. Add all runtime environment variables in Vercel.
4. Add the same Vercel project IDs and token as GitHub secrets.
5. Push the repository to `main` and let the GitHub Action deploy.
6. Verify the deployed site opens, serves static assets, and reaches MongoDB and Cloudinary.
7. Decide how realtime should work in production:
   - move Socket.io to a separate host
   - or replace realtime with polling/SSE
   - or keep realtime only for local development
8. If the app is going to run on Vercel immediately, split the HTTP app from the socket server so the HTTP side can deploy independently.

## Current Repo Configuration
- `server.js` is the current entry point.
- `vercel.json` routes all requests to `server.js`.
- static files are under `public/`.
- upload storage is Cloudinary, so no local filesystem dependency should remain for avatars.
- the dashboard, room, and notification pages currently expect Socket.io to exist at `/socket.io/socket.io.js`

## What to Verify After First Deploy
- login and register
- dashboard load
- room listing and pagination
- room access control
- notifications
- profile page
- avatar upload
- theme persistence
- logout/login redirect behavior

## Open Risk
If the app is deployed to Vercel without changing the Socket.io architecture, realtime room updates and notification push behavior may fail or be incomplete.

That is the main production risk to resolve after the first HTTP deployment is green.

There is also a server-entrypoint risk: `server.js` currently calls `server.listen(...)`, which is correct for local development but not the clean shape for a serverless deployment. The app will likely need an exported HTTP handler or a split `app.js`/`server.js` structure before a full Vercel cutover.
