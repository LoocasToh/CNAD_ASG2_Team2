require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
  // Your frontend is exposed at http://localhost (port 80) by docker
  origin: ['http://localhost', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Auth routes only
app.use('/auth', authRoutes);

// health endpoints
app.get('/', (req, res) => res.json({ ok: true, service: 'auth' }));
app.get('/status', (req, res) => res.json({ ok: true, service: 'auth' }));
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Auth service listening on ${PORT}`));
