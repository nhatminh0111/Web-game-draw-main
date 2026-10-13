module.exports = function(adminNamespace, gameNamespace) {
  adminNamespace.on('connection', (socket) => {
    console.log(`[Admin] Admin connected: ${socket.id}`);

    const statsInterval = setInterval(() => {
      const roomData = [];
      for (const room of gameNamespace.adapter.rooms.keys()) {
        if (!gameNamespace.sockets.has(room)) {
          roomData.push({
            id: room,
            size: gameNamespace.adapter.rooms.get(room)?.size || 0,
          });
        }
      }

      socket.emit('system-stats', {
        playerCount: gameNamespace.sockets.size,
        roomCount: roomData.length,
        rooms: roomData
      });
    }, 2000);

    socket.on('disconnect', () => {
      clearInterval(statsInterval);
      console.log(`[Admin] Admin disconnected: ${socket.id}`);
    });
  });
};