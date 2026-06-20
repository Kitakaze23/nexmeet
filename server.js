const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// roomId -> Map<socketId, { name, socketId }>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('connect:', socket.id);

  // Пользователь входит в комнату
  socket.on('join-room', ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    const room = rooms.get(roomId);

    // Сначала добавляем нового участника
    room.set(socket.id, { socketId: socket.id, name });
    socket.data.roomId = roomId;
    socket.data.name = name;

    // Отправляем новому участнику список уже присутствующих (без себя)
    const existing = [...room.values()].filter(u => u.socketId !== socket.id);
    socket.emit('room-users', existing);

    // Оповещаем остальных о новом участнике
    socket.to(roomId).emit('user-joined', { socketId: socket.id, name });

    console.log(`[${roomId}] ${name} joined (${room.size} total)`);
  });

  // WebRTC сигнализация: offer / answer / candidate
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Смена состояния медиа (mute / cam off)
  socket.on('media-state', (state) => {
    const roomId = socket.data.roomId;
    if (roomId) socket.to(roomId).emit('media-state', { socketId: socket.id, ...state });
  });

  // Чат
  socket.on('chat-msg', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const name = socket.data.name || 'Аноним';
    io.to(roomId).emit('chat-msg', { from: socket.id, name, text, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    const { roomId, name } = socket.data;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
      socket.to(roomId).emit('user-left', { socketId: socket.id, name });
      console.log(`[${roomId}] ${name} left`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NexMeet server → http://localhost:${PORT}`));
