window.createAppSocket = function createAppSocket() {
    return io({
        path: "/socket.io",
        transports: ["websocket"]
    });
};
