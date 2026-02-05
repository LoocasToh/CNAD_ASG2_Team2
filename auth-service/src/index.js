require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors({
  origin: 'http://localhost', // Your frontend's address
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => res.send({ ok: true, service: 'auth' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Auth service listening on ${PORT}`));
