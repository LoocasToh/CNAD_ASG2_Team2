const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail } = require('../models/userModel');

// IMPORTANT: authorization.js uses JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

async function signup(req, res) {
  try {
    const { name, email, password, userType } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    if (!userType)
      return res.status(400).json({ error: 'UserType required' });

    const existing = await findUserByEmail(email);
    if (existing)
      return res.status(409).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      password: hashed,
      userType
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      userType: user.userType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user)
      return res.status(401).json({ error: 'user not found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ error: 'invalid credentials' });

    // IMPORTANT: include userType so authorization.js can check roles
    const token = jwt.sign(
      {
        userId: user.id,
        userName: user.name,
        email: user.email,
        userType: user.userType
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, userId: user.id, userType: user.userType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization header' });

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ error: 'malformed auth header' });

  const token = parts[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // includes userType
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: 'invalid token' });
  }
}

function protectedTest(req, res) {
  res.json({ user: req.user });
}

module.exports = { signup, login, authMiddleware, protectedTest };