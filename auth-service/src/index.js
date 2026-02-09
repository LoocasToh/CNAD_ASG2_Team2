require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(cors({
  // Your frontend is exposed at http://localhost (port 80) by docker
  origin: ['http://localhost', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Auth routes only
app.use('/auth', authRoutes);
app.use("/auth", profileRoutes);

// health endpoints
app.get('/', (req, res) => res.json({ ok: true, service: 'auth' }));
app.get('/status', (req, res) => res.json({ ok: true, service: 'auth' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Auth service listening on ${PORT}`));
