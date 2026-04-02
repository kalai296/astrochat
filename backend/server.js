// ─── AstroChat Backend ───────────────────────────────────────────────────────
// Stack : Node.js 18 · Express · Socket.IO · MongoDB (Mongoose) · Cloudinary
// Deploy: Render.com (free tier)  →  set env vars in Render dashboard
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'astrochat_secret_change_me';
const MONGO_URI  = process.env.MONGO_URI;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Mongoose Models ───────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected'));

const UserSchema = new mongoose.Schema({
  fullName:    { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String },
  password:    { type: String, required: true },
  gender:      { type: String, enum: ['Male','Female','Other'] },
  dateOfBirth: { type: String },
  timeOfBirth: { type: String },
  placeOfBirth:{ type: String },
  role:        { type: String, enum: ['user','astrologer'], default: 'user' },
  isOnline:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  sessionId:  { type: String, required: true, index: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  type:       { type: String, enum: ['text','image','file','voice'], default: 'text' },
  content:    { type: String },       // text content or cloudinary URL
  fileUrl:    { type: String },
  fileName:   { type: String },
  createdAt:  { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', MessageSchema);

const SessionSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  astrologerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:         { type: String, enum: ['chat','voice','video'], default: 'chat' },
  status:       { type: String, enum: ['pending','active','ended'], default: 'pending' },
  startedAt:    { type: Date },
  endedAt:      { type: Date },
  durationSecs: { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
});
const Session = mongoose.model('Session', SessionSchema);

// ── Express App ───────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
});

app.use(cors());
app.use(express.json());

// ── Auth Middleware ───────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── File Upload (Cloudinary) ──────────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'astrochat', resource_type: 'auto' },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─────────────────────────────────────────────────────────────────────────────
//  REST Routes
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/', (_, res) => res.json({ status: 'AstroChat API running' }));

// ── Register ──────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, gender,
            dateOfBirth, timeOfBirth, placeOfBirth, role } = req.body;

    if (!fullName || !email || !password)
      return res.status(400).json({ error: 'fullName, email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName, email, phone, password: hash,
      gender, dateOfBirth, timeOfBirth, placeOfBirth,
      role: role || 'user',
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: sanitize(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: sanitize(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Get current user profile ──────────────────────────────────────────────────
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(sanitize(user));
});

// ── Get astrologer profile ────────────────────────────────────────────────────
app.get('/api/astrologer', async (_, res) => {
  const a = await User.findOne({ role: 'astrologer' });
  if (!a) return res.status(404).json({ error: 'No astrologer registered yet' });
  res.json(sanitize(a));
});

// ── Create session request ────────────────────────────────────────────────────
app.post('/api/sessions', authMiddleware, async (req, res) => {
  try {
    const { astrologerId, type } = req.body;
    const session = await Session.create({
      userId: req.user.id, astrologerId, type: type || 'chat',
    });
    io.to('astrologer_room').emit('new_session_request', {
      sessionId: session._id,
      type:      session.type,
      userId:    req.user.id,
    });
    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Get session history ───────────────────────────────────────────────────────
app.get('/api/sessions', authMiddleware, async (req, res) => {
  const q = req.user.role === 'astrologer'
    ? { astrologerId: req.user.id }
    : { userId:       req.user.id };
  const sessions = await Session.find(q)
    .sort({ createdAt: -1 }).limit(50)
    .populate('userId', 'fullName email')
    .populate('astrologerId', 'fullName');
  res.json(sessions);
});

// ── Accept / end session (astrologer) ────────────────────────────────────────
app.patch('/api/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (status === 'active')  session.startedAt = new Date();
    if (status === 'ended') {
      session.endedAt      = new Date();
      session.durationSecs = session.startedAt
        ? Math.round((session.endedAt - session.startedAt) / 1000) : 0;
    }
    session.status = status;
    await session.save();

    io.to(session._id.toString()).emit('session_status', { status });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Get messages for a session ────────────────────────────────────────────────
app.get('/api/sessions/:id/messages', authMiddleware, async (req, res) => {
  const msgs = await Message.find({ sessionId: req.params.id })
    .sort({ createdAt: 1 }).limit(200);
  res.json(msgs);
});

// ── Upload file / image ───────────────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    url:          req.file.path,
    originalName: req.file.originalname,
    resourceType: req.file.resource_type,
  });
});

// ── Agora token endpoint (RTC token for video/voice) ──────────────────────────
// NOTE: install  agora-token  npm package and uncomment when you have App ID + Certificate
// const { RtcTokenBuilder, RtcRole } = require('agora-token');
// app.post('/api/agora-token', authMiddleware, (req, res) => {
//   const { channelName, uid } = req.body;
//   const expiry = Math.floor(Date.now() / 1000) + 3600;
//   const token  = RtcTokenBuilder.buildTokenWithUid(
//     process.env.AGORA_APP_ID, process.env.AGORA_APP_CERTIFICATE,
//     channelName, uid, RtcRole.PUBLISHER, expiry
//   );
//   res.json({ token });
// });

// ─────────────────────────────────────────────────────────────────────────────
//  Socket.IO — Real-time chat
// ─────────────────────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // socketId → userId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, role } = socket.user;
  onlineUsers.set(socket.id, userId);
  console.log(`Connected: ${userId} (${role})`);

  if (role === 'astrologer') socket.join('astrologer_room');

  // Join a session room
  socket.on('join_session', ({ sessionId }) => {
    socket.join(sessionId);
    socket.emit('joined', { sessionId });
  });

  // Send a text message
  socket.on('send_message', async (data) => {
    const { sessionId, content, type = 'text', fileUrl, fileName } = data;
    try {
      const user = await User.findById(userId);
      const msg  = await Message.create({
        sessionId, senderId: userId,
        senderName: user?.fullName || 'Unknown',
        type, content, fileUrl, fileName,
      });
      io.to(sessionId).emit('new_message', msg);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // Typing indicator
  socket.on('typing', ({ sessionId, isTyping }) => {
    socket.to(sessionId).emit('typing', { userId, isTyping });
  });

  // Video/voice call signalling (WebRTC via Agora channel name)
  socket.on('call_request', ({ sessionId, type }) => {
    socket.to(sessionId).emit('incoming_call', { from: userId, type, sessionId });
  });
  socket.on('call_accepted', ({ sessionId }) => {
    socket.to(sessionId).emit('call_accepted', { sessionId });
  });
  socket.on('call_rejected', ({ sessionId }) => {
    socket.to(sessionId).emit('call_rejected', { sessionId });
  });
  socket.on('call_ended', ({ sessionId }) => {
    socket.to(sessionId).emit('call_ended', { sessionId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    console.log(`Disconnected: ${userId}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const sanitize = (u) => ({
  _id: u._id, fullName: u.fullName, email: u.email,
  phone: u.phone, gender: u.gender, role: u.role,
  dateOfBirth: u.dateOfBirth, timeOfBirth: u.timeOfBirth,
  placeOfBirth: u.placeOfBirth, isOnline: u.isOnline,
  createdAt: u.createdAt,
});

server.listen(PORT, () => console.log(`AstroChat API on port ${PORT}`));