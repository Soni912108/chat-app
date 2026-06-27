function createSocketStub() {
    return {
        on() {},
        emit() {},
        connect() {},
        disconnect() {},
        off() {}
    };
}

window.createAppSocket = function createAppSocket() {
    const config = window.__APP_CONFIG__ || {};

    if (!config.enableSockets || typeof io !== "function") {
        return createSocketStub();
    }

    return io({
        path: config.socketPath || "/socket.io",
        transports: ["websocket"]
    });
};
