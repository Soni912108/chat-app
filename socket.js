// socket.js
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  path: '/socket.io'
});

module.exports = { io, server, app };
