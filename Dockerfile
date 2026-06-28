# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Install dependencies once and reuse them across dev/prod stages
FROM base AS deps

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

# Development image
FROM deps AS dev
ENV NODE_ENV="development"
COPY . .
EXPOSE 3001
CMD [ "npm", "run", "dev:docker" ]


# Final stage for app image
FROM deps AS prod
ENV NODE_ENV="production"

# Copy built application
COPY . .

# Start the server by default, this can be overwritten at runtime
EXPOSE 3001
CMD [ "npm", "run", "start" ]
