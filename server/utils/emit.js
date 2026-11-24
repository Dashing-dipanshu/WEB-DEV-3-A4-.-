// Every connected user joins a personal room "user:<id>" (see socket.js),
// so sending to a user reaches all of their open tabs/devices.
exports.emitToUsers = (io, userIds, event, payload) => {
  userIds.forEach((id) => io.to(`user:${id}`).emit(event, payload));
};
