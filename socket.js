// socket.js
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
//adding path to socket.io

const io = socketIo(server, {
  path: '/socket.io'
});

module.exports = { io, server, app };
