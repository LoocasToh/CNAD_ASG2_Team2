// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  createUser,
  findUserByEmailOrName,
  listUsersByType,
} = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      userName: user.name,
      email: user.email,
      userType: user.userType,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

async function signup(req, res) {
  try {
    const { name, email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    if (!userType) {
      return res.status(400).json({ error: "UserType required" });
    }

    const existing = await findUserByEmailOrName(email);
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await createUser({
      name: name || email.split("@")[0],
      email,
      password: hashed,
      userType,
    });

    const numericId = Number(user?.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return res.status(500).json({
        error: `Signup succeeded but backend did not return numeric user.id. Got: ${user?.id}`,
      });
    }

    const token = signToken({ ...user, id: numericId });

    return res.status(201).json({
      token,
      user: {
        id: numericId,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const identifier = String(email || "").trim().toLowerCase();

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Email/Username and password required" });
    }

    const user = await findUserByEmailOrName(identifier);
    if (!user) return res.status(401).json({ error: "user not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const numericId = Number(user.id);
    const token = signToken({ ...user, id: numericId });

    return res.json({
      token,
      user: {
        id: numericId,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "missing authorization header" });

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "malformed auth header" });
  }

  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    return next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: "invalid token" });
  }
}

function protectedTest(req, res) {
  res.json({ user: req.user });
}

// ✅ NEW: caregiver fetch list of "user" accounts (PWIDs)
async function listPwids(req, res) {
  try {
    // only caregiver can access
    if (req.user?.userType !== "caregiver") {
      return res.status(403).json({ error: "Forbidden (caregiver only)" });
    }

    const userType = req.query.userType || "user"; // default user
    const users = await listUsersByType(userType);

    return res.json(users);
  } catch (err) {
    console.error("listPwids error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

module.exports = {
  signup,
  login,
  authMiddleware,
  protectedTest,
  listPwids, // ✅ export new endpoint
};
