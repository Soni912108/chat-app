let io;

function setIo(socketServer) {
  io = socketServer;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

module.exports = { setIo, getIo };
