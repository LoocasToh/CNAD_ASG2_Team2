require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => res.send({ ok: true, service: 'auth' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Auth service listening on ${PORT}`));
