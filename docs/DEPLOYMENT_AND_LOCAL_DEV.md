# Deployment And Local Development

This project uses Docker for local containerized development and Fly.io as the cloud provider that hosted the deployed app during the latest iteration.

## Local Development

### Node.js

```bash
npm install
npm run dev
```

### Docker

The repository includes a multi-stage `Dockerfile` and a `Makefile`.

Build and run the production image:

```bash
make docker-build
make docker-run
```

Run the containerized development image with watch mode:

```bash
make docker-dev
```

The dev image uses `npm run dev:docker`, which relies on Node's built-in watch mode.

## Fly.io

Fly.io is kept in the repository through `fly.toml` and related deployment files. It was used as the cloud provider for deployment, but the repo remains runnable locally with either Node or Docker.

## Notes

- The app listens on port `3001` by default.
- Set environment variables through your local `.env` file for Node runs.
- For Docker runs, pass the same `.env` file through `--env-file` as shown in the Makefile targets.
