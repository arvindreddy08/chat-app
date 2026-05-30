const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = 'chat_secret_key_123';

mongoose.connect(process.env.MONGO_URL || 'mongodb+srv://chatuser:Chat1234!@cluster0.oxx18we.mongodb.net/chatapp?appName=Cluster0')
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log('MongoDB error:', err));

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  room: String,
  reactions: { type: Map, of: [String], default: {} },
  fileUrl: String,
  fileType: String,
  fileName: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ success: true, message: 'Registered successfully!' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Username already exists!' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: 'User not found!' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Wrong password!' });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/messages/:room', async (req, res) => {
  const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 }).limit(50);
  res.json(messages);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e7
});

const users = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', async ({ username, room }) => {
    socket.join(room);
    users[socket.id] = { username, room };
    const history = await Message.find({ room }).sort({ createdAt: 1 }).limit(50);
    socket.emit('message_history', history);
    io.to(room).emit('receive_message', {
      username: 'System',
      message: `${username} joined the room!`,
      time: new Date().toLocaleTimeString()
    });
    const roomUsers = Object.values(users).filter(u => u.room === room);
    io.to(room).emit('room_users', roomUsers);
  });

  socket.on('send_message', async ({ message, room }) => {
    const user = users[socket.id];
    if (user) {
      const time = new Date().toLocaleTimeString();
      const newMsg = new Message({ username: user.username, message, room });
      const saved = await newMsg.save();
      io.to(room).emit('receive_message', {
        _id: saved._id,
        username: user.username,
        message,
        time,
        reactions: {}
      });
    }
  });

  socket.on('send_file', async ({ room, fileName, fileType, fileData }) => {
    const user = users[socket.id];
    if (user) {
      const time = new Date().toLocaleTimeString();
      const newMsg = new Message({
        username: user.username,
        room,
        fileUrl: fileData,
        fileType,
        fileName,
      });
      const saved = await newMsg.save();
      io.to(room).emit('receive_message', {
        _id: saved._id,
        username: user.username,
        fileUrl: fileData,
        fileType,
        fileName,
        time,
        reactions: {}
      });
    }
  });

  socket.on('add_reaction', async ({ messageId, emoji, room }) => {
    const user = users[socket.id];
    if (user) {
      const msg = await Message.findById(messageId);
      if (msg) {
        const reactions = msg.reactions || new Map();
        const usersReacted = reactions.get(emoji) || [];
        if (!usersReacted.includes(user.username)) {
          usersReacted.push(user.username);
          reactions.set(emoji, usersReacted);
          msg.reactions = reactions;
          await msg.save();
        }
        io.to(room).emit('update_reactions', { messageId, reactions: Object.fromEntries(reactions) });
      }
    }
  });

  socket.on('private_message', ({ toUsername, message }) => {
    const sender = users[socket.id];
    const receiver = Object.entries(users).find(([, u]) => u.username === toUsername);
    if (receiver && sender) {
      const time = new Date().toLocaleTimeString();
      socket.emit('private_msg', { from: sender.username, message, time, self: true });
      io.to(receiver[0]).emit('private_msg', { from: sender.username, message, time, self: false });
    }
  });

  socket.on('typing', ({ room }) => {
    const user = users[socket.id];
    if (user) socket.to(room).emit('user_typing', { username: user.username });
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit('receive_message', {
        username: 'System',
        message: `${user.username} left the room.`,
        time: new Date().toLocaleTimeString()
      });
      delete users[socket.id];
      const roomUsers = Object.values(users).filter(u => u.room === user.room);
      io.to(user.room).emit('room_users', roomUsers);
    }
  });
});

server.listen(process.env.PORT || 5000, () => console.log('Server running!'));