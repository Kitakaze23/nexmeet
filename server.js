const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

app.use(express.static(path.join(__dirname, 'public')));

// ── ICE конфиг отдаётся клиенту с сервера (credentials не светятся в HTML)
app.get('/ice-config', (req, res) => {
  const TURN_USER = '7bdb1099410fd2b4ec361942';
  const TURN_PASS = 'MpIqK9pzidKpkmyg';
  const TURN_HOST = 'global.relay.metered.ca';

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: `turn:${TURN_HOST}:80`,                    username: TURN_USER, credential: TURN_PASS },
    { urls: `turn:${TURN_HOST}:80?transport=tcp`,      username: TURN_USER, credential: TURN_PASS },
    { urls: `turn:${TURN_HOST}:443`,                   username: TURN_USER, credential: TURN_PASS },
    { urls: `turns:${TURN_HOST}:443?transport=tcp`,    username: TURN_USER, credential: TURN_PASS },
  ];

  console.log('ICE config: STUN + TURN via', TURN_HOST);
  res.json({ iceServers });
});

// ── Health check
app.get('/health', (req, res) => {
  const roomInfo = {};
  rooms.forEach((members, roomId) => {
    roomInfo[roomId] = [...members.values()].map(u => u.name);
  });
  res.json({ ok: true, rooms: roomInfo, connections: io.engine.clientsCount });
});

// roomId -> Map<socketId, { name, socketId }>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('connect:', socket.id, '| transport:', socket.conn.transport.name);

  socket.on('join-room', ({ roomId, name }) => {
    roomId = String(roomId).toUpperCase().trim();
    name = String(name).trim().slice(0, 64) || 'Аноним';

    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    const room = rooms.get(roomId);

    room.set(socket.id, { socketId: socket.id, name });
    socket.data.roomId = roomId;
    socket.data.name = name;

    const existing = [...room.values()].filter(u => u.socketId !== socket.id);
    socket.emit('room-users', existing);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, name });

    console.log(`[${roomId}] "${name}" joined. Total: ${room.size}:`, [...room.values()].map(u=>u.name));
  });

  socket.on('signal', ({ to, data }) => {
    console.log(`signal ${socket.id.slice(0,6)} → ${to.slice(0,6)}: ${data.type || 'candidate'}`);
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('media-state', (state) => {
    const roomId = socket.data.roomId;
    if (roomId) socket.to(roomId).emit('media-state', { socketId: socket.id, ...state });
  });

  socket.on('chat-msg', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const name = socket.data.name || 'Аноним';
    io.to(roomId).emit('chat-msg', { from: socket.id, name, text, ts: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    const { roomId, name } = socket.data;
    console.log(`disconnect: "${name}" reason: ${reason}`);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
      else socket.to(roomId).emit('user-left', { socketId: socket.id, name });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NexMeet → http://localhost:${PORT}`));
